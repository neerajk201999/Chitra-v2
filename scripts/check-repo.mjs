#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const pkg = readJson("core/package.json");
const lock = readJson("core/package-lock.json");
const manifest = readJson("skills/manifest.json");
const failures = [];
const runtimeAssetHashes = {
  "core/runtime-assets/three/three.module.js": "0a3368c165eea773490aec7b77c22de70e3eac288503409256fdbf4d12578416",
  "core/runtime-assets/fonts/inter/inter-latin-400-normal.woff2": "8909904ab6c872eb994093482a88a28eca2cd95912d7b6fecd72103b0dc07edc",
  "core/runtime-assets/fonts/inter/inter-latin-500-normal.woff2": "f3779f1efccc4bdcdf9c0a02ab95bf6bd092ed09c48c08cedc725889edd1d19f",
  "core/runtime-assets/fonts/inter/inter-latin-600-normal.woff2": "f9a06e79cd3a2a20951c0f0e28f66dd0e6d3fda73911d640a2125c8fcb78f21a",
  "core/runtime-assets/fonts/space-grotesk/space-grotesk-latin-400-normal.woff2": "65fd17fcbd2e2f522940b5f67ead3d23329e02891aa5495e74d11a499c0b0673",
  "core/runtime-assets/fonts/space-grotesk/space-grotesk-latin-500-normal.woff2": "1b1a8131d9edf975d9decee81e2f2bf504812f7a4f498e5500f28a613e22e64c",
  "core/runtime-assets/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2": "35f8aec56cfd5cbfdb03cc68733a54a0b05bb3617ffcd5fd332badc0b045ca55",
  "core/runtime-assets/fonts/instrument-serif/instrument-serif-latin-400-normal.woff2": "5eb09b5ac0e28b67c2f041c8ba6d244604ca0c0980d65912ab2d47fed84ddc31",
  "core/runtime-assets/fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2": "14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb",
  "core/runtime-assets/fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2": "cb182feeed4d798ff6961d3c79f7026279448fca0676438aaecb21f3fc39553a",
};
for (const [file, expected] of Object.entries(runtimeAssetHashes)) {
  if (!existsSync(path.join(root, file))) failures.push(`missing runtime asset ${file}`);
  else {
    const actual = createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex");
    if (actual !== expected) failures.push(`runtime asset hash changed: ${file}`);
  }
}
const skillDirs = readdirSync(path.join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
for (const name of skillDirs) {
  if (!existsSync(path.join(root, "skills", name, "SKILL.md")))
    failures.push(`skills/${name} is not a valid skill directory (missing SKILL.md)`);
}
const canonicalSkills = skillDirs.filter((name) => existsSync(path.join(root, "skills", name, "SKILL.md")));
if (JSON.stringify(Object.keys(manifest.skills).sort()) !== JSON.stringify(canonicalSkills))
  failures.push("skill manifest entries do not match canonical skill directories");

for (const [label, version] of [
  ["package-lock root", lock.version],
  ["package-lock workspace", lock.packages?.[""]?.version],
  ["skill manifest", manifest.version],
]) {
  if (version !== pkg.version) failures.push(`${label} version ${version} != package ${pkg.version}`);
}

for (const file of [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
]) {
  const plugin = readJson(file);
  if (plugin.name !== "chitra") failures.push(`${file} plugin name is not chitra`);
  if (plugin.version !== pkg.version) failures.push(`${file} version ${plugin.version} != package ${pkg.version}`);
  const skillPaths = Array.isArray(plugin.skills) ? plugin.skills : [plugin.skills];
  for (const skillPath of skillPaths.filter(Boolean)) {
    const resolved = path.resolve(root, skillPath);
    if (!existsSync(resolved)) failures.push(`${file} has missing skills path ${skillPath}`);
  }
  if (file === ".claude-plugin/plugin.json") {
    const expected = canonicalSkills.map((name) => `./skills/${name}`);
    for (const skillPath of expected)
      if (!skillPaths.includes(skillPath)) failures.push(`${file} does not expose ${skillPath}`);
  }
}

const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
if (!changelog.includes(`## [${pkg.version}]`))
  failures.push(`CHANGELOG.md has no ${pkg.version} release section`);

for (const entry of [pkg.main, pkg.types, pkg.exports?.["."]?.import, pkg.exports?.["."]?.types]) {
  if (!entry || !existsSync(path.resolve(root, "core", entry)))
    failures.push(`package entry point is missing after build: ${entry ?? "<unset>"}`);
}
if (pkg.bin?.chitra !== "dist/cli/index.js")
  failures.push('package bin must be the npm-normalized path "dist/cli/index.js"');
else if (!existsSync(path.resolve(root, "core", pkg.bin.chitra)))
  failures.push(`package bin is missing after build: ${pkg.bin.chitra}`);

const tokens = readFileSync(path.join(root, "core/src/motion/tokens.ts"), "utf8");
const irVersion = tokens.match(/IR_VERSION\s*=\s*"([^"]+)"/)?.[1];
const motionSchema = readFileSync(path.join(root, "core/src/ir/schema.ts"), "utf8");
const directionVersion = motionSchema.match(/DIRECTION_VERSION\s*=\s*"([^"]+)"/)?.[1];
const storyboardVersion = motionSchema.match(/STORYBOARD_VERSION\s*=\s*"([^"]+)"/)?.[1];
const referenceSchema = readFileSync(path.join(root, "core/src/reference/schema.ts"), "utf8");
const styleDnaVersion = referenceSchema.match(/STYLE_DNA_VERSION\s*=\s*"([^"]+)"/)?.[1];
const comparisonSchema = readFileSync(path.join(root, "core/src/reference/comparison-schema.ts"), "utf8");
const comparisonVersion = comparisonSchema.match(/COMPARISON_VERSION\s*=\s*"([^"]+)"/)?.[1];
const intakeSchema = readFileSync(path.join(root, "core/src/intake/schema.ts"), "utf8");
const intakeVersion = intakeSchema.match(/INTAKE_VERSION\s*=\s*"([^"]+)"/)?.[1];
const memorySchema = readFileSync(path.join(root, "core/src/creative/memory.ts"), "utf8");
const revisionMemoryVersion = memorySchema.match(/REVISION_MEMORY_VERSION\s*=\s*"([^"]+)"/)?.[1];
const editingSchema = readFileSync(path.join(root, "core/src/editing/index.ts"), "utf8");
const transcriptVersion = editingSchema.match(/TRANSCRIPT_VERSION\s*=\s*"([^"]+)"/)?.[1];
const editVersion = editingSchema.match(/EDIT_VERSION\s*=\s*"([^"]+)"/)?.[1];
const currentState = readFileSync(path.join(root, "docs/memory/current-state.md"), "utf8");
if (!currentState.includes(`**Package:** ${pkg.version}`))
  failures.push(`current-state package version is not ${pkg.version}`);
if (!irVersion || !currentState.includes(`**Motion IR:** ${irVersion}`))
  failures.push(`current-state Motion IR version is not ${irVersion ?? "discoverable"}`);
if (!directionVersion || !currentState.includes(`**Direction:** ${directionVersion}`))
  failures.push(`current-state Direction version is not ${directionVersion ?? "discoverable"}`);
if (!storyboardVersion || !currentState.includes(`**Storyboard:** ${storyboardVersion}`))
  failures.push(`current-state Storyboard version is not ${storyboardVersion ?? "discoverable"}`);
if (!styleDnaVersion || !currentState.includes(`**Style DNA:** ${styleDnaVersion}`))
  failures.push(`current-state Style DNA version is not ${styleDnaVersion ?? "discoverable"}`);
if (!comparisonVersion || !currentState.includes(`**Comparison:** ${comparisonVersion}`))
  failures.push(`current-state Comparison version is not ${comparisonVersion ?? "discoverable"}`);
if (!intakeVersion || !currentState.includes(`**Intake IR:** ${intakeVersion}`))
  failures.push(`current-state Intake IR version is not ${intakeVersion ?? "discoverable"}`);
if (!revisionMemoryVersion || !currentState.includes(`**Revision Memory:** ${revisionMemoryVersion}`))
  failures.push(`current-state Revision Memory version is not ${revisionMemoryVersion ?? "discoverable"}`);
if (!transcriptVersion || !currentState.includes(`**Transcript IR:** ${transcriptVersion}`))
  failures.push(`current-state Transcript IR version is not ${transcriptVersion ?? "discoverable"}`);
if (!editVersion || !currentState.includes(`**Edit IR:** ${editVersion}`))
  failures.push(`current-state Edit IR version is not ${editVersion ?? "discoverable"}`);

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
