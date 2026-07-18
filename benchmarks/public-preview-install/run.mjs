#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PUBLIC_PREVIEW_URL = "https://github.com/neerajk201999/Chitra-v2/releases/download/v0.5.0-rc.3/chitra-video-0.5.0.tgz";
export const PUBLIC_PREVIEW_SHA256 = "f93a3a8ff43b456793396e1006e670d8a39ae803d6ad035dd2786afffced44c8";

const result = spawnSync(process.execPath, [
  "benchmarks/cold-start/run.mjs", "--check", "--report",
  "--source", PUBLIC_PREVIEW_URL, "--sha256", PUBLIC_PREVIEW_SHA256,
], { cwd: root, stdio: "inherit", env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
