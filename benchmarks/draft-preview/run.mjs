#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateScore } from "../../core/dist/ir/schema.js";
import { renderScore, renderStorageEstimate } from "../../core/dist/render/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const project = path.join(root, "examples/social-short");
const raw = JSON.parse(readFileSync(path.join(project, "score.json"), "utf8"));
const parsed = validateScore(raw);
if (!parsed.ok) throw new Error(`social fixture invalid: ${JSON.stringify(parsed.issues)}`);
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-draft-preview-"));
const check = process.argv.includes("--check");

try {
  const result = await renderScore(parsed.score, project, path.join(work, "preview.mp4"), {
    quality: "draft",
    cacheDir: path.join(work, "cache"),
  });
  const expectedFrames = Math.round((result.durationMs / 1000) * 12);
  if (result.captureFps !== 12) throw new Error(`draft captured at ${result.captureFps}fps, expected 12`);
  if (Math.abs(result.totalFrames - expectedFrames) > 1) throw new Error(`draft frame count ${result.totalFrames} != ${expectedFrames}`);
  if (result.cacheBytes >= renderStorageEstimate(parsed.score, "standard") / 3)
    throw new Error("draft cache did not stay below one third of the standard estimate");
  if (statSync(result.outFile).size < 1000) throw new Error("draft preview MP4 is empty");
  const cacheMiB = result.cacheBytes / 1024 / 1024;
  const wallSeconds = result.wallMs / 1000;
  if (!check) writeFileSync(path.join(here, "results.md"), `# Draft preview benchmark — 2026-07-17

- Fixture: **9.6s, 1080×1920, authored at 30fps**
- Preview: **${result.totalFrames} frames at ${result.captureFps}fps**
- JPEG frame cache: **${cacheMiB.toFixed(1)} MiB**
- Wall time: **${wallSeconds.toFixed(1)}s**

The preview is diagnostic and cannot be released. Standard/high retain full
authored fps and lossless PNG capture. Reproduce with the draft-preview benchmark script.
`);
  console.log(`✔ draft preview: ${result.totalFrames} frames @ ${result.captureFps}fps, ${cacheMiB.toFixed(1)} MiB cache, ${wallSeconds.toFixed(1)}s`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
