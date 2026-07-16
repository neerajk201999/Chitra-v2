#!/usr/bin/env node
/** ADR-0015 executable benchmark: generated facts must survive decomposition
 *  without semantic invention, and repeated analysis must be deterministic. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const check = process.argv.includes("--check");
const { decomposeReference } = await import(path.join(root, "core/dist/reference/decompose.js"));

const work = mkdtempSync(path.join(os.tmpdir(), "chitra-reference-benchmark-"));
const fixture = path.join(work, "three-shots.mkv");
const evidence = path.join(work, "evidence");

function run(name, args) {
  const result = spawnSync(name, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr.slice(-800)}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rgb(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

function near(actual, expected, tolerance = 48) {
  const a = rgb(actual), b = rgb(expected);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= tolerance;
}

try {
  run("ffmpeg", [
    "-y", "-v", "error",
    "-f", "lavfi", "-i", "color=c=#ff0000:s=160x90:r=10:d=1",
    "-f", "lavfi", "-i", "color=c=#0000ff:s=160x90:r=10:d=1",
    "-f", "lavfi", "-i", "color=c=#00ff00:s=160x90:r=10:d=1",
    "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]",
    "-map", "[v]", "-c:v", "ffv1", "-pix_fmt", "yuv444p", fixture,
  ]);

  const options = { artifactDir: work, evidenceDir: evidence, sceneThreshold: 0.3, sampleFps: 4, sampleWidth: 160, maxSamples: 10 };
  const first = await decomposeReference(fixture, options);
  const evidenceHashes = () => readdirSync(evidence).filter((file) => /^shot-\d+\.png$/.test(file)).sort()
    .map((file) => createHash("sha256").update(readFileSync(path.join(evidence, file))).digest("hex"));
  const firstEvidence = evidenceHashes();
  const second = await decomposeReference(fixture, options);
  assert(JSON.stringify(first) === JSON.stringify(second), "repeated decomposition changed Style DNA JSON");
  assert(firstEvidence.length === 3, `expected 3 evidence frames, got ${firstEvidence.length}`);
  assert(JSON.stringify(firstEvidence) === JSON.stringify(evidenceHashes()), "repeated decomposition changed evidence frames");
  assert(first.shots.length === 3, `expected 3 shots, got ${first.shots.length}`);
  assert(first.analyzer.sampleCount <= first.analyzer.maxSamples, `sample bound exceeded: ${first.analyzer.sampleCount} > ${first.analyzer.maxSamples}`);
  assert(Math.abs(first.shots[0].endMs - 1000) <= 100, `first cut was ${first.shots[0].endMs}ms`);
  assert(Math.abs(first.shots[1].endMs - 2000) <= 100, `second cut was ${first.shots[1].endMs}ms`);
  for (const expected of ["#ff0000", "#0000ff", "#00ff00"])
    assert(first.palette.dominantColors.some((color) => near(color, expected)), `palette missed ${expected}: ${first.palette.dominantColors.join(", ")}`);

  const cutEnergy = first.motion.windows.filter((w) => w.containsCut).map((w) => w.energy);
  const holdEnergy = first.motion.windows.filter((w) => !w.containsCut).map((w) => w.energy);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert(cutEnergy.length === 2, `expected 2 cut windows, got ${cutEnergy.length}`);
  assert(mean(cutEnergy) > mean(holdEnergy) + 0.1, "cut windows did not carry higher motion energy than static holds");
  assert(Object.entries(first.semanticReview).filter(([key]) => key !== "note").every(([, value]) => value === "unmeasured"), "semantic fields were inferred without evidence");

  const report = `# Reference Decomposer benchmark — 2026-07-16

ADR-0015 verification against a generated 3-second, three-shot lossless film.

- Repeated Style DNA JSON: **byte-identical**
- Repeated evidence frames: **3/3 byte-identical**
- Bounded samples: **${first.analyzer.sampleCount}/${first.analyzer.maxSamples}**
- Shot boundaries: **${first.shots.map((shot) => shot.endMs).slice(0, -1).join("ms, ")}ms** (expected 1000ms, 2000ms)
- Detected palette: **${first.palette.dominantColors.join(", ")}**
- Mean cut-window energy: **${mean(cutEnergy).toFixed(4)}**
- Mean static-hold energy: **${mean(holdEnergy).toFixed(4)}**
- Semantic review fields: **all unmeasured**

Reproduce: \`cd core && npm run build && cd .. && node benchmarks/reference-decomposer/run.mjs\`.
`;
  if (!check) writeFileSync(path.join(here, "results.md"), report);
  console.log("✔ reference decomposition: 3 shots, 2 cuts, palette/motion facts, deterministic JSON");
} finally {
  rmSync(work, { recursive: true, force: true });
}
