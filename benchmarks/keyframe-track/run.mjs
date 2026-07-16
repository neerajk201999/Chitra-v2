#!/usr/bin/env node
/** ADR-0013 executable benchmark: exact frame seeks must land on authored
 *  transform states and repeated captures of the same frame must byte-match. */
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const { validateScore } = await import(path.join(root, "core/dist/ir/schema.js"));
const { runStaticGates } = await import(path.join(root, "core/dist/gates/index.js"));
const { openSession } = await import(path.join(root, "core/dist/render/index.js"));

const raw = {
  irVersion: "0.1.0",
  tier: "score",
  meta: { title: "Keyframe benchmark", register: "brand-film", width: 640, height: 360, fps: 30, seed: 1, safeZone: "none" },
  style: {
    name: "benchmark",
    palette: { bg: "#050505", surface: "#e8e8e8", primary: "#d11735", accent: "#ff9b54", text: "#ffffff", textDim: "#b8b8b8", onMedia: "#ffffff" },
    fonts: { display: "Space Grotesk", text: "Inter", mono: "JetBrains Mono" },
    displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0,
  },
  scenes: [{
    id: "track-test",
    reason: "proves exact frame-addressed transform evaluation",
    durationMs: 1500,
    background: "bg",
    elements: [{ type: "shape", id: "card", role: "hero", shape: "rect", color: "surface", opacity: 1, position: { anchor: "center", x: 50, y: 50 }, width: 20, height: 20, radius: 2 }],
    choreography: [{
      id: "card-turn",
      target: "card",
      preset: "keyframe-track",
      at: { after: "scene-start", offsetMs: 0 },
      override: { reason: "benchmark requires exact authored frame states" },
      keyframes: [
        { frame: 0, x: 0, y: 0, scale: 1, rotationXDeg: 0, rotationYDeg: -20, rotationZDeg: 0, opacity: 0.2, perspectivePx: 900, origin: "center" },
        { frame: 15, x: 5, y: -2, scale: 1.1, rotationXDeg: 4, rotationYDeg: 5, rotationZDeg: 2, opacity: 0.7, perspectivePx: 900, origin: "center", easing: "move-through" },
        { frame: 30, x: 10, y: -5, scale: 1.2, rotationXDeg: 8, rotationYDeg: 0, rotationZDeg: 4, opacity: 1, perspectivePx: 900, origin: "center", easing: "enter-settle" },
      ],
    }],
    transitionOut: { type: "cut", duration: "standard" },
  }],
};

const parsed = validateScore(raw);
if (!parsed.ok) throw new Error(`benchmark score invalid: ${JSON.stringify(parsed.issues)}`);
const findings = runStaticGates(parsed.score).filter((f) => f.severity !== "P3");
if (findings.length) throw new Error(`benchmark score failed gates: ${JSON.stringify(findings)}`);

const expected = [
  { frame: 0, x: 0, y: 0, scale: 1, rotationX: 0, rotationY: -20, rotation: 0, opacity: 0.2, transformPerspective: 900 },
  { frame: 15, x: 32, y: -7.2, scale: 1.1, rotationX: 4, rotationY: 5, rotation: 2, opacity: 0.7, transformPerspective: 900 },
  { frame: 30, x: 64, y: -18, scale: 1.2, rotationX: 8, rotationY: 0, rotation: 4, opacity: 1, transformPerspective: 900 },
];
const work = path.join(here, ".work");
mkdirSync(work, { recursive: true });
const session = await openSession(parsed.score, here, work);
const rows = [];
try {
  // Deliberately seek backward as well as forward: render workers and frame
  // probes are random-access, not guaranteed to visit frames monotonically.
  for (const want of [expected[2], expected[0], expected[1]]) {
    const got = await session.page.evaluate(async (frame) => {
      await window.__chitra.seek((frame / 30) * 1000);
      const el = document.querySelector("#track-test--card");
      const read = (prop) => Number(window.gsap.getProperty(el, prop));
      return {
        x: read("x"), y: read("y"), scale: read("scale"),
        rotationX: read("rotationX"), rotationY: read("rotationY"), rotation: read("rotation"),
        opacity: read("opacity"), transformPerspective: read("transformPerspective"),
      };
    }, want.frame);
    for (const [key, value] of Object.entries(want)) {
      if (key === "frame") continue;
      if (Math.abs(got[key] - value) > 0.02)
        throw new Error(`frame ${want.frame} ${key}: expected ${value}, got ${got[key]}`);
    }
    rows.push(`| ${want.frame} | ${got.x.toFixed(2)} | ${got.y.toFixed(2)} | ${got.rotationY.toFixed(2)}° | ${got.opacity.toFixed(2)} | pass |`);
  }
  const a = await session.seekAndCapture(500);
  const b = await session.seekAndCapture(500);
  const hashA = createHash("sha256").update(a).digest("hex");
  const hashB = createHash("sha256").update(b).digest("hex");
  if (hashA !== hashB) throw new Error(`same-frame capture mismatch: ${hashA} != ${hashB}`);

  const report = `# Frame-addressed transform benchmark — 2026-07-16

ADR-0013 browser-level verification at 640×360, 30fps. The harness seeks the
compiled page to authored frames and reads GSAP's evaluated transform state.

| Frame | X px | Y px | Rotation Y | Opacity | Result |
|---:|---:|---:|---:|---:|:---:|
${rows.join("\n")}

- Exact keyframe states: **3/3 passed**
- Random seek order: **30 → 0 → 15 passed**
- Repeated frame-15 PNG capture: **byte-identical** (${hashA.slice(0, 16)}…)
- Static quality gates: **0 P1/P2 findings**

Reproduce: \`cd core && npm run build && cd .. && node benchmarks/keyframe-track/run.mjs\`.
`;
  writeFileSync(path.join(here, "results.md"), report);
  console.log("✔ exact keyframe states 3/3; repeated capture byte-identical");
} finally {
  await session.close();
  rmSync(work, { recursive: true, force: true });
  rmSync(path.join(here, ".chitra-page.html"), { force: true });
}
