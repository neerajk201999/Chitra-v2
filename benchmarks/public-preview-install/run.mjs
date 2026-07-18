#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PUBLIC_PREVIEW_URL = "https://github.com/neerajk201999/Chitra-v2/releases/download/v0.5.0-rc.4/chitra-video-0.5.0.tgz";
export const PUBLIC_PREVIEW_SHA256 = "b1feb333f8c4cafa4852859e088dc9fa1162ffcfb7753c9f7bcff76123cdd79d";

const result = spawnSync(process.execPath, [
  "benchmarks/cold-start/run.mjs", "--check", "--report",
  "--source", PUBLIC_PREVIEW_URL, "--sha256", PUBLIC_PREVIEW_SHA256,
], { cwd: root, stdio: "inherit", env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
