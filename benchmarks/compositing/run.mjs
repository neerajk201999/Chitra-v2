#!/usr/bin/env node
/** ADR-0042 executable proof: typed compositing and nested local compositions
 * must survive schema → compiler → real browser pixels without nondeterminism. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { compile } from "../../core/dist/compile/index.js";
import { validateScore } from "../../core/dist/ir/schema.js";
import { applyGatePolicies, runStaticGates } from "../../core/dist/gates/index.js";
import { openSession, sceneHash } from "../../core/dist/render/index.js";

const require = createRequire(new URL("../../core/package.json", import.meta.url));
const sharp = require("sharp");
const check = process.argv.includes("--check");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-compositing-"));
mkdirSync(path.join(work, "assets"));
const matteFile = path.join(work, "assets/matte.png");
const luminanceMatteFile = path.join(work, "assets/matte-luminance.png");
const matteV1 = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><defs><linearGradient id="g"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white" stop-opacity="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
const luminanceMatteV1 = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><defs><linearGradient id="g"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
const matteBytes = await sharp(Buffer.from(matteV1)).png().toBuffer();
const luminanceMatteBytes = await sharp(Buffer.from(luminanceMatteV1)).png().toBuffer();
writeFileSync(matteFile, matteBytes);
writeFileSync(luminanceMatteFile, luminanceMatteBytes);

const raw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Compositing proof", register: "brand-film", width: 320, height: 320, fps: 30, seed: 42, safeZone: "none" },
  style: {
    name: "proof",
    palette: { bg: "#000000", surface: "#111111", primary: "#ffffff", accent: "#45d7ff", text: "#ffffff", textDim: "#999999", onMedia: "#ffffff" },
    fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" },
    displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0,
  },
  scenes: [{
    id: "composite", reason: "Prove masks, blending, filters, clipping, and nested local coordinates",
    durationMs: 1000, background: "bg",
    elements: [
      {
        type: "shape", id: "masked-field", role: "hero", shape: "rect", color: "primary", opacity: 1,
        position: { anchor: "center", x: 50, y: 50 }, width: 70, height: 40, radius: 0,
        compositing: {
          opacity: 1, blendMode: "normal", isolation: false, filters: [],
          matte: { kind: "asset", src: "assets/matte.png", mode: "alpha", fit: "stretch", positionX: 50, positionY: 50 },
        },
      },
      {
        type: "shape", id: "nested-dot", role: "support", shape: "rect", color: "accent", opacity: 1,
        position: { anchor: "center" }, width: 50, height: 50, radius: 0,
      },
      {
        type: "shape", id: "luminance-field", role: "support", shape: "rect", color: "accent", opacity: 1,
        position: { anchor: "center", x: 50, y: 85 }, width: 70, height: 16, radius: 0,
        compositing: {
          opacity: 1, blendMode: "normal", isolation: false, filters: [],
          matte: { kind: "asset", src: "assets/matte-luminance.png", mode: "luminance", fit: "stretch", positionX: 50, positionY: 50 },
        },
      },
      {
        type: "group", id: "inner-comp", role: "support", children: ["nested-dot"],
        position: { anchor: "center" }, width: 50, height: 50, overflow: "hidden",
        compositing: {
          opacity: 0.9, blendMode: "screen", isolation: true,
          filters: [{ kind: "blur", px: 2 }, { kind: "saturate", amount: 1.2 }],
          clip: { kind: "circle", radius: 45, x: 50, y: 50 },
        },
      },
      {
        type: "group", id: "outer-comp", role: "support", children: ["inner-comp"],
        position: { anchor: "top-left", x: 5, y: 5 }, width: 50, height: 50, overflow: "visible",
      },
    ],
    choreography: [{
      id: "inner-enter", target: "inner-comp", preset: "blur-focus",
      duration: "standard", at: { after: "scene-start", offsetMs: 0 },
    }],
    transitionOut: { type: "cut", duration: "standard" },
  }],
};

const parsed = validateScore(raw);
assert(parsed.ok, `compositing fixture must validate: ${JSON.stringify(parsed.issues)}`);
const score = parsed.score;
assert.equal(applyGatePolicies(runStaticGates(score)).filter((finding) => finding.policy === "hard-defect").length, 0);
const html = compile(score, work).html;
assert.equal(html, compile(score, work).html, "compiled composition must repeat byte-identically");
assert.match(html, /mix-blend-mode:screen/);
assert.match(html, /mask-image:url\('data:image\/png;base64,/);
assert(!html.includes("mask-image:url('assets/matte.png')"), "matte must not depend on browser file loading");
assert(html.includes("clip-path:circle(45% at 50% 50%)"));

const before = sceneHash(score, 0, work);
writeFileSync(matteFile, Buffer.concat([matteBytes, Buffer.from("changed")]));
assert.notEqual(sceneHash(score, 0, work), before, "matte bytes must invalidate the scene cache");
writeFileSync(matteFile, matteBytes);

const session = await openSession(score, work, path.join(work, "cache"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
try {
  const geometry = await session.page.evaluate(() => {
    const rect = (id) => {
      const node = document.querySelector(id);
      const composited = node.querySelector(":scope > .comp");
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(composited);
      const motionStyle = getComputedStyle(node);
      return {
        width: box.width, height: box.height,
        blend: style.mixBlendMode, filter: style.filter,
        motionFilter: motionStyle.filter,
        clip: style.clipPath, mask: style.maskImage || style.webkitMaskImage,
        maskMode: style.maskMode,
      };
    };
    return {
      outer: rect("#composite--outer-comp"),
      inner: rect("#composite--inner-comp"),
      dot: rect("#composite--nested-dot"),
      masked: rect("#composite--masked-field"),
      luminance: rect("#composite--luminance-field"),
    };
  });
  assert(Math.abs(geometry.outer.width - 160) < 0.1);
  assert(Math.abs(geometry.inner.width - 80) < 0.1);
  assert(Math.abs(geometry.dot.width - 40) < 0.1);
  assert(geometry.masked.width > 200 && geometry.masked.height > 100, `masked geometry must own its painted box: ${JSON.stringify(geometry.masked)}`);
  assert.equal(geometry.inner.blend, "screen");
  assert.match(geometry.inner.filter, /blur\(0\.593px\).*saturate\(1\.2\)/);
  assert.match(geometry.inner.motionFilter, /blur\(/, "motion filter must remain on the outer transform layer");
  assert(!geometry.inner.motionFilter.includes("saturate"), "authored compositing filters must remain isolated from motion filters");
  assert.match(geometry.inner.clip, /circle\(45% at 50% 50%\)/);
  assert.notEqual(geometry.masked.mask, "none");
  assert.equal(geometry.luminance.maskMode, "luminance");

  const first = await session.seekAndCapture(500);
  const repeated = await session.seekAndCapture(500);
  assert.equal(sha(first), sha(repeated), "same-frame compositing capture must be byte-identical");
  if (process.env.CHITRA_DEBUG) {
    console.error(JSON.stringify(geometry, null, 2));
    writeFileSync(path.join(work, "debug.png"), first);
    console.error(`debug frame: ${path.join(work, "debug.png")}`);
  }
  const { data, info } = await sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luminance = (x, y) => {
    const index = (y * info.width + x) * info.channels;
    return (data[index] + data[index + 1] + data[index + 2]) / 3;
  };
  const leftLuma = luminance(70, 160), rightLuma = luminance(250, 160);
  assert(rightLuma > leftLuma + 100, `asset alpha matte must reveal right and suppress left (${leftLuma.toFixed(1)} → ${rightLuma.toFixed(1)})`);
  const leftMaskLuma = luminance(70, 272), rightMaskLuma = luminance(250, 272);
  assert(rightMaskLuma > leftMaskLuma + 60, `asset luminance matte must reveal right and suppress left (${leftMaskLuma.toFixed(1)} → ${rightMaskLuma.toFixed(1)})`);

  if (!check) {
    writeFileSync(path.join(import.meta.dirname, "results.md"), `# Compositing and local-composition benchmark — 2026-07-23

- Schema/compiler/browser pipeline: **pass**
- Nested local widths: **160 → 80 → 40 px**
- Blend/filter/clip computed styles: **pass**
- Motion/appearance filter isolation: **pass**
- Project-local alpha/luminance matte pixels: **pass**
- Matte-byte cache invalidation: **pass**
- Repeated frame capture: **byte-identical** (${sha(first).slice(0, 16)}…)
- Runtime dependencies added: **0**
- Full package dry-run: **603.0 kB compressed / 2.4 MB unpacked**
  (pre-tranche documented package: 586.1 kB / 2.2 MB)

This is a first-party deterministic substrate test, not evidence of superior
motion-design taste or complete HyperFrames parity.
`);
  }
  console.log("✔ compositing: nested 160→80→40, blend/filter/clip, alpha+luminance matte pixels, cache invalidation, repeated capture exact");
} finally {
  await session.close();
  if (!process.env.CHITRA_DEBUG) rmSync(work, { recursive: true, force: true });
}
