import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateScore, type ScoreT } from "../src/ir/schema.js";
import { compile, resolveSceneTimeline, totalDurationMs } from "../src/compile/index.js";
import { frameGateSampleTimes, runFrameGates, runStaticGates, runConformance } from "../src/gates/index.js";
import { pruneLegacyFrameCaches, renderStorageEstimate, sceneHash, type RenderSession } from "../src/render/index.js";
import { browserCandidates } from "../src/browser/index.js";
import { CAPABILITIES } from "../src/capabilities/index.js";
import { assertReleaseTargets } from "../src/release/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const flagship = JSON.parse(
  readFileSync(path.join(here, "../../examples/launch-film/score.json"), "utf8")
);

function validFixture(): ScoreT {
  const v = validateScore(structuredClone(flagship));
  if (!v.ok) throw new Error("flagship fixture must validate: " + JSON.stringify(v.issues));
  return v.score;
}

describe("IR schema (Quality Engine layer 1)", () => {
  it("accepts the flagship score", () => {
    expect(validateScore(flagship).ok).toBe(true);
  });
  it("rejects raw duration overrides without a reason", () => {
    const s = structuredClone(flagship);
    s.scenes[0].choreography[0].override = { durationMs: 3600 }; // no reason
    const r = validateScore(s);
    expect(r.ok).toBe(false);
  });
  it("rejects stagger above the MO-CHOR-1 per-item cap", () => {
    const s = structuredClone(flagship);
    s.scenes[2].choreography[1].stagger = { eachMs: 120, from: "start" };
    expect(validateScore(s).ok).toBe(false);
  });
  it("rejects unknown presets and bad hex colors", () => {
    const s1 = structuredClone(flagship);
    s1.scenes[0].choreography[1].preset = "explode";
    expect(validateScore(s1).ok).toBe(false);
    const s2 = structuredClone(flagship);
    s2.style.palette.bg = "black";
    expect(validateScore(s2).ok).toBe(false);
  });
  it("bounds scene3d textures and internal keyframes", () => {
    const score = validFixture();
    score.scenes[0].elements = [{
      type: "scene3d", id: "product", role: "hero", primitive: "card",
      frontTexture: "assets/front.png", baseColor: "surface", envTint: "accent",
      metalness: 0.2, roughness: 0.3, spinDeg: 0, tiltDeg: 0, exposure: 1.2,
      position: { anchor: "center" }, width: 70, height: 60,
    }];
    score.scenes[0].choreography = [{
      id: "product-turn", target: "product", preset: "three-keyframe-track",
      at: { after: "scene-start", offsetMs: 0 }, override: { reason: "exact authored studio turn is required" },
      threeKeyframes: [
        { frame: 0, mesh: { rotationDeg: { y: -20 } } },
        { frame: 30, mesh: { rotationDeg: { y: 20 } }, camera: { fov: 32 }, exposure: 1.3 },
      ],
    }];
    expect(validateScore(score).ok).toBe(true);
    expect(runStaticGates(score).filter((finding) => finding.ruleId === "MO-3D-2")).toEqual([]);
    const coin = structuredClone(score);
    const product = coin.scenes[0].elements[0];
    if (product.type === "scene3d") product.primitive = "coin";
    expect(validateScore(coin).ok).toBe(false);
    const grouped = structuredClone(score);
    grouped.scenes[0].choreography[0].target = "product*";
    expect(runStaticGates(grouped).some((finding) => finding.ruleId === "MO-3D-2" && finding.severity === "P1")).toBe(true);
  });
});

describe("first-use runtime profile", () => {
  it("prefers an explicit browser and makes draft storage materially smaller", () => {
    expect(browserCandidates({ CHITRA_BROWSER_PATH: "/chosen/chrome" }, "darwin")[0]).toBe("/chosen/chrome");
    const score = validFixture();
    expect(renderStorageEstimate(score, "draft")).toBeLessThan(renderStorageEstimate(score, "standard") / 3);
  });
  it("does not claim arbitrary product CGI or professional taste as native", () => {
    expect(CAPABILITIES.find((item) => item.id === "arbitrary-3d")?.support).toBe("asset-assisted");
    expect(CAPABILITIES.find((item) => item.id === "professional-taste")?.support).toBe("unsupported");
  });
  it("removes only pre-profile frame caches before disk preflight", () => {
    const cache = mkdtempSync(path.join(os.tmpdir(), "chitra-legacy-cache-"));
    try {
      for (const name of ["0123456789abcdef", "fedcba9876543210", "draft-jpeg-12fps", "full-png", "media"])
        mkdirSync(path.join(cache, name));
      writeFileSync(path.join(cache, "0123456789abcdef", "f000000.png"), "frame");
      writeFileSync(path.join(cache, "fedcba9876543210", "keep.txt"), "not a Chitra frame cache");
      expect(pruneLegacyFrameCaches(cache)).toBe(1);
      expect(existsSync(path.join(cache, "0123456789abcdef"))).toBe(false);
      for (const name of ["fedcba9876543210", "draft-jpeg-12fps", "full-png", "media"])
        expect(existsSync(path.join(cache, name))).toBe(true);
    } finally {
      rmSync(cache, { recursive: true, force: true });
    }
  });
});

describe("timeline resolution", () => {
  it("chains relational timing (after + offset)", () => {
    const score = validFixture();
    const resolved = resolveSceneTimeline(score.scenes[0]);
    const kicker = resolved.find((r) => r.anim.id === "kicker-in")!;
    const thesis = resolved.find((r) => r.anim.id === "thesis-in")!;
    expect(kicker.startMs).toBe(250);
    expect(thesis.startMs).toBe(kicker.startMs + kicker.durationMs + 120);
  });
  it("throws on unknown dependency", () => {
    const score = validFixture();
    score.scenes[0].choreography[1].at = { after: "nonexistent", offsetMs: 0 };
    expect(() => resolveSceneTimeline(score.scenes[0])).toThrow(/unknown animation/);
  });
});

describe("static gates (Quality Engine layer 2)", () => {
  it("flagship passes with zero P1/P2", () => {
    const f = runStaticGates(validFixture());
    expect(f.filter((x) => x.severity !== "P3")).toEqual([]);
  });
  it("MO-EDIT-1 catches unreadable hold times", () => {
    const score = validFixture();
    const el = score.scenes[1].elements[0];
    if (el.type === "text") el.content = "This sentence is far too long to read in the time this scene allows it to remain on screen for anyone.";
    const f = runStaticGates(score);
    expect(f.some((x) => x.ruleId === "MO-EDIT-1" && x.severity === "P1")).toBe(true);
  });
  it("MO-CHOR-2 catches competing heroes", () => {
    const score = validFixture();
    for (const el of score.scenes[1].elements) (el as { role?: string }).role = "hero";
    const f = runStaticGates(score);
    expect(f.some((x) => x.ruleId === "MO-CHOR-2")).toBe(true);
  });
  it("MO-EDIT-5 catches scenes that open on dead air", () => {
    const score = validFixture();
    // push every entrance in scene 1 past the 20%/600ms deadline
    for (const a of score.scenes[1].choreography)
      if (!a.override) a.at = { after: "scene-start", offsetMs: 2000 };
    const f = runStaticGates(score);
    expect(f.some((x) => x.ruleId === "MO-EDIT-5")).toBe(true);
    expect(runStaticGates(validFixture()).some((x) => x.ruleId === "MO-EDIT-5")).toBe(false);
  });

  it("MO-SLOP-1 catches fade-only text-card slideshows", () => {
    const score = validFixture();
    score.scenes = score.scenes.slice(0, 2).map((sc, i) => ({
      ...sc,
      id: `card-${i}`,
      elements: sc.elements.filter((e) => e.type === "text"),
      choreography: sc.elements
        .filter((e) => e.type === "text")
        .map((e, j) => ({
          id: `a-${j}`,
          target: e.id,
          preset: "fade-in",
          at: { after: "scene-start" as const, offsetMs: 0 },
        })),
      transitionOut: { type: "cut" as const, duration: "standard" as const },
    })) as ScoreT["scenes"];
    const v = validateScore(score);
    expect(v.ok).toBe(true);
    const f = runStaticGates(v.ok ? v.score : score);
    expect(f.some((x) => x.ruleId === "MO-SLOP-1")).toBe(true);
  });
});

describe("compiler determinism surface", () => {
  it("compiles to identical HTML for identical input", () => {
    const a = compile(validFixture()).html;
    const b = compile(validFixture()).html;
    expect(a).toBe(b);
  });
  it("scene hashes change only for touched scenes", () => {
    const base = validFixture();
    const edited = validFixture();
    const el = edited.scenes[3].elements.find((e) => e.type === "text");
    if (el && el.type === "text") el.content = "Changed.";
    // Editing scene 3 dirties scenes 2..4: 2's transition tail shows 3, and
    // 3's fade-through-black tail paints into 4. Distant scenes stay cached.
    expect(sceneHash(edited, 2)).not.toBe(sceneHash(base, 2));
    expect(sceneHash(edited, 3)).not.toBe(sceneHash(base, 3));
    expect(sceneHash(edited, 4)).not.toBe(sceneHash(base, 4));
    expect(sceneHash(edited, 0)).toBe(sceneHash(base, 0));
    expect(sceneHash(edited, 5)).toBe(sceneHash(base, 5));
  });
  it("front texture bytes invalidate scene hashes", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "chitra-three-hash-"));
    try {
      writeFileSync(path.join(dir, "front.png"), "first");
      const score = validFixture();
      score.scenes = [score.scenes[0]];
      score.scenes[0].elements = [{
        type: "scene3d", id: "product", role: "hero", primitive: "card", frontTexture: "front.png",
        baseColor: "surface", envTint: "accent", metalness: 0.2, roughness: 0.3,
        spinDeg: 0, tiltDeg: 0, exposure: 1.2, position: { anchor: "center" }, width: 70, height: 60,
      }];
      score.scenes[0].choreography = [];
      const before = sceneHash(score, 0, dir);
      writeFileSync(path.join(dir, "front.png"), "second-version");
      expect(sceneHash(score, 0, dir)).not.toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("beat timing invalidates cached frames", () => {
    const base = validFixture();
    base.audio = { music: { src: "assets/bed.wav", gainDb: -6, firstBeatMs: 0, fadeOutMs: 800, beats: [100, 600] } };
    const edited = structuredClone(base);
    edited.audio!.music!.beats = [150, 650];
    expect(sceneHash(edited, 0)).not.toBe(sceneHash(base, 0));
  });
  it("total duration is the sum of scenes", () => {
    const s = validFixture();
    expect(totalDurationMs(s)).toBe(s.scenes.reduce((a, x) => a + x.durationMs, 0));
  });
  it("page exposes the seek contract", () => {
    const { html } = compile(validFixture());
    for (const needle of ["window.__chitra", "seek: function", "textRegions", "@font-face"])
      expect(html).toContain(needle);
    // Our runtime (the last script block — after the vendored GSAP bundle)
    // must never read the wall clock or use unseeded randomness.
    const runtime = html.split("<script>").pop()!;
    expect(runtime).not.toContain("Date.now");
    expect(runtime).not.toContain("Math.random");
    expect(runtime).toContain("clip.match(/^inset\\(([^)]*)\\)/i)");
  });
});

describe("ADR-0027 temporal frame gates", () => {
  it("samples choreography neighborhoods and catches a transient overlap missed by three scene instants", async () => {
    const score = validFixture();
    score.meta.width = 320;
    score.meta.height = 320;
    const scene = score.scenes[0];
    scene.durationMs = 1200;
    scene.transitionOut = { type: "cut", duration: "standard" };
    scene.choreography = [{ id: "brief-move", target: scene.elements[0].id, preset: "slide-in", direction: "left", duration: "quick", at: { after: "scene-start", offsetMs: 100 } }];
    score.scenes = [scene];
    const times = frameGateSampleTimes(score);
    expect(Math.max(...times.slice(1).map((time, index) => time - times[index]))).toBeLessThanOrEqual(250);
    expect(times.some((time) => time >= 100 && time <= 300)).toBe(true);

    const frame = await sharp({ create: { width: 320, height: 320, channels: 3, background: "#050607" } })
      .composite([{ input: Buffer.from('<svg width="80" height="80"><rect width="80" height="80" fill="#ffffff"/></svg>'), left: 120, top: 120 }])
      .png().toBuffer();
    const session = {
      compiled: { html: "", durationMs: 1200, fps: 30, width: 320, height: 320, sceneBoundsMs: [{ id: scene.id, startMs: 0, endMs: 1200 }] },
      textRegions: async (time: number) => [
        { sel: "#a", scene: scene.id, visible: true, overMedia: false, color: "#ffffff", fontSizePx: 24, x: 60, y: 120, w: 90, h: 30, text: "First" },
        { sel: "#b", scene: scene.id, visible: true, overMedia: false, color: "#ffffff", fontSizePx: 24, x: time >= 100 && time <= 300 ? 100 : 180, y: 120, w: 90, h: 30, text: "Second" },
      ],
      seekAndCapture: async () => frame,
    } as unknown as RenderSession;
    const findings = await runFrameGates(score, session);
    expect(findings.some((finding) => finding.ruleId === "QE-OVERLAP-1" && finding.timecodeMs! <= 300)).toBe(true);
  });

  it("checks over-media contrast at the bounded interval samples", async () => {
    const score = validFixture();
    score.meta.width = 320;
    score.meta.height = 320;
    const scene = score.scenes[0];
    scene.durationMs = 1200;
    scene.transitionOut = { type: "cut", duration: "standard" };
    score.scenes = [scene];
    const frame = (background: string, accent: string) => sharp({ create: { width: 320, height: 320, channels: 3, background } })
      .composite([{ input: Buffer.from(`<svg width="20" height="20"><rect width="20" height="20" fill="${accent}"/></svg>`), left: 10, top: 10 }])
      .png().toBuffer();
    const dark = await frame("#000000", "#333333");
    const bright = await frame("#ffffff", "#dddddd");
    const session = {
      compiled: { html: "", durationMs: 1200, fps: 30, width: 320, height: 320, sceneBoundsMs: [{ id: scene.id, startMs: 0, endMs: 1200 }] },
      textRegions: async () => [{ sel: "#media-copy", scene: scene.id, visible: true, overMedia: true, color: "#ffffff", fontSizePx: 24, x: 100, y: 120, w: 120, h: 30, text: "Signal" }],
      contrastCapture: async (time: number) => Math.abs(time - 700) < 1 ? bright : dark,
      seekAndCapture: async () => dark,
    } as unknown as RenderSession;
    const findings = await runFrameGates(score, session);
    expect(findings.some((finding) => finding.ruleId === "MO-TYPE-2" && finding.timecodeMs === 700)).toBe(true);
  });
});

describe("ADR-0027 release target safety", () => {
  it("refuses output paths that can overwrite creative or render inputs", () => {
    const project = mkdtempSync(path.join(os.tmpdir(), "chitra-release-targets-"));
    try {
      mkdirSync(path.join(project, "assets"));
      const asset = path.join(project, "assets/shot.png");
      writeFileSync(asset, "asset");
      const score = validFixture();
      score.scenes[0].elements.push({
        type: "image", id: "shot", role: "support", src: "assets/shot.png", fit: "cover",
        position: { anchor: "center", x: 50, y: 50 }, width: 20, height: 20, radius: 0, scrim: 0,
      });
      const artifacts = { intake: path.join(project, "intake.json"), direction: path.join(project, "direction.json"), storyboard: path.join(project, "storyboard.json"), score: path.join(project, "score.json") };
      for (const file of Object.values(artifacts)) writeFileSync(file, "{}");
      const safe = { out: path.join(project, "out/final.mp4"), evidence: path.join(project, "out/evidence"), receipt: path.join(project, "out/release.json") };
      expect(() => assertReleaseTargets(artifacts, score, project, safe)).not.toThrow();
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, out: artifacts.score })).toThrow(/overwrite an input/);
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, out: asset })).toThrow(/overwrite an input/);
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, evidence: project })).toThrow(/contains an input/);
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, out: path.join(safe.evidence, "final.mp4") })).toThrow(/not nested/);
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, receipt: path.join(safe.evidence, "release.json") })).toThrow(/not nested/);
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, evidence: path.join(safe.out, "evidence") })).toThrow(/not nested/);
      expect(() => assertReleaseTargets(artifacts, score, project, { ...safe, receipt: path.join(safe.out, "release.json") })).toThrow(/not nested/);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("media assets (ADR-0006)", () => {
  const withImage = (scrim: number, color?: string) => {
    const s = validFixture();
    s.scenes[0].elements.push({
      type: "image", id: "shot", role: "support", src: "assets/shot.png",
      fit: "cover", position: { anchor: "center", x: 50, y: 50 },
      width: 60, height: 60, radius: 2, scrim,
    } as never);
    if (color) (s.scenes[1].elements as { color?: string }[]).forEach((e) => { if (e.color === "text" || e.color === undefined) e.color = color; });
    return s;
  };
  it("rejects remote and absolute src (render path must stay hermetic)", () => {
    const s = structuredClone(flagship);
    s.scenes[0].elements.push({ type: "image", id: "x", src: "https://example.com/a.png" });
    expect(validateScore(s).ok).toBe(false);
    s.scenes[0].elements[s.scenes[0].elements.length - 1].src = "/etc/a.png";
    expect(validateScore(s).ok).toBe(false);
    s.scenes[0].elements[s.scenes[0].elements.length - 1].src = "../outside.png";
    expect(validateScore(s).ok).toBe(false);
    s.scenes[0].elements[s.scenes[0].elements.length - 1].src = "assets\\outside.png";
    expect(validateScore(s).ok).toBe(false);
  });
  it("MO-MED-1: text over unscrimmed media is a P2; scrim clears it", () => {
    const bad = runStaticGates(withImage(0)).filter((f) => f.ruleId === "MO-MED-1");
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0].severity).toBe("P2");
    const good = runStaticGates(withImage(0.4)).filter((f) => f.ruleId === "MO-MED-1");
    expect(good.length).toBe(0);
  });
  it("sceneHash digests asset bytes: editing the image invalidates its scene", async () => {
    const { mkdtempSync, writeFileSync: wf, mkdirSync: mk } = await import("node:fs");
    const os = await import("node:os");
    const dir = mkdtempSync(path.join(os.tmpdir(), "chitra-asset-"));
    mk(path.join(dir, "assets"), { recursive: true });
    wf(path.join(dir, "assets/shot.png"), Buffer.from("fake-png-v1"));
    const s = withImage(0.4);
    const h1 = sceneHash(s, 0, dir);
    const h0 = sceneHash(s, 1, dir); // neighbor: also depends on the asset
    wf(path.join(dir, "assets/shot.png"), Buffer.from("fake-png-v2"));
    expect(sceneHash(s, 0, dir)).not.toBe(h1);
    expect(sceneHash(s, 1, dir)).not.toBe(h0);
    expect(sceneHash(s, 4, dir)).toBe(sceneHash(s, 4, dir));
    expect(() => sceneHash({ ...s, scenes: s.scenes.map((sc, i) => i === 0 ? { ...sc, elements: sc.elements.map((e) => e.type === "image" ? { ...e, src: "assets/missing.png" } : e) } : sc) } as never, 0, dir)).toThrow(/asset not found/);
  });
});

describe("video-in-scene + audio v2 (ADR-0007)", () => {
  it("rejects remote video src and accepts local clips with sfx", () => {
    const s = structuredClone(flagship);
    s.scenes[0].elements.push({ type: "video", id: "clip", src: "https://x.com/a.mp4" });
    expect(validateScore(s).ok).toBe(false);
    const s2 = structuredClone(flagship);
    s2.scenes[0].elements.push({ type: "video", id: "clip", src: "assets/a.mp4" });
    s2.scenes[0].choreography[1].sfx = { src: "assets/sfx/whoosh.wav", gainDb: -14 };
    expect(validateScore(s2).ok).toBe(true);
  });
  it("MO-AUD-3 flags SFX-dense scenes", () => {
    const s = validFixture();
    for (const a of s.scenes[1].choreography) (a as { sfx?: object }).sfx = { src: "assets/sfx/tick.wav", gainDb: -14 };
    const f = runStaticGates(s).filter((x) => x.ruleId === "MO-AUD-3");
    expect(s.scenes[1].choreography.length).toBeGreaterThan(2);
    expect(f.length).toBe(1);
  });
  it("compiles video elements to frame-swap imgs with a media runtime", () => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "video", id: "clip", src: "assets/a.mp4", fit: "cover",
      position: { anchor: "center", x: 50, y: 50 }, width: 60, height: 60, radius: 2, scrim: 0, startMs: 0, role: "hero" } as never);
    const { html } = compile(s);
    expect(html).toContain('data-vid="cold-open--clip"');
    expect(html).toContain("setMedia");
    expect(html).toContain("VIDMETA");
  });
});

describe("figures & interaction choreography (ADR-0008)", () => {
  it("sanitizer strips scripts, handlers, and external refs but keeps UI markup", async () => {
    const { sanitizeFragment } = await import("../src/compile/index.js");
    const dirty = `<div class="card" onclick="evil()" style="background:var(--surface)">
      <script>alert(1)</script><iframe src="https://x.com"></iframe>
      <img src="https://remote/x.png"/><a href="javascript:void(0)">ok</a>
      <button style="background:url(https://a/b.png)">Send</button></div>`;
    const clean = sanitizeFragment(dirty);
    for (const bad of ["<script", "<iframe", "onclick", "https://remote", "javascript:", "url(https"])
      expect(clean.toLowerCase()).not.toContain(bad);
    expect(clean).toContain('class="card"');
    expect(clean).toContain("var(--surface)");
    expect(clean).toContain("<button");
  });
  it("declares, contains, and hashes every nested figure asset", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } = await import("node:fs");
    const os = await import("node:os");
    const project = mkdtempSync(path.join(os.tmpdir(), "chitra-figure-assets-"));
    const outside = mkdtempSync(path.join(os.tmpdir(), "chitra-figure-outside-"));
    try {
      mkdirSync(path.join(project, "assets"));
      writeFileSync(path.join(project, "figure.html"), '<img src="assets/card.png" style="width:100%">');
      writeFileSync(path.join(project, "assets/card.png"), "card-v1");
      const score = validFixture();
      score.scenes[0].elements.push({
        type: "figure", id: "sourced-card", role: "hero", src: "figure.html",
        assets: [{ src: "assets/card.png", assetUse: { sourceId: "licensed-card", kind: "derived", note: "Crop the licensed card artwork into the approved phone composition" } }],
        position: { anchor: "center", x: 50, y: 50 }, width: 40, height: 40, radius: 0, shadow: false,
      } as never);
      expect(() => compile(score, project)).not.toThrow();
      const before = sceneHash(score, 0, project);
      writeFileSync(path.join(project, "assets/card.png"), "card-v2");
      expect(sceneHash(score, 0, project)).not.toBe(before);

      const undeclared = structuredClone(score);
      const figure = undeclared.scenes[0].elements.find((element) => element.id === "sourced-card");
      if (figure?.type === "figure") figure.assets = [];
      expect(() => compile(undeclared, project)).toThrow(/undeclared asset/);

      writeFileSync(path.join(project, "figure.html"), '<img src="data:image/png;base64,AAAA">');
      expect(() => compile(score, project)).toThrow(/inline or file URL assets are forbidden/);

      writeFileSync(path.join(project, "figure.html"), '<img srcset="assets/card.png 1x">');
      expect(() => compile(score, project)).toThrow(/srcset.*unsupported/);

      writeFileSync(path.join(outside, "escape.png"), "outside");
      symlinkSync(path.join(outside, "escape.png"), path.join(project, "assets/escape.png"));
      writeFileSync(path.join(project, "figure.html"), '<img src="assets/escape.png">');
      const escaped = structuredClone(score);
      const escapedFigure = escaped.scenes[0].elements.find((element) => element.id === "sourced-card");
      if (escapedFigure?.type === "figure") escapedFigure.assets = [{ src: "assets/escape.png", assetUse: escapedFigure.assets[0].assetUse }];
      expect(() => compile(escaped, project)).toThrow(/escapes project through a symlink/);
    } finally {
      rmSync(project, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
  it("IR-CUR-1 gates waypoint misuse and wrong-kind targets", () => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "cursor", id: "cur" } as never);
    s.scenes[0].choreography.push(
      { id: "bad-way", target: "thesis", preset: "fade-in", waypoints: [{ x: 10, y: 10 }], at: { after: "scene-start", offsetMs: 0 } } as never,
      { id: "no-way", target: "cur", preset: "cursor-move", at: { after: "scene-start", offsetMs: 0 } } as never,
      { id: "bad-type", target: "cur", preset: "type-in", at: { after: "scene-start", offsetMs: 0 } } as never,
    );
    const hits = runStaticGates(s).filter((x) => x.ruleId === "IR-CUR-1");
    expect(hits.length).toBe(3);
  });
  it("type-in splits target text into char spans with a caret", () => {
    const s = validFixture();
    s.scenes[0].choreography.push({ id: "t", target: "thesis", preset: "type-in", at: { after: "scene-start", offsetMs: 0 } } as never);
    const html = compile(validFixture()).html;
    const typedHtml = compile(s).html;
    expect(html).not.toContain('class="ch"');
    expect(typedHtml).toContain('class="ch"');
    expect(typedHtml).toContain('class="caret"');
  });
});

describe("figure internals as nested comps (ADR-0008)", () => {
  it("figureId/innerId compiles to a scoped selector and gates on the figure's existence", () => {
    const s = validFixture();
    s.scenes[0].choreography.push({ id: "inner", target: "ghost/menu", preset: "fade-up", at: { after: "scene-start", offsetMs: 100 } } as never);
    const hits = runStaticGates(s).filter((x) => x.ruleId === "IR-REF-2");
    expect(hits.length).toBe(1); // no figure named ghost
    const v = validateScore(structuredClone(s));
    expect(v.ok).toBe(true); // syntax itself is legal
  });
});

describe("figure state continuity (IR-FIG-1)", () => {
  it("flags internals changed in scene N but not re-declared in the continuing scene", () => {
    const s = validFixture();
    const fig = { type: "figure", id: "card", src: "figures/x.html", position: { anchor: "center", x: 50, y: 46 }, width: 40, height: 24 };
    s.scenes[0].elements.push(structuredClone(fig) as never);
    s.scenes[1].elements.push(structuredClone(fig) as never);
    s.scenes[0].choreography.push({ id: "ph-out", target: "card/ph", preset: "fade-out", at: { after: "scene-start", offsetMs: 300 } } as never);
    const hits = runStaticGates(s).filter((x) => x.ruleId === "IR-FIG-1");
    expect(hits.length).toBe(1);
    // re-declaring with `hide` clears it
    s.scenes[1].choreography.push({ id: "ph-off", target: "card/ph", preset: "hide", at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).filter((x) => x.ruleId === "IR-FIG-1").length).toBe(0);
  });
});

describe("particle fields (ADR-0009)", () => {
  const withField = (over: object = {}) => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "particles", id: "field", formation: "grid", cols: 8, rows: 6, dotSize: 7, position: { anchor: "center", x: 50, y: 50 }, width: 40, height: 40, ...over } as never);
    const v = validateScore(s);
    return v.ok ? v.score : s;
  };
  it("renders a deterministic dot field and shimmer is seek-stable", () => {
    const s = withField();
    s.scenes[0].choreography.push({ id: "sh", target: "field", preset: "particle-shimmer", at: { after: "scene-start", offsetMs: 0 } } as never);
    const a = compile(s).html, b = compile(s).html;
    expect(a).toBe(b);
    expect((a.match(/class="pdot"/g) || []).length).toBe(48);
    expect(a).not.toContain("opacity:1.000;box-shadow");
  });
  it("MO-PART-1 caps dot count and confines morphTo to particle-morph", () => {
    const big = runStaticGates(withField({ cols: 24, rows: 24 })).filter((x) => x.ruleId === "MO-PART-1");
    expect(big.some((x) => x.severity === "P1")).toBe(true);
    const s = withField();
    s.scenes[0].choreography.push({ id: "bad", target: "field", preset: "particle-shimmer", morphTo: "ring", at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-PART-1")).toBe(true);
  });
  it("particle presets must target a particles element", () => {
    const s = validFixture();
    s.scenes[0].choreography.push({ id: "wrong", target: "thesis", preset: "particle-form", at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-PART-1")).toBe(true);
  });
  it("ADR-0020 compiles ordered custom points and deterministic custom morph deltas", () => {
    const points = [{ x: 10, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 70 }, { x: 10, y: 70 }];
    const s = withField({ formation: "custom", points, count: 4 });
    s.scenes[0].choreography.push({ id: "to-ring", target: "field", preset: "particle-morph", morphTo: "ring", duration: "emphasis", at: { after: "scene-start", offsetMs: 0 } } as never);
    const v = validateScore(s);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const a = compile(v.score).html, b = compile(v.score).html;
    expect(a).toBe(b);
    expect((a.match(/class="pdot"/g) || []).length).toBe(4);
    expect(a).toContain("left:10.000%;top:20.000%");
    expect(a).toContain("__morphDeltas");
  });
  it("ADR-0020 rejects missing/out-of-bounds custom points and gates count drift", () => {
    const missing = structuredClone(flagship);
    missing.scenes[0].elements.push({ type: "particles", id: "custom", formation: "custom" });
    expect(validateScore(missing).ok).toBe(false);
    missing.scenes[0].elements.at(-1).points = [{ x: -1, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }];
    expect(validateScore(missing).ok).toBe(false);

    const s = withField();
    s.scenes[0].choreography.push({ id: "bad-custom", target: "field", preset: "particle-morph", morphTo: "custom", morphPoints: [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 50 }, { x: 25, y: 25 }], at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-PART-1" && /destination points/.test(x.message))).toBe(true);
    expect(() => compile(s)).toThrow(/4 destination points for 48 source dots/);
  });
  it("ADR-0025 compiles bounded per-point size/opacity and field glow deterministically", () => {
    const points = [
      { x: 10, y: 20, size: 0.5, opacity: 0.25 },
      { x: 80, y: 20, size: 1.2, opacity: 0.8 },
      { x: 80, y: 70 },
      { x: 10, y: 70 },
    ];
    const s = withField({ formation: "custom", points, count: 4, dotSize: 10, glow: 2 });
    const v = validateScore(s);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const a = compile(v.score).html, b = compile(v.score).html;
    expect(a).toBe(b);
    expect(a).toContain("opacity:0.250;box-shadow:0 0 10.0px");
    v.score.meta.width = 100;
    v.score.meta.height = 100;
    expect(compile(v.score).html).toContain("width:1px;height:1px");

    expect(validateScore(withField({ formation: "custom", points: [{ x: 10, y: 10, size: 0.1 }, ...points.slice(1)], count: 4 })).ok).toBe(false);
    expect(validateScore(withField({ formation: "custom", points: [{ x: 10, y: 10, opacity: 1.1 }, ...points.slice(1)], count: 4 })).ok).toBe(false);
    expect(validateScore(withField({ glow: 4.1 })).ok).toBe(false);

    const morph = withField();
    morph.scenes[0].choreography.push({ id: "appearance-at-destination", target: "field", preset: "particle-morph", morphTo: "custom", morphPoints: [{ x: 0, y: 0, size: 2 }, { x: 100, y: 100 }, { x: 50, y: 50 }, { x: 25, y: 25 }], at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(validateScore(morph).ok).toBe(false);
  });
});

describe("transform composition groups (ADR-0021)", () => {
  it("renders a child once under an independently targetable parent", () => {
    const s = validFixture();
    s.scenes[0].elements.push(
      { type: "shape", id: "grouped-dot", role: "support", shape: "circle", color: "accent", opacity: 1, position: { anchor: "center", x: 50, y: 50 }, width: 8, height: 8, radius: 50 } as never,
      { type: "group", id: "dot-comp", role: "support", children: ["grouped-dot"] } as never,
    );
    s.scenes[0].choreography.push({ id: "comp-in", target: "dot-comp", preset: "scale-settle", at: { after: "scene-start", offsetMs: 0 } } as never);
    const v = validateScore(s);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const html = compile(v.score).html;
    expect(html).toContain('id="cold-open--dot-comp"');
    expect(html.indexOf('id="cold-open--grouped-dot"')).toBe(html.lastIndexOf('id="cold-open--grouped-dot"'));
    expect(html.indexOf('id="cold-open--dot-comp"')).toBeLessThan(html.indexOf('id="cold-open--grouped-dot"'));
    expect(runStaticGates(v.score).filter((finding) => finding.ruleId === "IR-GROUP-1")).toEqual([]);
  });
  it("blocks missing, multiply-owned, and nested children", () => {
    const s = validFixture();
    s.scenes[0].elements.push(
      { type: "group", id: "group-a", children: ["thesis", "missing"] } as never,
      { type: "group", id: "group-b", children: ["thesis", "group-a"] } as never,
    );
    expect(runStaticGates(s).filter((finding) => finding.ruleId === "IR-GROUP-1").length).toBe(3);
    expect(() => compile(s)).toThrow(/missing child|belongs to both groups|cannot contain group/);
  });
});

describe("audio-reactive timeline (ADR-0011)", () => {
  it("onBeat resolves to scene-relative time and errors without beats", async () => {
    const { resolveSceneTimeline } = await import("../src/compile/index.js");
    const s = validFixture();
    s.scenes[1].choreography[0].at = { onBeat: 2, offsetMs: 0 } as never;
    const beats = [0, 1000, 2000, 3000];
    // scene 1 starts at scene0.duration; onBeat 2 = 2000ms absolute
    const start = s.scenes[0].durationMs;
    const r = resolveSceneTimeline(s.scenes[1], { sceneStartMs: start, beats });
    expect(r[0].startMs).toBe(Math.max(0, 2000 - start));
    expect(() => resolveSceneTimeline(s.scenes[1], { sceneStartMs: start })).toThrow(/beats/);
  });
  it("MO-AUD-4 blocks onBeat without a declared beat grid", () => {
    const s = validFixture();
    s.scenes[0].choreography[0].at = { onBeat: 1, offsetMs: 0 } as never;
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-AUD-4" && x.severity === "P1")).toBe(true);
  });
});

describe("real 3D scene (ADR-0010)", () => {
  const with3d = (over: object = {}) => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "scene3d", id: "card3d", primitive: "card", baseColor: "surface", envTint: "accent", position: { anchor: "center", x: 50, y: 45 }, width: 70, height: 48, ...over } as never);
    const v = validateScore(s);
    return v.ok ? v.score : s;
  };
  it("inlines Three + a canvas only when a scene3d is present; deterministic compile", () => {
    const plain = compile(validFixture()).html;
    expect(plain).not.toContain('data-3d=');
    expect(plain).not.toContain("PMREMGenerator");
    const s = with3d();
    const a = compile(s).html, b = compile(s).html;
    expect(a).toBe(b); // deterministic source
    expect(a).toContain('data-3d="cold-open--card3d"');
    expect(a).toContain("WebGLRenderer");
    expect(a).toContain("window.__three3d");
  });
  it("MO-3D-1 flags agitated spin", () => {
    expect(runStaticGates(with3d({ spinDeg: 38 })).some((x) => x.ruleId === "MO-3D-1")).toBe(true);
    expect(runStaticGates(with3d({ spinDeg: 16 })).some((x) => x.ruleId === "MO-3D-1")).toBe(false);
  });
});

describe("frame-addressed transform tracks (ADR-0013)", () => {
  const withTrack = () => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "shape", id: "tracked-card", role: "support", shape: "rect", color: "surface", opacity: 1, position: { anchor: "center", x: 50, y: 50 }, width: 20, height: 12, radius: 2 } as never);
    s.scenes[0].choreography.push({
      id: "exact-card-turn",
      target: "tracked-card",
      preset: "keyframe-track",
      at: { after: "scene-start", offsetMs: 0 },
      override: { reason: "reference-matched card turn needs frame-exact perspective" },
      keyframes: [
        { frame: 0, x: 0, y: 0, scale: 1, rotationYDeg: -18, opacity: 0, perspectivePx: 900, origin: "center" },
        { frame: 15, x: 5, rotationYDeg: 4, opacity: 1, easing: "enter-settle" },
        { frame: 30, x: 10, y: -5, scale: 1.08, rotationXDeg: 6, rotationYDeg: 0, rotationZDeg: 2 },
      ],
    } as never);
    return s;
  };

  it("validates typed states and derives duration from output frames", () => {
    const raw = withTrack();
    const v = validateScore(raw);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const track = resolveSceneTimeline(v.score.scenes[0], { sceneStartMs: 0, fps: v.score.meta.fps }).at(-1)!;
    expect(track.durationMs).toBe(1000); // frame 30 at 30fps
    expect(runStaticGates(v.score).filter((x) => x.ruleId === "MO-KEY-1")).toEqual([]);
  });

  it("rejects malformed ordering and gates unreasoned or misplaced tracks", () => {
    const malformed = withTrack() as unknown as { scenes: Array<{ choreography: Array<{ keyframes: Array<{ frame: number }> }> }> };
    malformed.scenes[0].choreography.at(-1)!.keyframes[0].frame = 2;
    expect(validateScore(malformed).ok).toBe(false);

    const conflictingScale = withTrack();
    conflictingScale.scenes[0].choreography.at(-1)!.keyframes![0].scaleX = 1.1;
    expect(validateScore(conflictingScale).ok).toBe(false);

    const missingReason = withTrack();
    missingReason.scenes[0].choreography.at(-1)!.override = undefined;
    expect(runStaticGates(missingReason).some((x) => x.ruleId === "MO-KEY-1" && x.severity === "P1")).toBe(true);

    const misplaced = withTrack();
    misplaced.scenes[0].choreography.at(-1)!.preset = "fade-in";
    expect(runStaticGates(misplaced).some((x) => x.ruleId === "MO-KEY-1" && /require keyframe-track/.test(x.message))).toBe(true);

    const overlong = withTrack();
    overlong.scenes[0].choreography.at(-1)!.keyframes!.at(-1)!.frame = 1200;
    expect(runStaticGates(overlong).some((x) => x.ruleId === "MO-KEY-1" && /beyond scene/.test(x.message))).toBe(true);

    const stacked = withTrack();
    stacked.scenes[0].choreography.push({ id: "also-card", target: "tracked*", preset: "pulse", at: { after: "scene-start", offsetMs: 500 } } as never);
    expect(runStaticGates(stacked).some((x) => x.ruleId === "MO-KEY-1" && /exclusively own/.test(x.message))).toBe(true);
  });

  it("serializes stage units and typed 3D transforms into the seek runtime deterministically", () => {
    const s = withTrack();
    const a = compile(s).html;
    const b = compile(s).html;
    expect(a).toBe(b);
    expect(a).toContain("__keyframeTrack");
    expect(a).toContain('"x":192'); // 10 stage units at 1920px
    expect(a).toContain('"y":-54'); // -5 stage units at 1080px
    expect(a).toContain('"rotationY":-18');
    expect(a).toContain('"transformPerspective":900');
    expect(a).toContain('"transformOrigin":"50% 50%"');
  });
});

describe("creative conformance (ADR-0012)", () => {
  const dir = {
    irVersion: "0.1.0", tier: "direction", title: "T", register: "brand-film",
    logline: "a line long enough", narrativeArc: "setup then tension then peak then release",
    tone: ["assured"], audience: "builders",
    scenes: [
      { id: "open", narrativeRole: "cold open state tension", shotIntent: "feel the gap", pacingWeight: 1 },
      { id: "peak", narrativeRole: "the turn to capability", shotIntent: "confidence lands", heroMoment: "the claim lands", pacingWeight: 1.5 },
    ],
  };
  const baseScore = () => ({
    irVersion: "0.1.0", tier: "score",
    meta: { title: "T", register: "brand-film", width: 1920, height: 1080, fps: 30, seed: 1, safeZone: "16x9-standard" },
    style: JSON.parse(JSON.stringify(validFixture().style)),
    scenes: [
      { id: "open", reason: "opens the film", durationMs: 3000, background: "bg", elements: [{ type: "text", id: "t1", role: "hero", textRole: "display", content: "Gap." }], choreography: [] },
      { id: "peak", reason: "the peak", durationMs: 4000, background: "bg", elements: [{ type: "text", id: "t2", role: "hero", textRole: "headline", content: "Answered." }], choreography: [] },
    ],
  });
  it("passes when the score honors the direction", () => {
    const v = validateScore(baseScore());
    expect(v.ok).toBe(true);
    expect(runConformance(dir as never, (v as { score: unknown }).score as never).filter((x: {severity:string}) => x.severity !== "P3")).toEqual([]);
  });
  it("CC-CONF-2 catches a dropped directed beat", () => {
    const s = baseScore(); s.scenes = s.scenes.filter((x) => x.id !== "peak");
    const v = validateScore(s);
    const found = runConformance(dir as never, (v as { score: unknown }).score as never);
    expect(found.some((x: {ruleId:string}) => x.ruleId === "CC-CONF-2")).toBe(true);
  });
  it("CC-CONF-1 catches a register mismatch", () => {
    const s = baseScore(); s.meta.register = "social-short";
    const v = validateScore(s);
    expect(runConformance(dir as never, (v as { score: unknown }).score as never).some((x: {ruleId:string}) => x.ruleId === "CC-CONF-1")).toBe(true);
  });
  it("CC-CONF-4 catches an unexecuted hero moment", () => {
    const s = baseScore(); (s.scenes[1].elements[0] as { role: string }).role = "support";
    const v = validateScore(s);
    expect(runConformance(dir as never, (v as { score: unknown }).score as never).some((x: {ruleId:string}) => x.ruleId === "CC-CONF-4")).toBe(true);
  });
});
