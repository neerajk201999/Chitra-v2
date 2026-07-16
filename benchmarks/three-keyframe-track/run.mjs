#!/usr/bin/env node
/** ADR-0028 executable benchmark: rights-local texture readiness, exact typed
 * Three state under non-monotonic seeks, and byte-identical repeated pixels. */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const check = process.argv.includes("--check");
const sharp = createRequire(path.join(root, "core/package.json"))("sharp");
const { validateScore } = await import(path.join(root, "core/dist/ir/schema.js"));
const { runStaticGates } = await import(path.join(root, "core/dist/gates/index.js"));
const { openSession } = await import(path.join(root, "core/dist/render/index.js"));

const work = path.join(here, ".work");
const assets = path.join(work, "assets");
mkdirSync(assets, { recursive: true });
await sharp(Buffer.from(`<svg width="512" height="320" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="320" rx="28" fill="#f7ede2"/><circle cx="96" cy="88" r="42" fill="#d11735"/><path d="M58 244h396" stroke="#111827" stroke-width="18"/><text x="160" y="112" font-family="sans-serif" font-size="46" font-weight="700" fill="#111827">CHITRA</text></svg>`)).png().toFile(path.join(assets, "front.png"));

const raw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Textured 3D benchmark", register: "brand-film", width: 640, height: 360, fps: 30, seed: 1, safeZone: "none" },
  style: {
    name: "benchmark",
    palette: { bg: "#050505", surface: "#e8e8e8", primary: "#d11735", accent: "#ff9b54", text: "#ffffff", textDim: "#b8b8b8", onMedia: "#ffffff" },
    fonts: { display: "Space Grotesk", text: "Inter", mono: "JetBrains Mono" },
    displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0,
  },
  scenes: [{
    id: "three-test", reason: "proves textured internal 3D state evaluation", durationMs: 1500, background: "bg",
    elements: [{ type: "scene3d", id: "product", role: "hero", primitive: "card", frontTexture: "assets/front.png", baseColor: "surface", envTint: "accent", metalness: 0.2, roughness: 0.35, spinDeg: 0, tiltDeg: 0, exposure: 1.2, position: { anchor: "center" }, width: 70, height: 70 }],
    choreography: [{
      id: "product-turn", target: "product", preset: "three-keyframe-track", at: { after: "scene-start", offsetMs: 0 },
      override: { reason: "benchmark requires exact internal product states" },
      threeKeyframes: [
        { frame: 0, mesh: { position: { x: -0.4, y: 0, z: 0 }, rotationDeg: { x: 0, y: -24, z: -2 }, scale: { x: 0.9, y: 0.9, z: 0.9 } }, camera: { position: { x: 0, y: 0, z: 8 }, fov: 34 }, keyLight: { position: { x: 5, y: 6, z: 4 }, intensity: 3 }, fillLight: { position: { x: -5, y: -1, z: 3 }, intensity: 1 }, exposure: 1.1 },
        { frame: 15, mesh: { position: { x: 0, y: 0.2, z: 0 }, rotationDeg: { x: 4, y: 8, z: 1 }, scale: { x: 1.05, y: 1.05, z: 1.05 } }, camera: { position: { x: 0.2, y: 0.1, z: 7.2 }, fov: 30 }, keyLight: { position: { x: -2, y: 5, z: 5 }, intensity: 5 }, fillLight: { position: { x: 4, y: 0, z: 2 }, intensity: 1.4 }, exposure: 1.4, easing: "move-through" },
        { frame: 30, mesh: { position: { x: 0.35, y: 0, z: 0 }, rotationDeg: { x: 0, y: 28, z: 3 }, scale: { x: 1, y: 1, z: 1 } }, camera: { position: { x: 0, y: 0, z: 7.8 }, fov: 32 }, keyLight: { position: { x: -5, y: 4, z: 3 }, intensity: 4 }, fillLight: { position: { x: 5, y: -1, z: 4 }, intensity: 1.2 }, exposure: 1.25, easing: "enter-settle" },
      ],
    }],
    transitionOut: { type: "cut", duration: "standard" },
  }],
};

const parsed = validateScore(raw);
if (!parsed.ok) throw new Error(`benchmark score invalid: ${JSON.stringify(parsed.issues)}`);
const findings = runStaticGates(parsed.score).filter((finding) => finding.severity !== "P3");
if (findings.length) throw new Error(`benchmark score failed gates: ${JSON.stringify(findings)}`);

const expected = [
  { frame: 0, meshPositionX: -0.4, meshRotationY: -24, cameraPositionZ: 8, cameraFov: 34, keyIntensity: 3, fillIntensity: 1, exposure: 1.1 },
  { frame: 15, meshPositionX: 0, meshRotationY: 8, cameraPositionZ: 7.2, cameraFov: 30, keyIntensity: 5, fillIntensity: 1.4, exposure: 1.4 },
  { frame: 30, meshPositionX: 0.35, meshRotationY: 28, cameraPositionZ: 7.8, cameraFov: 32, keyIntensity: 4, fillIntensity: 1.2, exposure: 1.25 },
];
const session = await openSession(parsed.score, work, path.join(work, "cache"));
const rows = [];
try {
  for (const want of [expected[2], expected[0], expected[1]]) {
    const got = await session.page.evaluate(async (frame) => {
      await window.__chitra.seek((frame / 30) * 1000);
      return window.__chitra.threeState("three-test--product");
    }, want.frame);
    if (!got?.frontTextureReady) throw new Error("front texture was not ready before capture");
    for (const [key, value] of Object.entries(want)) {
      if (key !== "frame" && Math.abs(got[key] - value) > 0.02)
        throw new Error(`frame ${want.frame} ${key}: expected ${value}, got ${got[key]}`);
    }
    rows.push(`| ${want.frame} | ${got.meshPositionX.toFixed(2)} | ${got.meshRotationY.toFixed(2)}° | ${got.cameraFov.toFixed(2)}° | ${got.exposure.toFixed(2)} | pass |`);
  }
  const a = await session.seekAndCapture(500);
  const b = await session.seekAndCapture(500);
  const hashA = createHash("sha256").update(a).digest("hex");
  const hashB = createHash("sha256").update(b).digest("hex");
  if (hashA !== hashB) throw new Error(`same-frame capture mismatch: ${hashA} != ${hashB}`);
  const report = `# Textured 3D property-track benchmark — 2026-07-16\n\nADR-0028 browser verification at 640×360, 30fps with generated owned artwork.\n\n| Frame | Mesh X | Rotation Y | Camera FOV | Exposure | Result |\n|---:|---:|---:|---:|---:|:---:|\n${rows.join("\n")}\n\n- Texture ready before capture: **passed**\n- Exact authored states: **3/3 passed**\n- Random seek order: **30 → 0 → 15 passed**\n- Repeated frame-15 PNG: **byte-identical** (${hashA.slice(0, 16)}…)\n- Static gates: **0 P1/P2 findings**\n`;
  if (!check) writeFileSync(path.join(here, "results.md"), report);
  console.log("✔ textured 3D states 3/3; repeated capture byte-identical");
} finally {
  await session.close();
  rmSync(work, { recursive: true, force: true });
}
