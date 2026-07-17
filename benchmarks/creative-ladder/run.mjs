#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { validateDirection, validateScore, validateStoryboard } from "../../core/dist/ir/schema.js";
import { validateIntake } from "../../core/dist/intake/schema.js";
import { runCreativeConformance, runDirectionStoryboardConformance, runIntakeDirectionConformance, runStoryboardScoreConformance } from "../../core/dist/gates/index.js";

const root = path.resolve(import.meta.dirname, "../..");
const scoreRaw = JSON.parse(readFileSync(path.join(root, "examples/launch-film/score.json"), "utf8"));
scoreRaw.scenes = scoreRaw.scenes.slice(0, 2);
const intakeRaw = {
  intakeVersion: "0.1.0", tier: "intake", projectId: "creative-ladder", title: "Creative ladder",
  objective: { primary: "Show why directed video is different", audience: "design-literate builders", singleMessage: "Taste is the product" },
  deliverable: { register: "brand-film", targetDurationMs: 8000, width: 1920, height: 1080 },
  sources: [{ id: "user-brief", kind: "direction-prompt", roles: ["content", "constraint"], origin: { type: "inline", content: "Make the argument feel inevitable and restrained." }, usage: "Defines the message and emotional register", rights: "owned" }],
  preferences: [{ id: "restraint", statement: "Prefer restrained motion", polarity: "prefer", priority: "must", sourceIds: ["user-brief"] }],
  brand: { constraints: [{ id: "no-logo-open", statement: "Do not open on the logo", priority: "must", sourceIds: ["user-brief"] }] },
  constraints: { mustInclude: ["Taste is the product"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: [] },
};
const directionRaw = {
  directionVersion: "0.3.0", irVersion: "0.1.0", tier: "direction", id: "taste-direction", title: "Taste is the product", register: "brand-film",
  logline: "Rendering is common; directed judgment is rare.", narrativeArc: "Establish the rendering baseline, expose the missing judgment, then resolve with direction.", tone: ["assured", "restrained"], audience: "design-literate builders",
  deliverable: { targetDurationMs: 8000, width: 1920, height: 1080 },
  creativeConcept: { emotionalPromise: "Clarity replaces noise", governingIdea: "Taste is the product", tension: "Every tool renders but few can direct", resolution: "A governed creative ladder preserves intent", visualThesis: "Sparse type yields to one decisive contrast" },
  productionApproach: { requirements: [{ id: "thesis-type", description: "Compose the central thesis as restrained typography", importance: "must", capabilityId: "typography-layout", support: "native", approach: "Use native type and shape elements", acceptanceTest: "Hero still has one unambiguous typographic hierarchy" }] },
  trace: { intakeProjectId: "creative-ladder", objective: { primary: "Show why directed video is different", audience: "design-literate builders", singleMessage: "Taste is the product" }, constraints: { mustInclude: ["Taste is the product"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: [] }, sourceIds: ["user-brief"], preferenceIds: ["restraint"], brandConstraintIds: ["no-logo-open"], assumptionIds: [] },
  scenes: [
    { id: "cold-open", narrativeRole: "establish the baseline", shotIntent: "Rendering feels abundant but incomplete", pacingWeight: 1, sourceIds: ["user-brief"], preferenceIds: ["restraint"] },
    { id: "problem", narrativeRole: "name the missing layer", shotIntent: "The direction gap becomes undeniable", heroMoment: "The contrast between renders and direction lands", pacingWeight: 1.5, sourceIds: ["user-brief"], preferenceIds: ["restraint"] },
  ],
};
const storyboardRaw = {
  storyboardVersion: "0.1.0", tier: "storyboard", title: "Taste is the product", register: "brand-film", directionId: "taste-direction", deliverable: { targetDurationMs: 8000, width: 1920, height: 1080 },
  shots: [
    { id: "cold-open", directionBeatId: "cold-open", reason: "Establish the familiar baseline first", whyNow: "The argument needs a shared starting point", shotIntent: "Rendering feels abundant but incomplete", sourceIds: ["user-brief"], preferenceIds: ["restraint"], hero: { description: "The opening thesis", elementType: "text" }, composition: { layout: "quiet centered field", hierarchy: "one thesis over a small kicker", negativeSpace: "wide margins keep the claim calm" }, camera: { movement: "locked", reason: "A locked frame makes the opening confident" }, typography: { intent: "declarative display line", onScreenCopy: ["Taste is the product."] }, colorIntent: "Near-black field with one cool accent", targetDurationMs: 3600, transition: { intent: "Dissolve from claim into evidence", preferredType: "fade" } },
    { id: "problem", directionBeatId: "problem", reason: "Turn the thesis into a concrete contrast", whyNow: "Evidence must follow the opening claim", shotIntent: "The direction gap becomes undeniable", sourceIds: ["user-brief"], preferenceIds: ["restraint"], hero: { description: "The first contrast line", elementType: "text" }, composition: { layout: "left anchored contrast", hierarchy: "first line leads and second answers", negativeSpace: "right field stays open for tension" }, camera: { movement: "locked", reason: "Typography carries the meaning without camera noise" }, typography: { intent: "two-line contrast", onScreenCopy: ["Every tool renders.", "Almost none direct."] }, colorIntent: "Warm white type with restrained accent rule", targetDurationMs: 4400, transition: { intent: "Cut forward after the contrast settles", preferredType: "cut" } },
  ],
};

const intake = validateIntake(intakeRaw), direction = validateDirection(directionRaw), storyboard = validateStoryboard(storyboardRaw), score = validateScore(scoreRaw);
assert(intake.ok && direction.ok && storyboard.ok && score.ok, "all creative ladder fixtures must validate");
assert.deepEqual(runCreativeConformance(intake.intake, direction.direction, storyboard.storyboard, score.score).filter((finding) => finding.severity !== "P3"), []);

const droppedPreference = structuredClone(direction.direction);
droppedPreference.trace.preferenceIds = [];
assert(runIntakeDirectionConformance(intake.intake, droppedPreference).some((finding) => finding.ruleId === "CC-INT-6"));
const droppedShot = structuredClone(storyboard.storyboard);
droppedShot.shots.pop();
assert(runDirectionStoryboardConformance(direction.direction, droppedShot).some((finding) => finding.ruleId === "CC-BOARD-2"));
const missingCopy = structuredClone(score.score);
missingCopy.scenes[0].elements.find((element) => element.type === "text" && element.content === "Taste is the product.").content = "Changed.";
assert(runStoryboardScoreConformance(storyboard.storyboard, missingCopy).some((finding) => finding.ruleId === "CC-SCORE-4"));

const temp = mkdtempSync(path.join(os.tmpdir(), "chitra-creative-ladder-"));
try {
  for (const [name, value] of [["intake", intakeRaw], ["direction", directionRaw], ["storyboard", storyboardRaw], ["score", scoreRaw]])
    writeFileSync(path.join(temp, `${name}.json`), JSON.stringify(value, null, 2));
  const cli = spawnSync(process.execPath, [path.join(root, "core/dist/cli/index.js"), "creative-check", ...["intake", "direction", "storyboard", "score"].map((name) => path.join(temp, `${name}.json`)), "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("✔ creative ladder: 4 typed tiers, 3 conformance boundaries, CLI chain green, 3 seeded drifts caught");
