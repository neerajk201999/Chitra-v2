/** ADR-0015: deterministic reference video → typed Style DNA + shot evidence. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { analyzeAudio } from "../audio/analyze.js";
import { STYLE_DNA_VERSION, StyleDNA, type StyleDNAT } from "./schema.js";

export interface DecomposeOptions {
  artifactDir?: string;
  evidenceDir: string;
  sceneThreshold?: number;
  sampleFps?: number;
  sampleWidth?: number;
  maxSamples?: number;
}

type Probe = {
  streams?: Array<Record<string, unknown>>;
  format?: { duration?: string };
};

const round = (n: number, places = 4) => Number(n.toFixed(places));
const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const percentile = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
};
const rate = (s: unknown) => {
  const [a, b = 1] = String(s ?? "0/1").split("/").map(Number);
  return b ? a / b : 0;
};
const posixRelative = (from: string, to: string) => path.relative(from, to).split(path.sep).join("/");

async function sha256(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function command(name: string, args: string[], encoding: "utf8" | "buffer" = "utf8") {
  const result = spawnSync(name, args, { encoding, maxBuffer: 1 << 30 });
  if (result.status !== 0)
    throw new Error(`${name} failed: ${String(result.stderr ?? "").slice(-800)}`);
  return result;
}

function probeVideo(file: string) {
  const result = command("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]);
  const data = JSON.parse(String(result.stdout)) as Probe;
  const video = data.streams?.find((s) => s.codec_type === "video");
  const audio = data.streams?.find((s) => s.codec_type === "audio");
  if (!video) throw new Error(`No video stream in ${file}`);
  const durationMs = Math.round(Number(data.format?.duration ?? video.duration ?? 0) * 1000);
  const fps = rate(video.avg_frame_rate || video.r_frame_rate);
  if (!durationMs || !fps) throw new Error(`Video has invalid duration or frame rate: ${file}`);
  const rotation = Number((video.tags as Record<string, unknown> | undefined)?.rotate ?? 0);
  const swap = Math.abs(rotation) % 180 === 90;
  const width = Number(swap ? video.height : video.width);
  const height = Number(swap ? video.width : video.height);
  return {
    durationMs, fps, width, height,
    frameCount: Number(video.nb_frames) || Math.max(1, Math.round((durationMs / 1000) * fps)),
    videoCodec: String(video.codec_name ?? "unknown"),
    audioCodec: audio ? String(audio.codec_name ?? "unknown") : undefined,
    hasAudio: !!audio,
  };
}

function detectCuts(file: string, threshold: number, durationMs: number): number[] {
  const filter = `select=gt(scene\\,${threshold.toFixed(3)}),showinfo`;
  const result = command("ffmpeg", ["-hide_banner", "-v", "info", "-i", file, "-vf", filter, "-an", "-f", "null", "-"]);
  const cuts = [...String(result.stderr).matchAll(/pts_time:([0-9.]+)/g)]
    .map((m) => Math.round(Number(m[1]) * 1000))
    .filter((t) => t > 50 && t < durationMs - 50)
    .sort((a, b) => a - b);
  return cuts.filter((t, i) => i === 0 || t - cuts[i - 1] > 50);
}

function hexFromBin(key: string): string {
  const [r, g, b] = key.split(",").map(Number);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export async function decomposeReference(file: string, options: DecomposeOptions): Promise<StyleDNAT> {
  const abs = path.resolve(file);
  if (!existsSync(abs)) throw new Error(`No such reference video: ${abs}`);
  const sceneThreshold = options.sceneThreshold ?? 0.3;
  const requestedSampleFps = options.sampleFps ?? 4;
  const sampleWidth = options.sampleWidth ?? 160;
  const maxSamples = options.maxSamples ?? 480;
  if (!(sceneThreshold >= 0.05 && sceneThreshold <= 0.9)) throw new Error("sceneThreshold must be 0.05–0.9");
  if (!(requestedSampleFps >= 0.25 && requestedSampleFps <= 8)) throw new Error("sampleFps must be 0.25–8");
  if (!(sampleWidth >= 64 && sampleWidth <= 640)) throw new Error("sampleWidth must be 64–640");
  if (!(maxSamples >= 10 && maxSamples <= 2000)) throw new Error("maxSamples must be 10–2000");

  const media = probeVideo(abs);
  const durationS = media.durationMs / 1000;
  const effectiveSampleFps = Math.min(requestedSampleFps, maxSamples / durationS);
  const cuts = detectCuts(abs, sceneThreshold, media.durationMs);
  const temp = mkdtempSync(path.join(os.tmpdir(), "chitra-decompose-"));
  const evidenceDir = path.resolve(options.evidenceDir);
  const artifactDir = path.resolve(options.artifactDir ?? process.cwd());
  try {
    command("ffmpeg", ["-y", "-v", "error", "-i", abs, "-an", "-vf",
      `fps=${effectiveSampleFps.toFixed(6)},scale=${sampleWidth}:-2:flags=area`,
      path.join(temp, "frame-%06d.png")]);
    const files = readdirSync(temp).filter((f) => f.endsWith(".png")).sort();
    if (!files.length) throw new Error("Reference sampling produced no frames");

    const globalColors = new Map<string, number>();
    const paletteSamples: StyleDNAT["palette"]["samples"] = [];
    const windows: StyleDNAT["motion"]["windows"] = [];
    const frameLuma: number[] = [];
    const frameSaturation: number[] = [];
    let sampleHeight = 0;
    let previous: Float32Array | null = null;
    const paletteEvery = Math.max(1, Math.round(effectiveSampleFps));

    for (let fi = 0; fi < files.length; fi++) {
      const { data, info } = await sharp(path.join(temp, files[fi])).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      sampleHeight ||= info.height;
      const pixels = info.width * info.height;
      const lumas = new Float32Array(pixels);
      const localColors = new Map<string, number>();
      let lumSum = 0, saturationSum = 0;
      for (let pi = 0, off = 0; pi < pixels; pi++, off += info.channels) {
        const r = data[off], g = data[off + 1], b = data[off + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        lumas[pi] = lum; lumSum += lum;
        const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
        saturationSum += hi ? (hi - lo) / hi : 0;
        if (pi % 4 === 0) {
          const q = (v: number) => Math.min(255, Math.floor(v / 32) * 32 + 16);
          const key = `${q(r)},${q(g)},${q(b)}`;
          localColors.set(key, (localColors.get(key) ?? 0) + 1);
          globalColors.set(key, (globalColors.get(key) ?? 0) + 1);
        }
      }
      const meanLuminance = lumSum / pixels;
      const meanSaturation = saturationSum / pixels;
      frameLuma.push(meanLuminance); frameSaturation.push(meanSaturation);
      const timeMs = Math.min(media.durationMs, Math.round((fi / effectiveSampleFps) * 1000));
      if (fi % paletteEvery === 0) {
        const dominant = [...localColors.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
        paletteSamples.push({ timeMs, dominantColor: hexFromBin(dominant), meanLuminance: round(meanLuminance), meanSaturation: round(meanSaturation) });
      }
      if (previous) {
        let delta = 0;
        for (let i = 0; i < lumas.length; i++) delta += Math.abs(lumas[i] - previous[i]);
        const startMs = Math.round(((fi - 1) / effectiveSampleFps) * 1000);
        windows.push({ startMs, endMs: timeMs, energy: round(delta / lumas.length), containsCut: cuts.some((c) => c > startMs && c <= timeMs) });
      }
      previous = lumas;
    }

    mkdirSync(evidenceDir, { recursive: true });
    for (const old of readdirSync(evidenceDir)) if (/^shot-\d+\.png$/.test(old)) rmSync(path.join(evidenceDir, old));
    const bounds = [0, ...cuts, media.durationMs];
    const shots: StyleDNAT["shots"] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const startMs = bounds[i], endMs = bounds[i + 1];
      const midpoint = (startMs + endMs) / 2;
      const sampleIndex = Math.max(0, Math.min(files.length - 1, Math.round((midpoint / 1000) * effectiveSampleFps)));
      const target = path.join(evidenceDir, `shot-${String(i + 1).padStart(3, "0")}.png`);
      copyFileSync(path.join(temp, files[sampleIndex]), target);
      shots.push({ index: i, startMs, endMs, durationMs: endMs - startMs, evidenceFrame: posixRelative(artifactDir, target) });
    }

    const durations = shots.map((s) => s.durationMs);
    const energies = windows.map((w) => w.energy);
    const colors = [...globalColors.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([key]) => hexFromBin(key));
    const audio: StyleDNAT["audio"] = media.hasAudio
      ? { present: true, method: "energy-flux-v1", ...analyzeAudio(abs) }
      : { present: false };
    const ffmpeg = String(command("ffmpeg", ["-version"]).stdout).split("\n")[0];
    return StyleDNA.parse({
      styleDnaVersion: STYLE_DNA_VERSION,
      tier: "style-dna",
      source: { filename: path.basename(abs), sha256: await sha256(abs), ...media, hasAudio: undefined },
      analyzer: {
        ffmpeg,
        sceneDetector: "ffmpeg-scene-score",
        paletteMethod: "rgb-5bit-frequency",
        sceneThreshold,
        requestedSampleFps,
        effectiveSampleFps: round(effectiveSampleFps, 6),
        sampleWidth,
        sampleHeight,
        maxSamples,
        sampleCount: files.length,
      },
      shots,
      rhythm: {
        cutCount: cuts.length,
        cutsPerMinute: round(cuts.length / (durationS / 60)),
        meanShotMs: round(durations.reduce((a, b) => a + b, 0) / durations.length),
        medianShotMs: round(median(durations)), shortestShotMs: Math.min(...durations), longestShotMs: Math.max(...durations),
      },
      palette: {
        dominantColors: colors,
        meanLuminance: round(frameLuma.reduce((a, b) => a + b, 0) / frameLuma.length),
        meanSaturation: round(frameSaturation.reduce((a, b) => a + b, 0) / frameSaturation.length),
        samples: paletteSamples,
      },
      motion: { metric: "mean-absolute-luma-difference", meanEnergy: round(energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length)), p90Energy: round(percentile(energies, 0.9)), peakEnergy: round(Math.max(0, ...energies)), windows },
      audio,
      evidence: { directory: posixRelative(artifactDir, evidenceDir), frameCount: shots.length },
      semanticReview: {
        typography: "unmeasured", cameraIntent: "unmeasured", narrative: "unmeasured", emotion: "unmeasured",
        note: "Deterministic pixels/audio cannot establish semantic intent; annotate separately with evidence links.",
      },
    });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
