#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PUBLIC_PREVIEW_URL = "https://github.com/neerajk201999/Chitra-v2/releases/download/v0.5.0-rc.1/chitra-video-0.5.0.tgz";
export const PUBLIC_PREVIEW_SHA256 = "d8bc89b419aa1bf6e53252067d2abcf5300315d94328547303c434bcfb670ba9";

const result = spawnSync(process.execPath, [
  "benchmarks/cold-start/run.mjs", "--check", "--report",
  "--source", PUBLIC_PREVIEW_URL, "--sha256", PUBLIC_PREVIEW_SHA256,
], { cwd: root, stdio: "inherit", env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
