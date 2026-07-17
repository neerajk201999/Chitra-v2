/**
 * Deterministic renderer (ADR-0002, stack-validation §1–§4).
 *
 * Mechanism: compiled page exposes window.__chitra.seek(ms); we drive the
 * paused GSAP master timeline frame by frame and capture PNG screenshots
 * ("screenshot mode" — portable everywhere; BeginFrame mode is a later,
 * Linux-only optimization behind this same interface).
 *
 * Caching: frames land in <cache>/<sceneHash>/ per scene; unchanged scenes
 * are never re-rendered. Encoding pipes cached PNGs to ffmpeg in order.
 */
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync, statfsSync, statSync } from "node:fs";
import path from "node:path";
import type { Browser, Page } from "puppeteer-core";
import type { ScoreT } from "../ir/schema.js";
import { compile, resolveSceneTimeline, type CompileResult } from "../compile/index.js";
import { resolveProjectAsset } from "../assets/local.js";
import { audioInvariantIssues, measureAudio, type AudioMeasurement } from "../audio/measure.js";
import { launchBrowser } from "../browser/index.js";

/**
 * Chrome flags mined from HyperFrames' engine (docs/research/stack-validation.md §2).
 * NOTE: --deterministic-mode / --run-all-compositor-stages-before-draw are
 * BeginFrame-mode flags — in screenshot mode they stall the compositor waiting
 * for BeginFrame signals that never come, yielding blank captures (verified
 * empirically; HyperFrames documents the same trap in browserManager.ts).
 */
const DETERMINISTIC_FLAGS = [
  "--disable-threaded-animation",
  "--disable-threaded-scrolling",
  "--disable-checker-imaging",
  "--disable-image-animation-resync",
  "--font-render-hinting=none",
  "--force-color-profile=srgb",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--hide-scrollbars",
  "--disable-dev-shm-usage",
  "--no-sandbox",
];

export type Quality = "draft" | "standard" | "high";
const ENCODE = {
  draft: { preset: "ultrafast", crf: 28, maxFps: 12, extension: "jpg", capture: { type: "jpeg" as const, quality: 82 }, bytesPerPixel: 0.18 },
  standard: { preset: "medium", crf: 18, maxFps: null, extension: "png", capture: { type: "png" as const }, bytesPerPixel: 1.5 },
  high: { preset: "slow", crf: 15, maxFps: null, extension: "png", capture: { type: "png" as const }, bytesPerPixel: 1.5 },
} as const;

/**
 * Bumped whenever compiler output changes for identical IR (new presets,
 * markup changes, GSAP upgrades). Part of every scene hash — without it the
 * cache serves frames compiled by an older compiler.
 */
export const COMPILER_CACHE_VERSION = "15";

/** Content digest of a file, memoized on (path, mtime, size) — video files are
 *  tens of MB and sceneHash runs per scene per render. */
const digestMemo = new Map<string, string>();
function fileDigest(file: string): string {
  const st = statSync(file);
  const key = `${file}:${st.mtimeMs}:${st.size}`;
  const hit = digestMemo.get(key);
  if (hit) return hit;
  const d = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  digestMemo.set(key, d);
  return d;
}

function sceneAssetSources(scene: ScoreT["scenes"][number]): string[] {
  const srcs: string[] = [];
  for (const element of scene.elements) {
    if (element.type === "image" || element.type === "video") srcs.push(element.src);
    if (element.type === "figure") srcs.push(element.src, ...element.assets.map((asset) => asset.src));
    if (element.type === "scene3d" && element.frontTexture) srcs.push(element.frontTexture);
  }
  if (scene.background === "image" && scene.backgroundImage) srcs.push(scene.backgroundImage);
  for (const animation of scene.choreography) if (animation.sfx) srcs.push(animation.sfx.src);
  return srcs;
}

/** Every local byte source that can affect rendered pixels, timing, or audio. */
export function renderInputFiles(score: ScoreT, projectDir = "."): string[] {
  const sources = new Set(score.scenes.flatMap(sceneAssetSources));
  if (score.audio?.music) sources.add(score.audio.music.src);
  return [...sources].map((source) => resolveProjectAsset(projectDir, source)).sort();
}

/** Digest of every asset file a scene (or its transition-visible neighbors) references.
 *  Asset BYTES must be in the hash: editing an image in place must invalidate
 *  exactly the scenes that show it (ADR-0006). Missing files throw — a broken
 *  reference must fail loudly at hash time, not render as a broken-image frame. */
function assetDigests(score: ScoreT, sceneIndex: number, projectDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const idx of [sceneIndex - 1, sceneIndex, sceneIndex + 1]) {
    const scene = score.scenes[idx];
    if (!scene) continue;
    for (const src of sceneAssetSources(scene)) {
      if (out[src]) continue;
      const file = resolveProjectAsset(projectDir, src);
      out[src] = fileDigest(file);
    }
  }
  return out;
}

export function sceneHash(score: ScoreT, sceneIndex: number, projectDir = "."): string {
  const scene = score.scenes[sceneIndex];
  const basis = JSON.stringify({
    compilerV: COMPILER_CACHE_VERSION,
    assets: assetDigests(score, sceneIndex, projectDir),
    scene,
    style: score.style,
    meta: score.meta,
    irV: score.irVersion,
    // A scene's frames depend on its neighbors: the NEXT scene is visible under
    // this scene's transition tail (crossfade/wipe/push), and the PREVIOUS
    // scene's fade-through-black tail paints into this scene's first frames.
    nextScene: score.scenes[sceneIndex + 1] ?? null,
    prevScene: score.scenes[sceneIndex - 1] ?? null,
    // `at.onBeat` changes pixels even when scenes are byte-identical.
    audioTiming: score.audio?.music ? {
      bpm: score.audio.music.bpm,
      firstBeatMs: score.audio.music.firstBeatMs,
      beats: score.audio.music.beats,
    } : null,
  });
  return createHash("sha256").update(basis).digest("hex").slice(0, 16);
}

/** Full render-input identity for release receipts (including music bytes). */
export function scoreHash(score: ScoreT, projectDir = "."): string {
  // Release fingerprints must read current bytes, not trust a prior render's
  // mtime/size memoization.
  digestMemo.clear();
  const music = score.audio?.music;
  return createHash("sha256").update(JSON.stringify({
    compilerV: COMPILER_CACHE_VERSION,
    score,
    scenes: score.scenes.map((_, index) => sceneHash(score, index, projectDir)),
    music: music ? fileDigest(resolveProjectAsset(projectDir, music.src)) : null,
  })).digest("hex");
}

export interface RenderSession {
  browser: Browser;
  page: Page;
  compiled: CompileResult;
  pageFile: string;
  close(): Promise<void>;
  seekAndCapture(ms: number, capture?: { type: "png" } | { type: "jpeg"; quality: number }): Promise<Buffer>;
  contrastCapture(ms: number): Promise<Buffer>;
  textRegions(ms: number): Promise<TextRegion[]>;
}

export interface TextRegion {
  sel: string;
  scene: string;
  visible: boolean;
  overMedia: boolean;
  color: string;
  fontSizePx: number;
  x: number;
  y: number;
  w: number;
  h: number;
  origin?: "score" | "figure";
  figureId?: string;
  target?: string;
  text?: string;
}

/** ADR-0007: pre-extract every video element to per-frame JPEGs (content-hashed,
 *  cached). Returns the media map for the page runtime plus the keep-set for
 *  the pruner. Extraction is the only place moving media meets the renderer —
 *  the browser never decodes video, which is what keeps frames deterministic. */
export function prepareMedia(
  score: ScoreT,
  projectDir: string,
  workDir: string
): { map: Record<string, { base: string; fps: number; count: number }>; keep: Set<string> } {
  const map: Record<string, { base: string; fps: number; count: number }> = {};
  const keep = new Set<string>();
  const fps = score.meta.fps;
  for (const scene of score.scenes) {
    for (const el of scene.elements) {
      if (el.type !== "video") continue;
      const file = resolveProjectAsset(projectDir, el.src);
      const boxW = Math.round((el.width * score.meta.width) / 100);
      const maxCount = Math.ceil((scene.durationMs / 1000) * fps) + 1;
      const mediaHash = createHash("sha256")
        .update(JSON.stringify({ v: 1, digest: fileDigest(file), fps, boxW, maxCount, startMs: el.startMs }))
        .digest("hex")
        .slice(0, 16);
      keep.add(mediaHash);
      const dir = path.join(workDir, "media", mediaHash);
      const marker = path.join(dir, "done");
      if (!existsSync(marker)) {
        mkdirSync(dir, { recursive: true });
        const r = spawnSync(
          "ffmpeg",
          ["-y", "-v", "error", "-ss", (el.startMs / 1000).toFixed(3), "-i", file,
           "-vf", `fps=${fps},scale=${Math.min(boxW * 2, 3840)}:-2`, "-frames:v", String(maxCount),
           "-q:v", "3", path.join(dir, "f%05d.jpg")],
          { encoding: "utf8" }
        );
        if (r.status !== 0) throw new Error(`video frame extraction failed for ${el.src}: ${(r.stderr ?? "").slice(-500)}`);
        writeFileSync(marker, mediaHash);
      }
      const count = readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
      if (count === 0) throw new Error(`video ${el.src}: no frames extracted (startMs beyond clip end?)`);
      map[`${scene.id}--${el.id}`] = { base: `file://${dir}`, fps, count };
    }
  }
  return { map, keep };
}

/** Compile the score, write the page next to the project assets, open a driven browser. */
export async function openSession(score: ScoreT, projectDir: string, workDir: string): Promise<RenderSession> {
  for (let index = 0; index < score.scenes.length; index++) assetDigests(score, index, projectDir);
  if (score.audio?.music) resolveProjectAsset(projectDir, score.audio.music.src);
  const compiled = compile(score, projectDir);
  mkdirSync(workDir, { recursive: true });
  // Page lives in the project dir so relative asset paths (images) resolve.
  // Absolute path required: file:// URLs cannot be relative.
  const pageFile = path.resolve(projectDir, ".chitra-page.html");
  writeFileSync(pageFile, compiled.html);

  // ADR-0010: SwiftShader WebGL flags ONLY when a 3D scene is present, so 2D
  // renders stay byte-identical to pre-3D output. SwiftShader = software GL =
  // deterministic (GPU output varies by hardware).
  const has3d = score.scenes.some((s) => s.elements.some((e) => e.type === "scene3d"));
  const flags = has3d
    ? [...DETERMINISTIC_FLAGS, "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
    : DETERMINISTIC_FLAGS;
  const browser = await launchBrowser({ headless: true, args: flags });
  const page = await browser.newPage();
  await page.setViewport({ width: compiled.width, height: compiled.height, deviceScaleFactor: 1 });
  await page.goto(`file://${pageFile}`, { waitUntil: "load" });
  const media = prepareMedia(score, projectDir, workDir);
  await page.evaluate((m) => (window as unknown as { __chitra: { setMedia(x: unknown): void } }).__chitra.setMedia(m), media.map);
  const readiness = (await page.evaluate("window.__chitra.ready()")) as {
    fontsOk: boolean;
    missingTargets: string[];
    badImages?: string[];
    glError?: string | null;
  };
  if (readiness.glError) throw new Error(`3D scene failed to initialize (ADR-0010): ${readiness.glError}`);
  if (!readiness.fontsOk) throw new Error("Fonts failed to load — compiled page is not deterministic");
  if (readiness.missingTargets.length)
    throw new Error(`Choreography targets missing in DOM: ${readiness.missingTargets.join(", ")} (compiler bug or bad IR target)`);
  if (readiness.badImages?.length)
    throw new Error(`Images failed to load: ${readiness.badImages.join(", ")} — check paths are relative to the score's directory`);

  const stage = await page.$("#stage");
  if (!stage) throw new Error("No #stage in compiled page");

  return {
    browser,
    page,
    compiled,
    pageFile,
    async close() {
      await browser.close();
    },
    async seekAndCapture(ms: number, capture = { type: "png" }) {
      await page.evaluate(`window.__chitra.seek(${ms})`);
      return Buffer.from(await stage.screenshot(capture));
    },
    async contrastCapture(ms: number) {
      await page.evaluate(`window.__chitra.seek(${ms})`);
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "__chitra-contrast-mask";
        style.textContent = ".text .txt,.figure *,.figure *::before,.figure *::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}";
        document.head.appendChild(style);
      });
      try { return Buffer.from(await stage.screenshot({ type: "png" })); }
      finally { await page.evaluate(() => document.getElementById("__chitra-contrast-mask")?.remove()); }
    },
    async textRegions(ms: number) {
      await page.evaluate(`window.__chitra.seek(${ms})`);
      return (await page.evaluate("window.__chitra.textRegions()")) as TextRegion[];
    },
  };
}

export interface RenderResult {
  outFile: string;
  totalFrames: number;
  renderedFrames: number;
  cachedFrames: number;
  durationMs: number;
  wallMs: number;
  captureFps: number;
  cacheBytes: number;
  audio: AudioMeasurement;
}

export interface RenderOptions {
  quality?: Quality;
  cacheDir?: string;
  onProgress?: (done: number, total: number) => void;
}

const MIB = 1024 * 1024;
const DISK_RESERVE_BYTES = 256 * MIB;

export function renderStorageEstimate(score: ScoreT, quality: Quality): number {
  const profile = ENCODE[quality];
  const fps = Math.min(score.meta.fps, profile.maxFps ?? score.meta.fps);
  const durationMs = score.scenes.reduce((sum, scene) => sum + scene.durationMs, 0);
  const frames = Math.ceil((durationMs / 1000) * fps);
  return Math.ceil(frames * score.meta.width * score.meta.height * profile.bytesPerPixel);
}

function assertRenderStorage(score: ScoreT, projectDir: string, quality: Quality): void {
  const stat = statfsSync(projectDir);
  const available = Number(stat.bavail) * Number(stat.bsize);
  const estimate = renderStorageEstimate(score, quality);
  if (available < estimate + DISK_RESERVE_BYTES) {
    throw new Error(
      `insufficient disk for ${quality} render: about ${(estimate / MIB).toFixed(0)} MiB cache + ` +
      `256 MiB safety reserve required, ${(available / MIB).toFixed(0)} MiB available. ` +
      `Run chitra clean <project>, free disk, or use -q draft.`
    );
  }
}

/** Remove frame caches written before ADR-0031 introduced profile directories. */
export function pruneLegacyFrameCaches(cacheDir: string): number {
  if (!existsSync(cacheDir)) return 0;
  let removed = 0;
  for (const entry of readdirSync(cacheDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[0-9a-f]{16}$/.test(entry.name)) continue;
    const dir = path.join(cacheDir, entry.name);
    const files = readdirSync(dir, { withFileTypes: true });
    if (!files.length || files.some((file) => !file.isFile() || (file.name !== "done" && !/^f\d{6}\.png$/.test(file.name)))) continue;
    rmSync(dir, { recursive: true, force: true });
    removed++;
  }
  return removed;
}

export async function renderScore(
  score: ScoreT,
  projectDir: string,
  outFile: string,
  opts: RenderOptions = {}
): Promise<RenderResult> {
  const t0 = Date.now();
  const quality = opts.quality ?? "standard";
  const cacheDir = opts.cacheDir ?? path.join(projectDir, ".chitra-cache");
  mkdirSync(cacheDir, { recursive: true });
  pruneLegacyFrameCaches(cacheDir);
  assertRenderStorage(score, cacheDir, quality);
  const session = await openSession(score, projectDir, cacheDir);
  const { compiled } = session;
  const profile = ENCODE[quality];
  const fps = Math.min(compiled.fps, profile.maxFps ?? compiled.fps);
  const frameMs = 1000 / fps;
  const frameCacheDir = path.join(cacheDir, quality === "draft" ? "draft-jpeg-12fps" : "full-png");

  try {
    // Per-scene frame plan
    let rendered = 0;
    let cached = 0;
    let done = 0;
    const framePaths: string[] = [];
    const totalFrames = Math.round((compiled.durationMs / 1000) * fps);

    for (let s = 0; s < score.scenes.length; s++) {
      const bounds = compiled.sceneBoundsMs[s];
      const hash = sceneHash(score, s, projectDir);
      const dir = path.join(frameCacheDir, hash);
      const firstFrame = Math.ceil(bounds.startMs / frameMs - 1e-6);
      const endFrame = Math.min(totalFrames, Math.ceil(bounds.endMs / frameMs - 1e-6));
      const count = endFrame - firstFrame;
      const complete = existsSync(path.join(dir, "done")) && readdirSync(dir).length >= count + 1;
      mkdirSync(dir, { recursive: true });
      for (let f = 0; f < count; f++) {
        const file = path.join(dir, `f${String(f).padStart(6, "0")}.${profile.extension}`);
        framePaths.push(file);
        if (complete) {
          cached++;
          done++;
          continue;
        }
        const ms = (firstFrame + f) * frameMs;
        writeFileSync(file, await session.seekAndCapture(ms, profile.capture));
        rendered++;
        done++;
        opts.onProgress?.(done, totalFrames);
      }
      if (!complete) writeFileSync(path.join(dir, "done"), hash);
    }

    // Encode: pipe PNGs in order (stack-validation §4)
    const enc = profile;
    mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    const music = score.audio?.music;
    const sfx = collectSfx(score, projectDir, compiled);
    let audio: AudioMeasurement = { status: "missing" };
    if (music || sfx.length) {
      const silent = outFile.replace(/(\.[a-z0-9]+)?$/i, ".video-only.mp4");
      await pipeEncode(framePaths, fps, silent, enc.preset, enc.crf);
      await muxAudio(silent, outFile, {
        durationS: compiled.durationMs / 1000,
        music: music ? { file: resolveProjectAsset(projectDir, music.src), gainDb: music.gainDb, fadeOutMs: music.fadeOutMs } : null,
        sfx,
      });
      rmSync(silent, { force: true });
      audio = measureAudio(outFile);
      const audioIssues = audioInvariantIssues(audio, !!music, sfx.length > 0);
      if (audioIssues.length) throw new Error(`final mux violates MO-AUD-1: ${audioIssues.join("; ")}`);
    } else {
      await pipeEncode(framePaths, fps, outFile, enc.preset, enc.crf);
    }

    // Prune cache entries no longer referenced by this score — frame caches are
    // hundreds of full-HD PNGs per scene and grow without bound otherwise
    // (this filled a user's disk once; never again). media/ holds pre-extracted
    // video frames (ADR-0007) and is pruned by its own keep-set.
    const keep = new Set(score.scenes.map((_, i) => sceneHash(score, i, projectDir)));
    for (const d of readdirSync(frameCacheDir, { withFileTypes: true }))
      if (d.isDirectory() && !keep.has(d.name)) rmSync(path.join(frameCacheDir, d.name), { recursive: true, force: true });
    const mediaDir = path.join(cacheDir, "media");
    if (existsSync(mediaDir)) {
      const mediaKeep = prepareMedia(score, projectDir, cacheDir).keep;
      for (const d of readdirSync(mediaDir, { withFileTypes: true }))
        if (d.isDirectory() && !mediaKeep.has(d.name)) rmSync(path.join(mediaDir, d.name), { recursive: true, force: true });
    }

    return {
      outFile,
      totalFrames: framePaths.length,
      renderedFrames: rendered,
      cachedFrames: cached,
      durationMs: compiled.durationMs,
      wallMs: Date.now() - t0,
      captureFps: fps,
      cacheBytes: framePaths.reduce((sum, file) => sum + statSync(file).size, 0),
      audio,
    };
  } finally {
    await session.close();
  }
}

export interface SfxEvent {
  file: string;
  atMs: number;
  gainDb: number;
}

/** ADR-0007: sounds fire at their animation's RESOLVED start — sound design
 *  inherits choreography's relational timing, no separate audio timeline. */
export function collectSfx(score: ScoreT, projectDir: string, compiled: CompileResult): SfxEvent[] {
  const events: SfxEvent[] = [];
  const beats = score.audio?.music?.beats;
  score.scenes.forEach((scene, i) => {
    const sceneStart = compiled.sceneBoundsMs[i].startMs;
    for (const r of resolveSceneTimeline(scene, { sceneStartMs: sceneStart, beats })) {
      const sfx = (r.anim as { sfx?: { src: string; gainDb: number } }).sfx;
      if (!sfx) continue;
      const file = resolveProjectAsset(projectDir, sfx.src);
      events.push({ file, atMs: Math.round(sceneStart + r.startMs), gainDb: sfx.gainDb });
    }
  });
  return events;
}

/** ADR-0027: lossless premix followed by measured final-bus normalization. */
async function muxAudio(
  videoFile: string,
  outFile: string,
  opts: { durationS: number; music: { file: string; gainDb: number; fadeOutMs: number } | null; sfx: SfxEvent[] }
): Promise<void> {
  const D = opts.durationS.toFixed(3);
  const inputs: string[] = [];
  let idx = 0;
  let bedLabel: string;
  const filters: string[] = [];
  if (opts.music) {
    if (!existsSync(opts.music.file)) return Promise.reject(new Error(`Music file not found: ${opts.music.file}`));
    inputs.push("-i", opts.music.file);
    const fadeS = opts.music.fadeOutMs / 1000;
    const fadeStart = Math.max(0, opts.durationS - fadeS);
    filters.push(
      `[${idx}:a]volume=${opts.music.gainDb}dB,apad,atrim=0:${D},` +
        `afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeS.toFixed(3)},aresample=48000,aformat=channel_layouts=stereo[bed]`
    );
    idx++;
    bedLabel = "[bed]";
  } else {
    inputs.push("-f", "lavfi", "-t", D, "-i", "anullsrc=r=48000:cl=stereo");
    filters.push(`[${idx}:a]atrim=0:${D}[bed]`);
    idx++;
    bedLabel = "[bed]";
  }
  const sfxLabels: string[] = [];
  opts.sfx.forEach((e, i) => {
    inputs.push("-i", e.file);
    filters.push(`[${idx}:a]volume=${e.gainDb}dB,aresample=48000,aformat=channel_layouts=stereo,adelay=${e.atMs}|${e.atMs}[s${i}]`);
    sfxLabels.push(`[s${i}]`);
    idx++;
  });
  const mixInputs = 1 + sfxLabels.length;
  filters.push(`${bedLabel}${sfxLabels.join("")}amix=inputs=${mixInputs}:duration=first:normalize=0,atrim=0:${D}[a]`);
  const premix = outFile.replace(/(\.[a-z0-9]+)?$/i, ".premix.wav");
  try {
    await runFfmpeg(["-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[a]", "-c:a", "pcm_s24le", premix]);
    let finalFilter: string;
    if (opts.music) {
      const measured = measureAudio(premix);
      if (measured.status !== "present" || measured.integratedLufs == null || measured.truePeakDbtp == null ||
          measured.loudnessRangeLu == null || measured.thresholdLufs == null || measured.targetOffsetLu == null)
        throw new Error("music-led premix is silent or cannot be measured for two-pass normalization");
      finalFilter = `loudnorm=I=-14:TP=-1.8:LRA=11:measured_I=${measured.integratedLufs}:measured_TP=${measured.truePeakDbtp}:` +
        `measured_LRA=${measured.loudnessRangeLu}:measured_thresh=${measured.thresholdLufs}:offset=${measured.targetOffsetLu}:linear=true,aresample=48000`;
    } else {
      // Sparse SFX must not be amplified toward a music-program loudness target.
      finalFilter = "alimiter=limit=0.75,aresample=48000";
    }
    await runFfmpeg([
      "-y", "-i", videoFile, "-i", premix,
      "-map", "0:v", "-c:v", "copy",
      "-map", "1:a", "-af", finalFilter, "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart", outFile,
    ]);
  } finally {
    rmSync(premix, { force: true });
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}:\n${err.slice(-2000)}`))));
    ff.on("error", reject);
  });
}

function pipeEncode(frames: string[], fps: number, outFile: string, preset: string, crf: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-i", "-",
      "-c:v", "libx264",
      "-preset", preset,
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      // BT.709 tagging; Chrome screenshots are sRGB (stack-validation §4)
      "-vf", "scale=in_range=full:out_range=limited,format=yuv420p",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-movflags", "+faststart",
      outFile,
    ];
    const ff = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}:\n${err.slice(-2000)}`))));
    ff.on("error", reject);
    (async () => {
      try {
        for (const f of frames) {
          const buf = readFileSync(f);
          if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
        }
        ff.stdin.end();
      } catch (e) {
        reject(e as Error);
      }
    })();
  });
}
