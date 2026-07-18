#!/usr/bin/env node
/** ADR-0016: install the packed package into an isolated prefix and prove the
 *  installed binary can initialize, validate, and capture a browser frame. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const core = path.join(root, "core");
const check = process.argv.includes("--check");
const printReport = process.argv.includes("--report");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-cold-start-"));
const prefix = path.join(work, "install");
const browserCache = path.join(work, "browser-cache");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const started = Date.now();

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    env: { ...process.env, PUPPETEER_CACHE_DIR: browserCache },
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
  if (result.error || result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || result.error?.message || "").slice(-1200)}`);
  return result.stdout.trim();
}
function treeBytes(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const file = path.join(dir, entry.name);
    return sum + (entry.isDirectory() ? treeBytes(file) : statSync(file).size);
  }, 0);
}
try {
  const tgz = run(npm, ["pack", "--pack-destination", work, "--silent"], core).split(/\r?\n/).at(-1);
  const tarball = path.join(work, tgz);
  if (process.platform !== "win32" && (statSync(path.join(core, "dist/cli/index.js")).mode & 0o111) === 0)
    throw new Error("packed CLI source is not executable");
  const installStarted = Date.now();
  run(npm, ["install", "--global", "--prefix", prefix, tarball, "--silent"]);
  const installSeconds = (Date.now() - installStarted) / 1000;
  if (treeBytes(browserCache) !== 0) throw new Error("package install downloaded browser bytes");
  const installedMiB = treeBytes(prefix) / 1024 / 1024;
  if (check && installedMiB > 65) throw new Error(`installed package ${installedMiB.toFixed(1)} MiB exceeds the 65 MiB regression ceiling`);
  const chitra = process.platform === "win32" ? path.join(prefix, "chitra.cmd") : path.join(prefix, "bin", "chitra");
  const globalRoot = run(npm, ["root", "--global", "--prefix", prefix]);
  const installedThree = path.join(globalRoot, "chitra-video", "runtime-assets", "three", "three.module.js");
  if (!existsSync(installedThree) || statSync(installedThree).size < 1_000_000)
    throw new Error("packed package is missing its licensed Three.js runtime asset");
  const version = run(chitra, ["--version"]);
  run(chitra, ["probe"]);
  const film = path.join(work, "film");
  mkdirSync(film);
  const intake = path.join(film, "intake.json");
  const lockedIntake = path.join(film, "intake.lock.json");
  writeFileSync(intake, JSON.stringify({
    intakeVersion: "0.1.0", tier: "intake", projectId: "cold-start", title: "Cold start",
    objective: { primary: "Create a verified installation film", audience: "new users", singleMessage: "The package works" },
    deliverable: { register: "brand-film", targetDurationMs: 10000 },
    sources: [{ id: "prompt", kind: "direction-prompt", roles: ["content"], origin: { type: "inline", content: "Calm and exact." }, usage: "Defines the cold-start direction", rights: "owned" }],
  }, null, 2));
  run(chitra, ["intake", intake, "-o", lockedIntake]);
  if (!existsSync(lockedIntake)) throw new Error("installed package did not produce an intake lock");
  run(chitra, ["init", film, "--style", "night", "--register", "brand-film", "--title", "Cold start"]);
  run(chitra, ["validate", path.join(film, "score.json")]);
  const frame = path.join(work, "frame.png");
  run(chitra, ["frame", path.join(film, "score.json"), "-t", "500", "-o", frame]);
  if (!existsSync(frame) || statSync(frame).size < 1000) throw new Error("installed package did not produce a valid frame PNG");

  const elapsedSeconds = (Date.now() - started) / 1000;
  const report = `# Isolated install benchmark — 2026-07-18

ADR-0016 source-package verification in a fresh temporary install prefix.

- Packed and globally installed: **chitra-video ${version}**
- Install: **${installSeconds.toFixed(1)}s, ${installedMiB.toFixed(1)} MiB, zero browser-download bytes**
- Runtime probe: **passed**
- Licensed minimal Three/font runtime assets: **packed**
- Installed-package Intake validation and source lock: **passed**
- Starter initialization and static validation: **passed**
- Installed-package browser frame: **${Math.round(statSync(frame).size / 1024)} KiB, passed**
- Elapsed on this machine with a warm npm dependency cache: **${elapsedSeconds.toFixed(1)}s**

This is a functional install check, not the M3 outside-user/network-cold timing claim.
Reproduce: \`node benchmarks/cold-start/run.mjs\`.
`;
  if (!check) writeFileSync(path.join(here, "results.md"), report);
  if (printReport) process.stdout.write(report);
  console.log(`✔ isolated install ${version}: probe, intake lock, init, validate, and browser frame (${elapsedSeconds.toFixed(1)}s)`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
