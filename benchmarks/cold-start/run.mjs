#!/usr/bin/env node
/** ADR-0016: install the packed package into an isolated prefix and prove the
 *  installed binary can initialize, validate, and capture a browser frame. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const core = path.join(root, "core");
const check = process.argv.includes("--check");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-cold-start-"));
const prefix = path.join(work, "install");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const started = Date.now();

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
  if (result.error || result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || result.error?.message || "").slice(-1200)}`);
  return result.stdout.trim();
}
try {
  const tgz = run(npm, ["pack", "--pack-destination", work, "--silent"], core).split(/\r?\n/).at(-1);
  const tarball = path.join(work, tgz);
  run(npm, ["install", "--global", "--prefix", prefix, tarball, "--silent"]);
  const chitra = process.platform === "win32" ? path.join(prefix, "chitra.cmd") : path.join(prefix, "bin", "chitra");
  const version = run(chitra, ["--version"]);
  run(chitra, ["probe"]);
  const film = path.join(work, "film");
  run(chitra, ["init", film, "--style", "night", "--register", "brand-film", "--title", "Cold start"]);
  run(chitra, ["validate", path.join(film, "score.json")]);
  const frame = path.join(work, "frame.png");
  run(chitra, ["frame", path.join(film, "score.json"), "-t", "500", "-o", frame]);
  if (!existsSync(frame) || statSync(frame).size < 1000) throw new Error("installed package did not produce a valid frame PNG");

  const elapsedSeconds = (Date.now() - started) / 1000;
  const report = `# Isolated install benchmark — 2026-07-16

ADR-0016 source-package verification in a fresh temporary install prefix.

- Packed and globally installed: **chitra-video ${version}**
- Runtime probe: **passed**
- Starter initialization and static validation: **passed**
- Installed-package browser frame: **${Math.round(statSync(frame).size / 1024)} KiB, passed**
- Elapsed on this machine with a warm npm dependency cache: **${elapsedSeconds.toFixed(1)}s**

This is a functional install check, not the M3 outside-user/network-cold timing claim.
Reproduce: \`node benchmarks/cold-start/run.mjs\`.
`;
  if (!check) writeFileSync(path.join(here, "results.md"), report);
  console.log(`✔ isolated install ${version}: probe, init, validate, and browser frame (${elapsedSeconds.toFixed(1)}s)`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
