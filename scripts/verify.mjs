#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const core = path.join(root, "core");
const quick = process.argv.includes("--quick");
const started = Date.now();

function run(label, command, args, cwd = root) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\n✖ ${label} failed`);
    process.exit(result.status ?? 1);
  }
}

run("TypeScript build", "npm", ["run", "build"], core);
run("Unit tests", "npm", ["test"], core);
run("Repository consistency", process.execPath, ["scripts/check-repo.mjs"]);
run("Compiled skill integrity", process.execPath, ["scripts/build-skills.mjs", "--check"]);
run("Launch example static gates", process.execPath, ["core/dist/cli/index.js", "validate", "examples/launch-film/score.json"]);
run("Social example static gates", process.execPath, ["core/dist/cli/index.js", "validate", "examples/social-short/score.json"]);
run("Card Vault candidate static gates", process.execPath, ["core/dist/cli/index.js", "validate", "benchmarks/card-vault/candidate/score.json"]);

if (!quick) {
  run("Runtime probe", process.execPath, ["core/dist/cli/index.js", "probe"]);
  run("Isolated package install", process.execPath, ["benchmarks/cold-start/run.mjs", "--check"]);
  run("Draft preview profile", process.execPath, ["benchmarks/draft-preview/run.mjs", "--check"]);
  run("Multimodal Intake benchmark", process.execPath, ["benchmarks/intake/run.mjs", "--check"]);
  run("Creative ladder benchmark", process.execPath, ["benchmarks/creative-ladder/run.mjs", "--check"]);
  run("Creative Review contract benchmark", process.execPath, ["benchmarks/creative-review-contract/run.mjs", "--check"]);
  run("Independent calibration contract benchmark", process.execPath, ["benchmarks/independent-calibration/run.mjs", "--check"]);
  run("Accepted-revision memory benchmark", process.execPath, ["benchmarks/revision-memory/run.mjs", "--check"]);
  run("Transcript-addressed edit benchmark", process.execPath, ["benchmarks/transcript-edit/run.mjs", "--check"]);
  run("Requested-range footage evidence benchmark", process.execPath, ["benchmarks/footage-evidence/run.mjs", "--check"]);
  run("Still-first directorial search benchmark", process.execPath, ["benchmarks/directorial-search/run.mjs", "--check"]);
  run("Source-assisted provenance benchmark", process.execPath, ["benchmarks/source-assisted/run.mjs", "--check"]);
  run("Rendered figure text gate benchmark", process.execPath, ["benchmarks/figure-text-gates/run.mjs", "--check"]);
  run("Release integrity benchmark", process.execPath, ["benchmarks/release-integrity/run.mjs", "--check"]);
  run("Heterogeneous particle appearance benchmark", process.execPath, ["benchmarks/particle-appearance/run.mjs", "--check"]);
  run("Reference Decomposer benchmark", process.execPath, ["benchmarks/reference-decomposer/run.mjs", "--check"]);
  run("Reference Comparator benchmark", process.execPath, ["benchmarks/reference-comparator/run.mjs", "--check"]);
  run("Frame-addressed browser benchmark", process.execPath, ["benchmarks/keyframe-track/run.mjs", "--check"]);
  run("Textured 3D track browser benchmark", process.execPath, ["benchmarks/three-keyframe-track/run.mjs", "--check"]);
  run("Seeded-defect benchmark", process.execPath, ["benchmarks/seeded-defects/run.mjs", "--check"]);
  run("Publishable package dry-run", "npm", ["pack", "--dry-run"], core);
}

console.log(`\n✔ ${quick ? "quick" : "full"} verification passed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
