#!/usr/bin/env node
import { chmodSync, cpSync, rmSync } from "node:fs";

chmodSync("dist/cli/index.js", 0o755);
rmSync("styles", { recursive: true, force: true });
cpSync("../styles", "styles", { recursive: true });
rmSync("runtime-assets/agent-kit", { recursive: true, force: true });
cpSync("../skills", "runtime-assets/agent-kit/skills", { recursive: true });
