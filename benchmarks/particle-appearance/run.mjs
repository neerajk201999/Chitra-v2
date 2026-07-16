#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { compile } from "../../core/dist/compile/index.js";
import { validateScore } from "../../core/dist/ir/schema.js";
import { openSession } from "../../core/dist/render/index.js";

const raw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Particle appearance proof", register: "brand-film", width: 320, height: 320, fps: 30, seed: 25, safeZone: "none" },
  style: { name: "proof", palette: { bg: "#050607", surface: "#151719", primary: "#d02040", accent: "#4aa8a0", text: "#f4f4f2", textDim: "#9a9e9d", onMedia: "#ffffff" }, fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" }, displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0 },
  scenes: [{ id: "mark", reason: "Prove bounded irregular luminous dots in a real browser", durationMs: 1000, background: "bg", elements: [{ type: "particles", id: "dots", role: "hero", formation: "custom", points: [{ x: 20, y: 20, size: 0.5, opacity: 0.25 }, { x: 80, y: 20, size: 1.25, opacity: 0.8 }, { x: 80, y: 80 }, { x: 20, y: 80, size: 0.75, opacity: 0.55 }], color: "text", count: 4, dotSize: 12, glow: 2.25, position: { anchor: "center", x: 50, y: 50 }, width: 50, height: 50 }], choreography: [], transitionOut: { type: "cut", duration: "standard" } }],
};
const parsed = validateScore(raw);
assert(parsed.ok, "particle appearance fixture must validate");
const score = parsed.score;
const html = compile(score).html;
assert(html.includes("opacity:0.250"));
assert(html.includes("opacity:0.800"));
assert.equal(html, compile(score).html, "compiled appearance must repeat byte-identically");

const work = mkdtempSync(path.join(os.tmpdir(), "chitra-particle-appearance-"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const session = await openSession(score, work, path.join(work, "cache"));
try {
  const first = await session.seekAndCapture(500), repeated = await session.seekAndCapture(500);
  assert.equal(sha(first), sha(repeated), "browser capture must repeat byte-identically");
  console.log("✔ particle appearance: bounded size/opacity/glow compile deterministically and repeated browser capture is exact");
} finally {
  await session.close();
  rmSync(work, { recursive: true, force: true });
}
