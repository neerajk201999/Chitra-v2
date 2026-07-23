#!/usr/bin/env node
/** ADR-0043 executable proof: an offline vector animation must survive
 * schema → compiler → random browser seeks with exact repeated pixels. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { launchBrowser } from "../../core/dist/browser/index.js";
import { compile } from "../../core/dist/compile/index.js";
import { validateScore } from "../../core/dist/ir/schema.js";
import { openSession, renderInputFiles, sceneHash, scoreHash } from "../../core/dist/render/index.js";

const require = createRequire(new URL("../../core/package.json", import.meta.url));
const sharp = require("sharp");
const check = process.argv.includes("--check");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-lottie-"));
const outside = mkdtempSync(path.join(os.tmpdir(), "chitra-lottie-outside-"));
mkdirSync(path.join(work, "assets"));
const source = path.join(work, "assets/motion.json");

const animation = {
  v: "5.13.0", fr: 30, ip: 0, op: 31, w: 200, h: 100,
  nm: "seek proof", ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: "moving dot", sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [
        { t: 0, s: [30, 50, 0], h: 1 },
        { t: 15, s: [100, 50, 0], h: 1 },
        { t: 30, s: [170, 50, 0], h: 1 },
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      { ty: "el", d: 1, s: { a: 0, k: [28, 28] }, p: { a: 0, k: [0, 0] }, nm: "dot" },
      { ty: "fl", c: { a: 0, k: [0.27, 0.84, 1, 1] }, o: { a: 0, k: 100 }, r: 1, nm: "fill" },
    ],
    ip: 0, op: 31, st: 0, bm: 0,
  }],
};
const sourceBytes = Buffer.from(JSON.stringify(animation));
writeFileSync(source, sourceBytes);

const raw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Lottie proof", register: "brand-film", width: 320, height: 320, fps: 30, seed: 9, safeZone: "none" },
  style: {
    name: "proof",
    palette: { bg: "#000000", surface: "#111111", primary: "#ffffff", accent: "#45d7ff", text: "#ffffff", textDim: "#999999", onMedia: "#ffffff" },
    fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" },
    displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0,
  },
  scenes: [{
    id: "import", reason: "Prove offline source-frame addressing and local composition",
    durationMs: 1000, background: "bg",
    elements: [
      {
        type: "lottie", id: "motion", role: "hero", src: "assets/motion.json",
        fit: "contain", position: { anchor: "center" }, width: 100, height: 100,
        playback: { startMs: 0, durationMs: 1000, startFrame: 0, endFrame: 30, iterations: 1, direction: "normal" },
        compositing: {
          opacity: 1, blendMode: "screen", isolation: true,
          filters: [{ kind: "saturate", amount: 1.1 }],
          clip: { kind: "inset", top: 2, right: 2, bottom: 2, left: 2, radius: 8 },
        },
      },
      {
        type: "lottie", id: "reverse", role: "support", src: "assets/motion.json",
        fit: "contain", position: { anchor: "top-left" }, width: 1, height: 1,
        playback: { startMs: 0, durationMs: 1000, startFrame: 0, endFrame: 30, iterations: 1, direction: "reverse" },
        compositing: { opacity: 0, blendMode: "normal", isolation: false, filters: [] },
      },
      {
        type: "lottie", id: "alternate", role: "support", src: "assets/motion.json",
        fit: "contain", position: { anchor: "top-left" }, width: 1, height: 1,
        playback: { startMs: 0, durationMs: 1000, startFrame: 0, endFrame: 30, iterations: 2, direction: "alternate" },
        compositing: { opacity: 0, blendMode: "normal", isolation: false, filters: [] },
      },
      {
        type: "group", id: "local", role: "hero", children: ["motion"],
        position: { anchor: "center" }, width: 75, height: 100, overflow: "hidden",
      },
    ],
    choreography: [], transitionOut: { type: "cut", duration: "standard" },
  }],
};

const parsed = validateScore(raw);
assert(parsed.ok, `Lottie fixture must validate: ${JSON.stringify(parsed.issues)}`);
const score = parsed.score;
assert(renderInputFiles(score, work).some((file) => file.endsWith("/assets/motion.json")));
const html = compile(score, work).html;
assert.equal(html, compile(score, work).html, "compiled imported animation must repeat byte-identically");
assert(
  html.includes('"undefined"!=typeof document&&"undefined"!=typeof navigator'),
  "compiled page must include the pinned Lottie SVG runtime",
);
assert.match(html, /data-lottie="import--motion"/);
assert(!html.includes("assets/motion.json"), "compiled page must not fetch Lottie JSON by path");
assert(html.includes("clip-path:inset(2% 2% 2% 2% round 8%)"), "typed clipping must compose with Lottie");

const withoutLottie = structuredClone(raw);
withoutLottie.scenes[0].elements = [{
  type: "shape", id: "plain", role: "hero", shape: "rect", color: "accent",
  position: { anchor: "center" }, width: 20, height: 20, radius: 0,
}];
const noLottie = validateScore(withoutLottie);
assert(noLottie.ok);
assert(
  !compile(noLottie.score, work).html.includes('"undefined"!=typeof document&&"undefined"!=typeof navigator'),
  "Scores without Lottie must not pay for its runtime",
);

const brokenPage = path.join(work, "broken-runtime.html");
writeFileSync(
  brokenPage,
  html.replace(
    '"undefined"!=typeof document&&"undefined"!=typeof navigator',
    '(()=>{throw new Error("injected Lottie runtime failure")})()',
  ),
);
const failureBrowser = await launchBrowser({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await failureBrowser.newPage();
  await page.goto(`file://${brokenPage}`, { waitUntil: "load" });
  const readiness = await page.evaluate(() => window.__chitra.ready());
  assert.match(readiness.lottieError, /Lottie load failed/, "runtime initialization failure must block readiness");
} finally {
  await failureBrowser.close();
}

const before = sceneHash(score, 0, work);
const releaseBefore = scoreHash(score, work);
writeFileSync(source, Buffer.concat([sourceBytes, Buffer.from("\n")]));
assert.notEqual(sceneHash(score, 0, work), before, "Lottie bytes must invalidate scene identity");
assert.notEqual(scoreHash(score, work), releaseBefore, "Lottie bytes must invalidate release identity");
writeFileSync(source, sourceBytes);

const invalidRange = structuredClone(raw);
invalidRange.scenes[0].elements[0].playback.endFrame = 31;
assert.throws(() => compile(validateScore(invalidRange).score, work), /outside/);
const late = structuredClone(raw);
late.scenes[0].elements[0].playback.startMs = 1000;
assert.equal(validateScore(late).ok, false, "playback cannot start after its scene");
const traversal = structuredClone(raw);
traversal.scenes[0].elements[0].src = "../motion.json";
assert.equal(validateScore(traversal).ok, false, "Lottie source traversal must fail schema validation");
const outsideSource = path.join(outside, "motion.json");
writeFileSync(outsideSource, sourceBytes);
symlinkSync(outsideSource, path.join(work, "assets/escaped.json"));
const escaped = structuredClone(raw);
escaped.scenes[0].elements[0].src = "assets/escaped.json";
assert.throws(() => compile(validateScore(escaped).score, work), /escapes project through a symlink/);

const expression = structuredClone(animation);
expression.layers[0].ks.r.x = "time * 20";
writeFileSync(source, JSON.stringify(expression));
assert.throws(() => compile(score, work), /expressions are unsupported/);
const textLayer = structuredClone(animation);
textLayer.layers[0].ty = 5;
writeFileSync(source, JSON.stringify(textLayer));
assert.throws(() => compile(score, work), /text layers are unsupported/);
const external = structuredClone(animation);
external.assets = [{ id: "image_0", w: 20, h: 20, u: "images/", p: "remote.png" }];
writeFileSync(source, JSON.stringify(external));
assert.throws(() => compile(score, work), /external image assets are unsupported/);
writeFileSync(source, sourceBytes);

const session = await openSession(score, work, path.join(work, "cache"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const centroidX = async (png) => {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0, count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i + 2] > 120 && data[i + 1] > 80) { sum += x; count++; }
    }
  }
  assert(count > 50, "Lottie frame must paint the vector subject");
  return sum / count;
};
try {
  const frames = [];
  const states = [];
  for (const ms of [1000, 0, 500, 500]) {
    const png = await session.seekAndCapture(ms);
    frames.push(png);
    states.push(await session.page.evaluate(() => window.__chitra.lottieState("import--motion")));
  }
  assert.deepEqual(states.map((value) => Math.round(value)), [30, 0, 15, 15]);
  const playbackStates = [];
  for (const ms of [0, 250, 500, 750, 1000]) {
    await session.page.evaluate((time) => window.__chitra.seek(time), ms);
    playbackStates.push(await session.page.evaluate(() => [
      window.__chitra.lottieState("import--reverse"),
      window.__chitra.lottieState("import--alternate"),
    ]));
  }
  assert.deepEqual(
    playbackStates.map((pair) => pair.map((value) => Math.round(value))),
    [[30, 0], [23, 15], [15, 30], [8, 15], [0, 0]],
    "reverse and alternate iteration arithmetic must be scene-time deterministic",
  );
  assert.equal(sha(frames[2]), sha(frames[3]), "repeated random seek must produce byte-identical PNG");
  const [endX, startX, middleX] = await Promise.all(frames.slice(0, 3).map(centroidX));
  assert(startX < middleX - 40 && middleX < endX - 40, `vector subject must move across source frames (${startX.toFixed(1)} → ${middleX.toFixed(1)} → ${endX.toFixed(1)})`);
  const geometry = await session.page.evaluate(() => {
    const node = document.querySelector("#import--motion");
    const box = node.getBoundingClientRect();
    const appearance = getComputedStyle(node.querySelector(":scope > .comp"));
    return { width: box.width, height: box.height, blend: appearance.mixBlendMode, filter: appearance.filter };
  });
  assert(Math.abs(geometry.width - 240) < 0.1 && Math.abs(geometry.height - 320) < 0.1);
  assert.equal(geometry.blend, "screen");
  assert.match(geometry.filter, /saturate\(1\.1\)/);

  if (!check) {
    writeFileSync(path.join(import.meta.dirname, "results.md"), `# Seekable Lottie import benchmark — 2026-07-23

- Offline vector JSON + pinned SVG runtime: **pass**
- Random seek order: **30 → 0 → 15 → 15**
- Painted centroid: **${startX.toFixed(1)} → ${middleX.toFixed(1)} → ${endX.toFixed(1)} px**
- Nested local geometry: **240 × 320 px**
- Imported animation + typed compositing: **pass**
- Reverse + two-iteration alternate playback: **pass**
- Traversal/symlink escape, conditional-runtime, and failed-runtime checks: **pass**
- Source-byte cache invalidation: **pass**
- Source-byte release-identity invalidation: **pass**
- Repeated source frame: **byte-identical** (${sha(frames[2]).slice(0, 16)}…)
- Expression/text/external-asset/range/time defects: **rejected**

This proves Chitra's bounded vector-only Lottie JSON contract. It does not prove
dotLottie, Rive, expressions, external image/font assets, or all After Effects
features.
`);
  }
  console.log(`✔ lottie import: random 30→0→15→15, centroid ${startX.toFixed(1)}→${middleX.toFixed(1)}→${endX.toFixed(1)}, repeat exact`);
} finally {
  await session.close();
  rmSync(work, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}
