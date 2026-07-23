#!/usr/bin/env node
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { brandSystemDigest, materializeBrandSystem, validateBrandSystem } from "../../core/dist/brand/index.js";
import { materializeIntake } from "../../core/dist/intake/materialize.js";
import { validateIntake } from "../../core/dist/intake/schema.js";
import { validateDirection, validateScore, validateStoryboard } from "../../core/dist/ir/schema.js";
import { runBrandConformance, runCreativeConformance } from "../../core/dist/gates/index.js";
import { assertReleaseTargets, makeReleaseReceipt, releaseFingerprint, verifyReleaseReceipt } from "../../core/dist/release/index.js";
import { openSession, renderInputFiles, sceneHash } from "../../core/dist/render/index.js";

const root = path.resolve(import.meta.dirname, "../..");
const check = process.argv.includes("--check");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-brand-system-"));
const assets = path.join(work, "assets");
mkdirSync(assets);

const bundled = (family, file) => path.join(root, "core/runtime-assets/fonts", family, file);
const font400 = path.join(assets, "acme-400.woff2"), font500 = path.join(assets, "acme-500.woff2");
copyFileSync(bundled("inter", "inter-latin-400-normal.woff2"), font400);
copyFileSync(bundled("inter", "inter-latin-500-normal.woff2"), font500);

const sourceIds = ["brand-guide", "brand-font-400", "brand-font-500"];
const rules = [
  { id: "no-logo-open", statement: "Earn the wordmark only after the product proof", priority: "must", domain: "logo", sourceIds: ["brand-guide"] },
  { id: "precise-motion", statement: "Use restrained precise motion with one hero action", priority: "must", domain: "motion", sourceIds: ["brand-guide"] },
  { id: "avoid-purple", statement: "Avoid generic purple gradient treatments", priority: "should", domain: "avoid", sourceIds: ["brand-guide"] },
];
const palette = { bg: "#0a0a0e", surface: "#1b1b24", primary: "#6e7bf2", accent: "#8ee8c8", text: "#f2f2f6", textDim: "#a2a2ae", onMedia: "#ffffff" };
const brandRaw = {
  brandVersion: "0.1.0", tier: "brand-system", brandId: "acme", name: "Acme", styleName: "acme-motion",
  sourceIds, palette,
  typography: { display: { family: "Acme Sans", weight: 500 }, text: { family: "Acme Sans", weight: 400 }, mono: { family: "JetBrains Mono", weight: 400 }, trackingDisplay: -0.02 },
  fontAssets: [
    { family: "Acme Sans", src: "assets/acme-400.woff2", weight: 400, sourceId: "brand-font-400" },
    { family: "Acme Sans", src: "assets/acme-500.woff2", weight: 500, sourceId: "brand-font-500" },
  ], rules,
};
const intakeRaw = {
  intakeVersion: "0.1.0", tier: "intake", projectId: "acme-launch", title: "Acme launch",
  objective: { primary: "Launch Acme with a brand-faithful product story", audience: "design-literate product teams", singleMessage: "Proof replaces promises" },
  deliverable: { register: "brand-film", targetDurationMs: 8000, width: 1920, height: 1080 },
  sources: [
    { id: "brand-guide", kind: "document", roles: ["brand", "constraint", "content"], origin: { type: "inline", content: "Acme is precise, restrained, evidence-led, and earns its wordmark after proof." }, usage: "Defines Acme voice, motion, and logo posture", rights: "owned" },
    { id: "brand-font-400", kind: "brand-asset", roles: ["brand"], origin: { type: "path", path: "assets/acme-400.woff2" }, usage: "Licensed Acme text face for rendered body copy", rights: "licensed" },
    { id: "brand-font-500", kind: "brand-asset", roles: ["brand"], origin: { type: "path", path: "assets/acme-500.woff2" }, usage: "Licensed Acme display face for rendered headlines", rights: "licensed" },
  ], preferences: [], brand: { profileId: "acme", name: "Acme", constraints: rules.map(({ id, statement, priority, sourceIds }) => ({ id, statement, priority, sourceIds })) },
  constraints: { mustInclude: ["Proof replaces promises"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: [] },
};
const directionRaw = {
  directionVersion: "0.3.0", irVersion: "0.1.0", tier: "direction", id: "acme-proof", title: "Proof replaces promises", register: "brand-film",
  logline: "A quiet claim becomes visible product proof.", narrativeArc: "Establish the empty promise, reveal the proof, then earn the Acme name.", tone: ["precise", "restrained"], audience: "design-literate product teams",
  deliverable: { targetDurationMs: 8000, width: 1920, height: 1080 },
  creativeConcept: { emotionalPromise: "Evidence creates confidence", governingIdea: "Proof replaces promises", tension: "Launch claims are easy to ignore", resolution: "Acme makes the proof visible", visualThesis: "Sparse typography yields to one exact product reveal" },
  productionApproach: { requirements: [{ id: "brand-type", description: "Render Acme licensed typography as the film voice", importance: "must", capabilityId: "typography-layout", support: "native", approach: "Use declared local WOFF2 brand faces", acceptanceTest: "Rendered display and body roles use Acme Sans" }] },
  trace: { intakeProjectId: "acme-launch", objective: { primary: "Launch Acme with a brand-faithful product story", audience: "design-literate product teams", singleMessage: "Proof replaces promises" }, constraints: { mustInclude: ["Proof replaces promises"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: [] }, sourceIds, preferenceIds: [], brandConstraintIds: rules.map((rule) => rule.id), assumptionIds: [] },
  scenes: [
    { id: "cold-open", narrativeRole: "establish tension", shotIntent: "Make the empty promise feel insufficient", pacingWeight: 1, sourceIds, preferenceIds: [] },
    { id: "problem", narrativeRole: "resolve with proof", shotIntent: "Let product evidence replace the claim", heroMoment: "Proof replaces promises lands", pacingWeight: 1.5, sourceIds, preferenceIds: [] },
  ],
};
const storyboardRaw = {
  storyboardVersion: "0.1.0", tier: "storyboard", title: "Acme proof", register: "brand-film", directionId: "acme-proof", deliverable: { targetDurationMs: 8000, width: 1920, height: 1080 },
  shots: [
    { id: "cold-open", directionBeatId: "cold-open", reason: "Tension must precede proof", whyNow: "The viewer needs a gap to resolve", shotIntent: "Make the empty promise feel insufficient", sourceIds, preferenceIds: [], hero: { description: "Opening thesis", elementType: "text" }, composition: { layout: "quiet centered field", hierarchy: "one claim over a restrained kicker", negativeSpace: "wide margins keep the tension calm" }, camera: { movement: "locked", reason: "Locked framing reads as precise" }, typography: { intent: "Acme display voice", onScreenCopy: ["Taste is the product."] }, colorIntent: "Acme near-black field and controlled primary", targetDurationMs: 3600, transition: { intent: "Reveal proof after the claim settles", preferredType: "fade" } },
    { id: "problem", directionBeatId: "problem", reason: "Proof resolves the opening", whyNow: "Evidence follows the stated gap", shotIntent: "Let product evidence replace the claim", sourceIds, preferenceIds: [], hero: { description: "Proof line", elementType: "text" }, composition: { layout: "left anchored evidence", hierarchy: "claim leads and answer follows", negativeSpace: "right field stays open for focus" }, camera: { movement: "locked", reason: "Typography carries the product truth" }, typography: { intent: "Acme display and text voices", onScreenCopy: ["Every tool renders.", "Almost none direct."] }, colorIntent: "Acme surface with mint accent", targetDurationMs: 4400, transition: { intent: "Cut once proof is understood", preferredType: "cut" } },
  ],
};
const scoreRaw = JSON.parse(readFileSync(path.join(root, "examples/launch-film/score.json"), "utf8"));
scoreRaw.scenes = scoreRaw.scenes.slice(0, 2);
scoreRaw.style = { ...scoreRaw.style, name: "acme-motion", palette, fonts: { display: "Acme Sans", text: "Acme Sans", mono: "JetBrains Mono" }, fontAssets: [
  { family: "Acme Sans", src: "assets/acme-400.woff2", weight: 400, assetUse: { sourceId: "brand-font-400", kind: "direct", note: "Render the licensed Acme text face directly" } },
  { family: "Acme Sans", src: "assets/acme-500.woff2", weight: 500, assetUse: { sourceId: "brand-font-500", kind: "direct", note: "Render the licensed Acme display face directly" } },
] };
for (const scene of scoreRaw.scenes)
  for (const element of scene.elements)
    if (element.type === "text" && element.textRole === "kicker")
      element.treatment = { ...(element.treatment ?? {}), reason: "Use the exact licensed Acme text face instead of synthesizing a semibold kicker", weight: 400 };

try {
  const brandValidation = validateBrandSystem(brandRaw), intakeValidation = validateIntake(intakeRaw);
  const directionValidation = validateDirection(directionRaw), storyboardValidation = validateStoryboard(storyboardRaw);
  assert(brandValidation.ok && intakeValidation.ok && directionValidation.ok && storyboardValidation.ok, "all Brand System planning fixtures must validate");
  const brand = await materializeBrandSystem(brandValidation.brand, work);
  assert.equal(brand.digest, brandSystemDigest(brand));
  assert.deepEqual(await materializeBrandSystem(brand, work), brand, "Brand lock must repeat byte-for-byte");
  scoreRaw.meta.brand = { brandId: brand.brandId, brandSystemDigest: brandSystemDigest(brand) };
  const scoreValidation = validateScore(scoreRaw);
  assert(scoreValidation.ok, "Brand-bound Score fixture must validate");
  const intake = await materializeIntake(intakeValidation.intake, work);
  const direction = directionValidation.direction, storyboard = storyboardValidation.storyboard, score = scoreValidation.score;
  assert.deepEqual(runBrandConformance(brand, intake, direction, score), []);
  assert.deepEqual(runCreativeConformance(intake, direction, storyboard, score, work).filter((finding) => finding.severity !== "P3"), []);
  assert.deepEqual(renderInputFiles(score, work).filter((file) => file.endsWith(".woff2")).length, 2);

  const firstHash = sceneHash(score, 0, work);
  copyFileSync(bundled("space-grotesk", "space-grotesk-latin-500-normal.woff2"), font500);
  const changedHash = sceneHash(score, 0, work);
  assert.notEqual(firstHash, changedHash, "changed brand font bytes must invalidate scene cache identity");
  copyFileSync(bundled("inter", "inter-latin-500-normal.woff2"), font500);

  const sessionA = await openSession(score, work, path.join(work, "cache-a"));
  const frameA = await sessionA.seekAndCapture(600); await sessionA.close();
  const sessionB = await openSession(score, work, path.join(work, "cache-b"));
  const frameB = await sessionB.seekAndCapture(600); await sessionB.close();
  assert.deepEqual(frameA, frameB, "custom-brand-font capture must repeat byte-identically");

  const paletteDrift = structuredClone(score); paletteDrift.style.palette.accent = "#ff0000";
  assert(runBrandConformance(brand, intake, direction, paletteDrift).some((finding) => finding.ruleId === "CC-BRAND-5"));
  const fontDrift = structuredClone(score); fontDrift.style.fonts.display = "Inter";
  assert(runBrandConformance(brand, intake, direction, fontDrift).some((finding) => finding.ruleId === "CC-BRAND-6"));
  const ruleDrift = structuredClone(intake); ruleDrift.brand.constraints[0].statement = "Changed brand rule";
  assert(runBrandConformance(brand, ruleDrift, direction, score).some((finding) => finding.ruleId === "CC-BRAND-4"));
  const roleDrift = structuredClone(intake); roleDrift.sources[0].roles = ["content"];
  assert(runBrandConformance(brand, roleDrift, direction, score).some((finding) => finding.ruleId === "CC-BRAND-3"));
  const bindingDrift = structuredClone(score); delete bindingDrift.meta.brand;
  assert(runBrandConformance(brand, intake, direction, bindingDrift).some((finding) => finding.ruleId === "CC-BRAND-3"));
  const rightsDrift = structuredClone(intake); rightsDrift.sources.find((source) => source.id === "brand-font-400").rights = "reference-only";
  assert(runCreativeConformance(rightsDrift, direction, storyboard, score, work).some((finding) => finding.ruleId === "CC-ASSET-2"), "brand font rights drift must be blocked by rendered-asset provenance");

  const missingFace = structuredClone(scoreRaw); missingFace.style.fontAssets = missingFace.style.fontAssets.slice(0, 1);
  assert.equal(validateScore(missingFace).ok, false, "custom display face without exact weight must fail schema");
  const traversal = structuredClone(brandRaw); traversal.fontAssets[0].src = "../escape.woff2";
  assert.equal(validateBrandSystem(traversal).ok, false, "font traversal must fail schema");
  const outside = path.join(os.tmpdir(), `chitra-brand-outside-${process.pid}.woff2`); copyFileSync(font400, outside);
  symlinkSync(outside, path.join(assets, "escape.woff2"));
  const symlinked = structuredClone(brandRaw); symlinked.fontAssets[0].src = "assets/escape.woff2";
  await assert.rejects(() => materializeBrandSystem(symlinked, work), /escapes the project through a symlink/);
  rmSync(outside, { force: true });
  const stale = structuredClone(brand); stale.fontAssets[0].sha256 = "0".repeat(64);
  await assert.rejects(() => materializeBrandSystem(stale, work), /sha256 mismatch/);
  const staleDigest = structuredClone(brand); staleDigest.digest = "0".repeat(64);
  await assert.rejects(() => materializeBrandSystem(staleDigest, work), /Brand System digest mismatch/);
  writeFileSync(path.join(assets, "fake.woff2"), "not a font");
  const fake = structuredClone(brandRaw); fake.fontAssets[0].src = "assets/fake.woff2";
  await assert.rejects(() => materializeBrandSystem(fake, work), /not WOFF2 data/);

  for (const [name, value] of [["brand", brandRaw], ["intake", intakeRaw], ["direction", directionRaw], ["storyboard", storyboardRaw], ["score", scoreRaw]])
    writeFileSync(path.join(work, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  const cli = path.join(root, "core/dist/cli/index.js");
  const lockedFile = path.join(work, "brand.lock.json");
  const lock = spawnSync(process.execPath, [cli, "brand-lock", path.join(work, "brand.json"), "--project", work, "-o", lockedFile], { encoding: "utf8" });
  assert.equal(lock.status, 0, lock.stderr || lock.stdout);
  const conform = spawnSync(process.execPath, [cli, "brand-conform", lockedFile, path.join(work, "intake.json"), path.join(work, "direction.json"), path.join(work, "score.json"), "--project", work, "--json"], { encoding: "utf8" });
  assert.equal(conform.status, 0, conform.stderr || conform.stdout);
  assert.deepEqual(JSON.parse(conform.stdout).findings, []);
  const creativeArgs = [cli, "creative-check", ...["intake", "direction", "storyboard", "score"].map((name) => path.join(work, `${name}.json`)), "--json"];
  const missingBrand = spawnSync(process.execPath, creativeArgs, { encoding: "utf8" });
  assert.notEqual(missingBrand.status, 0, "brand-bound creative-check must require --brand");
  const creative = spawnSync(process.execPath, [...creativeArgs, "--brand", lockedFile], { encoding: "utf8" });
  assert.equal(creative.status, 0, creative.stderr || creative.stdout);
  const releaseMissingBrand = spawnSync(process.execPath, [cli, "release", ...["intake", "direction", "storyboard", "score"].map((name) => path.join(work, `${name}.json`)), "-o", path.join(work, "should-not-render.mp4")], { encoding: "utf8" });
  assert.notEqual(releaseMissingBrand.status, 0, "brand-bound release must require --brand before rendering");

  const artifacts = {
    intake: path.join(work, "intake.json"), direction: path.join(work, "direction.json"),
    storyboard: path.join(work, "storyboard.json"), score: path.join(work, "score.json"), brand: lockedFile,
  };
  const releaseOut = path.join(work, "release.mp4"), releaseEvidence = path.join(work, "release-evidence.png");
  const releaseReceipt = path.join(work, "release.json");
  writeFileSync(releaseOut, "brand-bound rendered bytes");
  writeFileSync(releaseEvidence, "brand-bound evidence bytes");
  const tool = { packageVersion: "benchmark", compilerCacheVersion: "benchmark" };
  const fingerprint = releaseFingerprint(artifacts, score, work, tool);
  assert.equal(fingerprint.files.brand?.path, path.resolve(lockedFile), "release fingerprint must include the locked Brand file");
  const receipt = makeReleaseReceipt({
    receiptFile: releaseReceipt, fingerprint, tool, quality: "high", findings: [],
    summary: { p1: 0, p2: 0, p3: 0, hardDefects: 0, styleFlags: 0, acceptedStyleFlags: 0, releasable: true },
    sampledFrames: 1, maxIntervalMs: 250,
    render: { path: releaseOut, durationMs: 1000, frames: 30, width: 1920, height: 1080, fps: 30, audio: { status: "missing" } },
    evidenceFiles: [releaseEvidence],
  });
  writeFileSync(releaseReceipt, `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(verifyReleaseReceipt(releaseReceipt).ok, true, "brand-bound release receipt must self-verify");
  const lockedBytes = readFileSync(lockedFile);
  writeFileSync(lockedFile, `${readFileSync(lockedFile, "utf8")}\n`);
  assert(verifyReleaseReceipt(releaseReceipt).issues.includes("brand input hash changed"), "Brand drift must stale a release receipt");
  writeFileSync(lockedFile, lockedBytes);
  assert.throws(() => assertReleaseTargets(artifacts, score, work, { out: lockedFile, evidence: path.join(work, "safe-evidence"), receipt: path.join(work, "safe-receipt.json") }), /overwrite an input/, "release output must not overwrite the locked Brand file");

  if (!check) writeFileSync(path.join(import.meta.dirname, "results.md"), `# Brand System benchmark — 2026-07-18

- Locked one reusable brand from **3 source artifacts**, **3 authored rules**, a **7-role palette**, and **2 local WOFF2 faces**.
- Exact Brand→Intake→Direction→Score conformance: **green**.
- Custom licensed typography rendered in a real browser and repeated **byte-identically** across independent sessions.
- Changed font bytes invalidated scene cache identity.
- Binding, palette, font, rule-text, source-role, and font-rights drift were caught by **CC-BRAND-3..6/CC-ASSET-2**.
- Missing font weight, invalid WOFF2 bytes, traversal, symlink escape, stale SHA-256, and stale Brand digest were rejected.
- CLI lock/conformance matched the library result, and brand-bound
  \`creative-check\`/release refused omission before the check passed with the
  locked profile.
- A successful synthetic release receipt bound the Brand file, detected later
  Brand-byte drift, and protected the Brand input from release-target overwrite.

This proves deterministic brand evidence and executable style survival. It does
not prove automatic brand interpretation or professionally good brand expression.
`);
  console.log("✔ brand system: locked evidence, exact palette/type/rule conformance, custom WOFF2 render, cache invalidation, six drift and six trust-boundary defects rejected");
} finally {
  rmSync(work, { recursive: true, force: true });
}
