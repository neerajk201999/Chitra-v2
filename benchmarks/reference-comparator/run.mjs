#!/usr/bin/env node
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { compareReference } from "../../core/dist/reference/compare.js";

const root = path.resolve(import.meta.dirname, "../..");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-comparator-bench-"));
const run = (name, args) => {
  const result = spawnSync(name, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr}`);
};
const make = (out, color, size = "64x64", fps = 6, duration = 2) => run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=${color}:s=${size}:r=${fps}:d=${duration}`, "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${duration}`, "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out]);
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

try {
  const reference = path.join(work, "reference.mp4"), identical = path.join(work, "identical.mp4"), drift = path.join(work, "drift.mp4"), normalized = path.join(work, "normalized.mp4");
  make(reference, "red"); copyFileSync(reference, identical); make(drift, "blue"); make(normalized, "blue", "80x64", 8, 2.5);
  const evidence = path.join(work, "exact-evidence");
  const first = await compareReference(reference, identical, { mode: "exact", evidenceDir: evidence, artifactDir: work, maxFrames: 20 });
  const diffHash = hash(path.join(evidence, "diff-000000.png"));
  const second = await compareReference(reference, identical, { mode: "exact", evidenceDir: evidence, artifactDir: work, maxFrames: 20 });
  assert.deepEqual(second, first);
  assert.equal(hash(path.join(evidence, "diff-000000.png")), diffHash);
  assert.equal(first.alignment.exhaustive, true);
  assert.equal(first.frames.length, 12);
  assert.equal(first.visual.meanAbsoluteError, 0);
  assert.equal(first.visual.meanGlobalLumaSsim, 1);
  assert.equal(first.audio.status, "compared");
  if (first.audio.status === "compared") assert.equal(first.audio.envelopeCorrelation, 1);

  const changed = await compareReference(reference, drift, { mode: "exact", evidenceDir: path.join(work, "drift-evidence"), artifactDir: work, maxFrames: 20 });
  assert(changed.visual.meanAbsoluteError > 0.1);
  assert(changed.visual.meanGlobalLumaSsim < 1);
  await assert.rejects(compareReference(reference, normalized, { mode: "exact", evidenceDir: path.join(work, "bad"), maxFrames: 20 }), /equal dimensions/);
  const sampled = await compareReference(reference, normalized, { mode: "normalized", evidenceDir: path.join(work, "normalized-evidence"), artifactDir: work, samples: 5 });
  assert.equal(sampled.alignment.comparedFrames, 5);
  assert.equal(sampled.alignment.exhaustive, false);
  assert.equal(sampled.alignment.spatial, "contain-letterbox");

  const cliOut = path.join(work, "cli.json");
  run(process.execPath, [path.join(root, "core/dist/cli/index.js"), "compare", reference, identical, "-o", cliOut, "--evidence", path.join(work, "cli-evidence"), "--max-frames", "20"]);
  assert.equal(JSON.parse(readFileSync(cliOut, "utf8")).visual.meanAbsoluteError, 0);
  console.log("✔ reference comparator: exact 12/12, deterministic diffs/report, visual drift caught, normalized mode honest, audio envelope + CLI green");
} finally {
  rmSync(work, { recursive: true, force: true });
}
