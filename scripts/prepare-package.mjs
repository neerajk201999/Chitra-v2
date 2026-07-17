#!/usr/bin/env node
import { chmodSync, cpSync, rmSync } from "node:fs";

chmodSync("dist/cli/index.js", 0o755);
rmSync("styles", { recursive: true, force: true });
cpSync("../styles", "styles", { recursive: true });

