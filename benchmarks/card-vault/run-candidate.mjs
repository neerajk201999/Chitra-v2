#!/usr/bin/env node
/** Render the clean-room Chitra candidate, then compare all 274 decoded frames. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Score } from "../../core/dist/ir/schema.js";
import { compareReference } from "../../core/dist/reference/compare.js";
import { renderScore } from "../../core/dist/render/index.js";

const expectedHash = "8211d15a9ccc90453f8babd914aebea612781febd41e70f2e59c00cc865060c4";
const reference = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
if (!reference) throw new Error("usage: node benchmarks/card-vault/run-candidate.mjs /path/to/nJY81Asb24doUFnW.mp4");
assert.equal(createHash("sha256").update(readFileSync(reference)).digest("hex"), expectedHash, "reference bytes do not match the registered Card Vault target");

const project = path.join(path.dirname(fileURLToPath(import.meta.url)), "candidate");
const score = Score.parse(JSON.parse(readFileSync(path.join(project, "score.json"), "utf8")));
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-card-vault-candidate-"));
try {
  const candidate = path.join(work, "candidate.mp4");
  const render = await renderScore(score, project, candidate, { quality: "high", cacheDir: path.join(work, "cache") });
  assert.equal(render.totalFrames, 274);
  const report = await compareReference(reference, candidate, {
    mode: "exact",
    evidenceDir: path.join(work, "evidence"),
    artifactDir: work,
    maxFrames: 274,
  });
  assert.equal(report.alignment.comparedFrames, 274);
  console.log(JSON.stringify({ candidate: "clean-room-0.6", render, visual: report.visual, audio: report.audio, alignment: report.alignment, artifacts: work }, null, 2));
} catch (error) {
  rmSync(work, { recursive: true, force: true });
  throw error;
}
