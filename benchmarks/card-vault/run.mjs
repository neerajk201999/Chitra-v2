#!/usr/bin/env node
/** Local licensed-input benchmark. The target video is not redistributed. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { compareReference } from "../../core/dist/reference/compare.js";

const expectedHash = "8211d15a9ccc90453f8babd914aebea612781febd41e70f2e59c00cc865060c4";
const reference = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
if (!reference) throw new Error("usage: node benchmarks/card-vault/run.mjs /path/to/nJY81Asb24doUFnW.mp4");
const actualHash = createHash("sha256").update(readFileSync(reference)).digest("hex");
assert.equal(actualHash, expectedHash, "reference bytes do not match the registered Card Vault target");

const work = mkdtempSync(path.join(os.tmpdir(), "chitra-card-vault-"));
const run = (args) => {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
};
try {
  const first = path.join(work, "first.png"), freeze = path.join(work, "freeze.mp4");
  run(["-y", "-v", "error", "-i", reference, "-frames:v", "1", first]);
  run(["-y", "-v", "error", "-loop", "1", "-i", first, "-i", reference, "-map", "0:v:0", "-map", "1:a:0", "-r", "30", "-frames:v", "274", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", freeze]);
  const report = await compareReference(reference, freeze, { mode: "exact", evidenceDir: path.join(work, "evidence"), artifactDir: work, maxFrames: 274 });
  assert.equal(report.reference.frameCount, 274);
  assert.equal(report.reference.width, 720);
  assert.equal(report.reference.height, 900);
  assert.equal(report.reference.fps, 30);
  assert.equal(report.alignment.comparedFrames, 274);
  console.log(JSON.stringify({ source: report.reference, baseline: report.visual, audio: report.audio, alignment: report.alignment }, null, 2));
} finally {
  rmSync(work, { recursive: true, force: true });
}
