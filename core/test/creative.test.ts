import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDirection, validateScore, validateStoryboard } from "../src/ir/schema.js";
import { validateIntake } from "../src/intake/schema.js";
import {
  runCreativeConformance,
  runAssetProvenanceConformance,
  runDirectionStoryboardConformance,
  runIntakeDirectionConformance,
  runStoryboardScoreConformance,
  runProductionApproachConformance,
} from "../src/gates/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const flagship = JSON.parse(readFileSync(path.join(here, "../../examples/launch-film/score.json"), "utf8"));

const intakeRaw = () => ({
  intakeVersion: "0.1.0", tier: "intake", projectId: "creative-ladder", title: "Creative ladder",
  objective: { primary: "Show why directed video is different", audience: "design-literate builders", singleMessage: "Taste is the product" },
  deliverable: { register: "brand-film", targetDurationMs: 8000, width: 1920, height: 1080 },
  sources: [{ id: "user-brief", kind: "direction-prompt", roles: ["content", "constraint"], origin: { type: "inline", content: "Make the argument feel inevitable and restrained." }, usage: "Defines the message and emotional register", rights: "owned" }],
  preferences: [{ id: "restraint", statement: "Prefer restrained motion", polarity: "prefer", priority: "must", sourceIds: ["user-brief"] }],
  brand: { constraints: [{ id: "no-logo-open", statement: "Do not open on the logo", priority: "must", sourceIds: ["user-brief"] }] },
  constraints: { mustInclude: ["Taste is the product"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: [] },
  assumptions: [], openQuestions: [],
});

const directionRaw = () => ({
  directionVersion: "0.3.0", irVersion: "0.1.0", tier: "direction", id: "taste-direction", title: "Taste is the product", register: "brand-film",
  logline: "Rendering is common; directed judgment is rare.",
  narrativeArc: "Establish the rendering baseline, expose the missing judgment, then resolve with direction.",
  tone: ["assured", "restrained"], audience: "design-literate builders",
  deliverable: { targetDurationMs: 8000, width: 1920, height: 1080 },
  creativeConcept: {
    emotionalPromise: "Clarity replaces noise",
    governingIdea: "Taste is the product",
    tension: "Every tool renders but few can direct",
    resolution: "A governed creative ladder preserves intent",
    visualThesis: "Sparse type yields to one decisive contrast",
  },
  productionApproach: { requirements: [{ id: "thesis-type", description: "Compose the central thesis as restrained typography", importance: "must", capabilityId: "typography-layout", support: "native", approach: "Use native type and shape elements", acceptanceTest: "Hero still has one unambiguous typographic hierarchy" }] },
  trace: {
    intakeProjectId: "creative-ladder",
    objective: { primary: "Show why directed video is different", audience: "design-literate builders", singleMessage: "Taste is the product" },
    constraints: { mustInclude: ["Taste is the product"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: [] },
    sourceIds: ["user-brief"], preferenceIds: ["restraint"], brandConstraintIds: ["no-logo-open"], assumptionIds: [],
  },
  scenes: [
    { id: "cold-open", narrativeRole: "establish the baseline", shotIntent: "Rendering feels abundant but incomplete", pacingWeight: 1, sourceIds: ["user-brief"], preferenceIds: ["restraint"] },
    { id: "problem", narrativeRole: "name the missing layer", shotIntent: "The direction gap becomes undeniable", heroMoment: "The contrast between renders and direction lands", pacingWeight: 1.5, sourceIds: ["user-brief"], preferenceIds: ["restraint"] },
  ],
});

const storyboardRaw = () => ({
  storyboardVersion: "0.1.0", tier: "storyboard", title: "Taste is the product", register: "brand-film", directionId: "taste-direction",
  deliverable: { targetDurationMs: 8000, width: 1920, height: 1080 },
  shots: [
    {
      id: "cold-open", directionBeatId: "cold-open", reason: "Establish the familiar baseline first", whyNow: "The argument needs a shared starting point", shotIntent: "Rendering feels abundant but incomplete", sourceIds: ["user-brief"], preferenceIds: ["restraint"],
      hero: { description: "The opening thesis", elementType: "text" },
      composition: { layout: "quiet centered field", hierarchy: "one thesis over a small kicker", negativeSpace: "wide margins keep the claim calm" },
      camera: { movement: "locked", reason: "A locked frame makes the opening confident" },
      typography: { intent: "declarative display line", onScreenCopy: ["Taste is the product."] },
      colorIntent: "Near-black field with one cool accent", targetDurationMs: 3600,
      transition: { intent: "Dissolve from claim into evidence", preferredType: "fade" },
    },
    {
      id: "problem", directionBeatId: "problem", reason: "Turn the thesis into a concrete contrast", whyNow: "Evidence must follow the opening claim", shotIntent: "The direction gap becomes undeniable", sourceIds: ["user-brief"], preferenceIds: ["restraint"],
      hero: { description: "The first contrast line", elementType: "text" },
      composition: { layout: "left anchored contrast", hierarchy: "first line leads and second answers", negativeSpace: "right field stays open for tension" },
      camera: { movement: "locked", reason: "Typography carries the meaning without camera noise" },
      typography: { intent: "two-line contrast", onScreenCopy: ["Every tool renders.", "Almost none direct."] },
      colorIntent: "Warm white type with restrained accent rule", targetDurationMs: 4400,
      transition: { intent: "Cut forward after the contrast settles", preferredType: "cut" },
    },
  ],
});

describe("production capability fit", () => {
  it("blocks unsupported must-haves and missing asset-assisted heroes", () => {
    const unsupported = directionRaw();
    unsupported.productionApproach.requirements[0] = {
      id: "taste-guarantee", description: "Guarantee professional taste without calibration", importance: "must",
      capabilityId: "professional-taste", support: "unsupported", approach: "Claim the critic is sufficient",
      acceptanceTest: "Independent reviewers prefer the result",
    };
    expect(validateDirection(unsupported).ok).toBe(false);

    const assisted = directionRaw();
    assisted.productionApproach.requirements[0] = {
      id: "custom-product", description: "Show a custom industrial product as the hero", importance: "must",
      capabilityId: "arbitrary-3d", support: "asset-assisted", approach: "Render an authorized product plate",
      acceptanceTest: "The supplied product silhouette and materials remain faithful", assetPath: "assets/product.mp4",
    };
    const direction = validateDirection(assisted);
    const score = validateScore(structuredClone(flagship));
    expect(direction.ok && score.ok).toBe(true);
    if (direction.ok && score.ok)
      expect(runProductionApproachConformance(direction.direction, score.score).some((item) => item.ruleId === "CC-PROD-2" && item.severity === "P1")).toBe(true);
  });
});

function fixtures() {
  const intake = validateIntake(intakeRaw());
  const direction = validateDirection(directionRaw());
  const storyboard = validateStoryboard(storyboardRaw());
  const score = validateScore({ ...structuredClone(flagship), scenes: structuredClone(flagship.scenes.slice(0, 2)) });
  if (!intake.ok || !direction.ok || !storyboard.ok || !score.ok) throw new Error("creative fixtures must validate");
  return { intake: intake.intake, direction: direction.direction, storyboard: storyboard.storyboard, score: score.score };
}

describe("creative ladder conformance (ADR-0018)", () => {
  it("rejects duplicate provenance IDs before they can fake coverage", () => {
    const direction = directionRaw();
    direction.trace.sourceIds.push("user-brief");
    expect(validateDirection(direction).ok).toBe(false);
    const storyboard = storyboardRaw();
    storyboard.shots[0].sourceIds.push("user-brief");
    expect(validateStoryboard(storyboard).ok).toBe(false);
  });

  it("validates the complete Intake → Direction → Storyboard → Score chain", () => {
    const value = fixtures();
    expect(runCreativeConformance(value.intake, value.direction, value.storyboard, value.score).filter((finding) => finding.severity !== "P3")).toEqual([]);
  });

  it("blocks dropped must-preferences, unresolved blockers, and rejected assumptions", () => {
    const value = fixtures();
    value.direction.trace.preferenceIds = [];
    value.direction.trace.constraints.mustAvoid = [];
    value.intake.openQuestions.push({ id: "approval", question: "Which claim is approved?", blocksDirection: true });
    value.intake.assumptions.push({ id: "claim", statement: "A claim is approved", risk: "high", status: "rejected" });
    value.direction.trace.assumptionIds.push("claim");
    const ids = runIntakeDirectionConformance(value.intake, value.direction).map((finding) => finding.ruleId);
    expect(ids).toContain("CC-INT-3");
    expect(ids).toContain("CC-INT-5");
    expect(ids).toContain("CC-INT-6");
    expect(ids).toContain("CC-INT-8");
  });

  it("catches dropped, invented, and reordered storyboard beats", () => {
    const value = fixtures();
    value.storyboard.shots.reverse();
    value.storyboard.shots[0].directionBeatId = "invented";
    const ids = runDirectionStoryboardConformance(value.direction, value.storyboard).map((finding) => finding.ruleId);
    expect(ids).toContain("CC-BOARD-2");
    expect(ids).toContain("CC-BOARD-5");
  });

  it("catches missing copy, wrong hero type, duration drift, and scene reordering", () => {
    const value = fixtures();
    value.storyboard.shots[0].hero!.elementType = "video";
    const openingCopy = value.score.scenes[0].elements.find((element) => element.type === "text" && element.content === "Taste is the product.");
    if (openingCopy?.type === "text") openingCopy.content = "Changed copy.";
    value.score.scenes[0].durationMs = 6000;
    value.score.scenes.reverse();
    const ids = runStoryboardScoreConformance(value.storyboard, value.score).map((finding) => finding.ruleId);
    expect(ids).toContain("CC-SCORE-3");
    expect(ids).toContain("CC-SCORE-4");
    expect(ids).toContain("CC-SCORE-5");
    expect(ids).toContain("CC-SCORE-7");
  });

  it("ADR-0026 finds planned copy authored inside a project-local figure", () => {
    const value = fixtures();
    value.storyboard.shots[0].hero!.elementType = "figure";
    value.storyboard.shots[0].typography.onScreenCopy.push("akta.pro");
    value.score.scenes[0].elements = [{
      type: "figure", id: "proof", role: "hero", src: "proof.html", assets: [],
      position: { anchor: "center" }, width: 80, height: 80, radius: 0, shadow: false,
    }];
    const project = mkdtempSync(path.join(os.tmpdir(), "chitra-figure-copy-"));
    try {
      writeFileSync(path.join(project, "proof.html"), "<div>Taste is <span>the product.</span><div>akta<span>.pro</span></div></div>");
      expect(runStoryboardScoreConformance(value.storyboard, value.score, project).some((finding) => finding.ruleId === "CC-SCORE-4")).toBe(false);
      writeFileSync(path.join(project, "proof.html"), "<div>Different copy.</div>");
      expect(runStoryboardScoreConformance(value.storyboard, value.score, project).some((finding) => finding.ruleId === "CC-SCORE-4")).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("separates clean-room from rights-approved source-assisted asset use", () => {
    const value = fixtures();
    value.intake.sources.push({ id: "licensed-card", kind: "reference-image", roles: ["content", "style"], origin: { type: "path", path: "assets/card.png", sha256: "0".repeat(64), bytes: 1 }, usage: "Supplies approved card artwork for the phone composition", rights: "licensed", evidence: [] });
    value.direction.trace.sourceIds.push("licensed-card");
    value.direction.scenes[0].sourceIds.push("licensed-card");
    value.storyboard.shots[0].sourceIds.push("licensed-card");
    value.score.meta.reconstruction = { mode: "source-assisted", referenceSourceIds: ["licensed-card"], reason: "Use licensed artwork to test asset fidelity separately from the clean-room renderer baseline" };
    value.score.scenes[0].elements.push({
      type: "image", id: "licensed-art", role: "support", src: "assets/card.png",
      assetUse: { sourceId: "licensed-card", kind: "derived", note: "Crop the approved artwork into the planned hero composition" },
      fit: "cover", position: { anchor: "center", x: 50, y: 50 }, width: 20, height: 20, radius: 0, scrim: 0,
    });
    expect(runAssetProvenanceConformance(value.intake, value.direction, value.storyboard, value.score)).toEqual([]);

    const untracked = structuredClone(value.score);
    const untrackedImage = untracked.scenes[0].elements.find((element) => element.id === "licensed-art");
    if (untrackedImage?.type === "image") untrackedImage.assetUse = undefined;
    expect(runAssetProvenanceConformance(value.intake, value.direction, value.storyboard, untracked).map((finding) => finding.ruleId)).toContain("CC-ASSET-1");

    const mismatched = structuredClone(value.score);
    const mismatchedImage = mismatched.scenes[0].elements.find((element) => element.id === "licensed-art");
    if (mismatchedImage?.type === "image") { mismatchedImage.src = "assets/other.png"; mismatchedImage.assetUse!.kind = "direct"; }
    expect(runAssetProvenanceConformance(value.intake, value.direction, value.storyboard, mismatched).map((finding) => finding.ruleId)).toContain("CC-ASSET-1");

    value.intake.sources.find((source) => source.id === "licensed-card")!.rights = "reference-only";
    expect(runAssetProvenanceConformance(value.intake, value.direction, value.storyboard, value.score).map((finding) => finding.ruleId)).toContain("CC-ASSET-2");
    value.intake.sources.find((source) => source.id === "licensed-card")!.rights = "licensed";

    value.score.meta.reconstruction.mode = "clean-room";
    expect(runAssetProvenanceConformance(value.intake, value.direction, value.storyboard, value.score).map((finding) => finding.ruleId)).toContain("CC-ASSET-3");
    value.score.meta.reconstruction.mode = "source-assisted";

    value.storyboard.shots[0].sourceIds = value.storyboard.shots[0].sourceIds.filter((id) => id !== "licensed-card");
    expect(runAssetProvenanceConformance(value.intake, value.direction, value.storyboard, value.score).map((finding) => finding.ruleId)).toContain("CC-ASSET-4");
  });
});
