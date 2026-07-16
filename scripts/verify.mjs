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

if (!quick) {
  run("Runtime probe", process.execPath, ["core/dist/cli/index.js", "probe"]);
  run("Frame-addressed browser benchmark", process.execPath, ["benchmarks/keyframe-track/run.mjs", "--check"]);
  run("Seeded-defect benchmark", process.execPath, ["benchmarks/seeded-defects/run.mjs", "--check"]);
  run("Publishable package dry-run", "npm", ["pack", "--dry-run"], core);
}

console.log(`\n✔ ${quick ? "quick" : "full"} verification passed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
