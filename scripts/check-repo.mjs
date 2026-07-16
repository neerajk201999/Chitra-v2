#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const pkg = readJson("core/package.json");
const lock = readJson("core/package-lock.json");
const manifest = readJson("skills/manifest.json");
const failures = [];

for (const [label, version] of [
  ["package-lock root", lock.version],
  ["package-lock workspace", lock.packages?.[""]?.version],
  ["skill manifest", manifest.version],
]) {
  if (version !== pkg.version) failures.push(`${label} version ${version} != package ${pkg.version}`);
}

const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
if (!changelog.includes(`## [${pkg.version}]`))
  failures.push(`CHANGELOG.md has no ${pkg.version} release section`);

for (const entry of [pkg.main, pkg.types, pkg.exports?.["."]?.import, pkg.exports?.["."]?.types]) {
  if (!entry || !existsSync(path.resolve(root, "core", entry)))
    failures.push(`package entry point is missing after build: ${entry ?? "<unset>"}`);
}

const tokens = readFileSync(path.join(root, "core/src/motion/tokens.ts"), "utf8");
const irVersion = tokens.match(/IR_VERSION\s*=\s*"([^"]+)"/)?.[1];
const referenceSchema = readFileSync(path.join(root, "core/src/reference/schema.ts"), "utf8");
const styleDnaVersion = referenceSchema.match(/STYLE_DNA_VERSION\s*=\s*"([^"]+)"/)?.[1];
const currentState = readFileSync(path.join(root, "docs/memory/current-state.md"), "utf8");
if (!currentState.includes(`**Package:** ${pkg.version}`))
  failures.push(`current-state package version is not ${pkg.version}`);
if (!irVersion || !currentState.includes(`**Motion IR:** ${irVersion}`))
  failures.push(`current-state Motion IR version is not ${irVersion ?? "discoverable"}`);
if (!styleDnaVersion || !currentState.includes(`**Style DNA:** ${styleDnaVersion}`))
  failures.push(`current-state Style DNA version is not ${styleDnaVersion ?? "discoverable"}`);

const cli = path.join(root, "core/dist/cli/index.js");
if (existsSync(cli)) {
  const result = spawnSync(process.execPath, [cli, "--version"], { encoding: "utf8" });
  if (result.status !== 0 || result.stdout.trim() !== pkg.version)
    failures.push(`CLI version ${result.stdout.trim() || "<error>"} != package ${pkg.version}`);
}

function markdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "reference"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(file));
    else if (entry.name.endsWith(".md")) out.push(file);
  }
  return out;
}

for (const file of markdownFiles(root)) {
  const source = readFileSync(file, "utf8");
  const links = source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    let target = match[1].trim().replace(/^<|>$/g, "").split(/\s+\"/)[0];
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    target = decodeURIComponent(target.split("#")[0]);
    if (!target) continue;
    const resolved = path.resolve(path.dirname(file), target);
    if (!existsSync(resolved))
      failures.push(`${path.relative(root, file)}: broken link ${match[1]}`);
  }
}

const diff = spawnSync("git", ["diff", "--check"], { cwd: root, encoding: "utf8" });
if (diff.status !== 0) failures.push(diff.stdout.trim() || diff.stderr.trim() || "git diff --check failed");
const stagedDiff = spawnSync("git", ["diff", "--cached", "--check"], { cwd: root, encoding: "utf8" });
if (stagedDiff.status !== 0) failures.push(stagedDiff.stdout.trim() || stagedDiff.stderr.trim() || "git diff --cached --check failed");

if (failures.length) {
  console.error(failures.map((f) => `✖ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✔ repository consistency (${pkg.version}; links, versions, changelog, whitespace)`);
