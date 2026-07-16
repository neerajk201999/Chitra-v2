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
const makeLocalized = (out) => run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=red:s=64x64:r=6:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-vf", "drawbox=x=0:y=0:w=24:h=64:color=blue:t=fill", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out]);
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

try {
  const reference = path.join(work, "reference.mp4"), identical = path.join(work, "identical.mp4"), drift = path.join(work, "drift.mp4"), localized = path.join(work, "localized.mp4"), normalized = path.join(work, "normalized.mp4");
  make(reference, "red"); copyFileSync(reference, identical); make(drift, "blue"); makeLocalized(localized); make(normalized, "blue", "80x64", 8, 2.5);
  const evidence = path.join(work, "exact-evidence");
  const first = await compareReference(reference, identical, { mode: "exact", evidenceDir: evidence, artifactDir: work, maxFrames: 20 });
  const diffHash = hash(path.join(evidence, "diff-000000.png"));
  const second = await compareReference(reference, identical, { mode: "exact", evidenceDir: evidence, artifactDir: work, maxFrames: 20 });
  assert.deepEqual(second, first);
  assert.equal(hash(path.join(evidence, "diff-000000.png")), diffHash);
  assert.equal(first.alignment.exhaustive, true);
  assert.equal(first.frames.length, 12);
  assert.deepEqual(first.regions, []);
  assert.equal(first.evidence.differenceImages, 12);
  assert.equal(first.visual.meanAbsoluteError, 0);
  assert.equal(first.visual.meanGlobalLumaSsim, 1);
  assert.equal(first.audio.status, "compared");
  if (first.audio.status === "compared") assert.equal(first.audio.envelopeCorrelation, 1);

  const changed = await compareReference(reference, drift, { mode: "exact", evidenceDir: path.join(work, "drift-evidence"), artifactDir: work, maxFrames: 20 });
  assert(changed.visual.meanAbsoluteError > 0.1);
  assert(changed.visual.meanGlobalLumaSsim < 1);
  const regionOptions = {
    mode: "exact", evidenceDir: path.join(work, "localized-evidence"), artifactDir: work, maxFrames: 20,
    regions: [{ id: "left", x: 0, y: 0, width: 16, height: 64 }, { id: "right", x: 48, y: 0, width: 16, height: 64, startPair: 2, endPair: 4 }],
  };
  const regional = await compareReference(reference, localized, regionOptions);
  assert(regional.regions[0].visual.meanAbsoluteError > 0.1);
  assert.equal(regional.regions[1].visual.meanAbsoluteError, 0);
  assert.deepEqual(regional.regions[1].pairRange, { start: 2, endInclusive: 4 });
  assert.equal(regional.evidence.differenceImages, 27);
  assert.equal(regional.regions[0].frames[0].differenceImage, "localized-evidence/regions/left/diff-000000.png");
  assert.equal(regional.regions[1].frames[0].differenceImage, "localized-evidence/regions/right/diff-000002.png");
  const regionHash = hash(path.join(work, regional.regions[0].frames[0].differenceImage));
  assert.deepEqual(await compareReference(reference, localized, regionOptions), regional);
  assert.equal(hash(path.join(work, regional.regions[0].frames[0].differenceImage)), regionHash);
  await assert.rejects(compareReference(reference, localized, { ...regionOptions, regions: [{ id: "bad", x: 63, y: 0, width: 2, height: 64 }] }), /exceeds aligned/);
  await assert.rejects(compareReference(reference, localized, { ...regionOptions, regions: [{ id: "bad", x: 0, y: 0, width: 1, height: 1, startPair: 4, endPair: 2 }] }), /pair range/);
  await assert.rejects(compareReference(reference, localized, { ...regionOptions, regions: [{ id: "same", x: 0, y: 0, width: 1, height: 1 }, { id: "same", x: 1, y: 1, width: 1, height: 1 }] }), /Duplicate region id/);
  await assert.rejects(compareReference(reference, normalized, { mode: "exact", evidenceDir: path.join(work, "bad"), maxFrames: 20 }), /equal dimensions/);
  const sampled = await compareReference(reference, normalized, { mode: "normalized", evidenceDir: path.join(work, "normalized-evidence"), artifactDir: work, samples: 5, regions: [{ id: "normalized-canvas", x: 0, y: 0, width: 64, height: 64, startPair: 1, endPair: 3 }] });
  assert.equal(sampled.alignment.comparedFrames, 5);
  assert.equal(sampled.alignment.exhaustive, false);
  assert.equal(sampled.alignment.spatial, "contain-letterbox");
  assert.equal(sampled.regions[0].frames.length, 3);
  assert.equal(sampled.evidence.differenceImages, 8);

  const cliOut = path.join(work, "cli.json");
  run(process.execPath, [path.join(root, "core/dist/cli/index.js"), "compare", reference, localized, "-o", cliOut, "--evidence", path.join(work, "cli-evidence"), "--max-frames", "20", "--region", "left:0:0:16:64", "--region", "right:48:0:16:64:2:4"]);
  const cli = JSON.parse(readFileSync(cliOut, "utf8"));
  assert.equal(cli.regions.length, 2);
  assert(cli.regions[0].visual.meanAbsoluteError > 0.1);
  assert.equal(cli.regions[1].visual.meanAbsoluteError, 0);
  console.log("✔ reference comparator: exact 12/12, deterministic global/ROI evidence, localized drift isolated, invalid regions rejected, normalized mode honest, audio envelope + repeatable CLI green");
} finally {
  rmSync(work, { recursive: true, force: true });
}
