#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { validateDirection, validateScore, validateStoryboard } from "../../core/dist/ir/schema.js";
import { materializeIntake } from "../../core/dist/intake/materialize.js";
import { runAssetProvenanceConformance } from "../../core/dist/gates/index.js";
import { openSession, sceneHash } from "../../core/dist/render/index.js";

const root = path.resolve(import.meta.dirname, "../..");
const project = mkdtempSync(path.join(os.tmpdir(), "chitra-source-assisted-"));
const sha = (value) => createHash("sha256").update(value).digest("hex");

try {
  mkdirSync(path.join(project, "assets"));
  const redCard = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="8" fill="#d02040"/></svg>\n';
  writeFileSync(path.join(project, "assets/card.svg"), redCard);
  writeFileSync(path.join(project, "assets/accent-motion.json"), JSON.stringify({
    v: "5.13.0", fr: 30, ip: 0, op: 31, w: 32, h: 32, assets: [],
    layers: [{
      ddd: 0, ind: 1, ty: 4, nm: "accent", sr: 1,
      ks: {
        o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [16, 16, 0] },
        a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        { ty: "el", d: 1, s: { a: 0, k: [12, 12] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [1, 1, 1, 1] }, o: { a: 0, k: 100 }, r: 1 },
      ],
      ip: 0, op: 31, st: 0, bm: 0,
    }],
  }));
  writeFileSync(path.join(project, "figure.html"), '<img src="assets/card.svg" style="width:100%;height:100%;object-fit:cover">\n');

  const intakeRaw = {
    intakeVersion: "0.1.0", tier: "intake", projectId: "source-assisted-proof", title: "Source-assisted proof",
    objective: { primary: "Prove rights-aware source-assisted rendering", audience: "motion system builders", singleMessage: "Approved source bytes remain traceable" },
    deliverable: { register: "product-demo", targetDurationMs: 1000, width: 320, height: 320 },
    sources: [
      { id: "licensed-card", kind: "reference-image", roles: ["content", "style"], origin: { type: "path", path: "assets/card.svg" }, usage: "Supplies the licensed card artwork rendered in the proof", rights: "licensed" },
      { id: "licensed-motion", kind: "other", roles: ["content"], origin: { type: "path", path: "assets/accent-motion.json" }, usage: "Supplies a licensed vector animation imported through the typed Lottie contract", rights: "licensed" },
    ],
    preferences: [], brand: { constraints: [] }, constraints: { mustInclude: [], mustAvoid: [], legal: [], accessibility: [] }, assumptions: [], openQuestions: [],
  };
  const directionRaw = {
    directionVersion: "0.3.0", irVersion: "0.1.0", tier: "direction", id: "source-assisted-direction", title: "Trace the source", register: "product-demo",
    logline: "One approved asset proves a traceable reconstruction path.", narrativeArc: "Establish the approved source, render it faithfully, then hold for inspection.", tone: ["precise"], audience: "motion system builders",
    deliverable: { targetDurationMs: 1000, width: 320, height: 320 }, creativeConcept: { emotionalPromise: "Confidence replaces provenance ambiguity", governingIdea: "Every rendered source byte has a declared lineage", tension: "Untracked reference assets can invalidate a benchmark", resolution: "Rights and byte dependencies are checked before render", visualThesis: "One centered licensed card on a quiet field" },
    productionApproach: { requirements: [{ id: "licensed-image", description: "Render the licensed card as the only hero", importance: "must", capabilityId: "image-ui", support: "native", approach: "Use a declared local figure asset", acceptanceTest: "The licensed card pixels are visible and provenance-bound" }] },
    trace: { intakeProjectId: "source-assisted-proof", objective: { primary: "Prove rights-aware source-assisted rendering", audience: "motion system builders", singleMessage: "Approved source bytes remain traceable" }, constraints: { mustInclude: [], mustAvoid: [], legal: [], accessibility: [] }, sourceIds: ["licensed-card", "licensed-motion"], preferenceIds: [], brandConstraintIds: [], assumptionIds: [] },
    scenes: [{ id: "licensed-card-shot", narrativeRole: "prove the source-assisted boundary", shotIntent: "The approved asset is visibly rendered and traceable", heroMoment: "The licensed card holds for inspection", pacingWeight: 1, sourceIds: ["licensed-card", "licensed-motion"], preferenceIds: [] }],
  };
  const storyboardRaw = {
    storyboardVersion: "0.1.0", tier: "storyboard", title: "Trace the source", register: "product-demo", directionId: "source-assisted-direction", deliverable: { targetDurationMs: 1000, width: 320, height: 320 },
    shots: [{ id: "licensed-card-shot", directionBeatId: "licensed-card-shot", reason: "Render the approved source once with no visual ambiguity", whyNow: "The provenance contract needs a visible end-to-end proof", shotIntent: "The approved asset is visibly rendered and traceable", sourceIds: ["licensed-card", "licensed-motion"], preferenceIds: [], hero: { description: "The licensed card", elementType: "figure" }, composition: { layout: "centered single asset", hierarchy: "one card is the only visual priority", negativeSpace: "quiet margins isolate the evidence" }, camera: { movement: "locked", reason: "A locked view makes asset inspection unambiguous" }, typography: { intent: "no copy needed", onScreenCopy: [] }, colorIntent: "Dark neutral field around the supplied red card", targetDurationMs: 1000, transition: { intent: "End on the inspected asset", preferredType: "cut" } }],
  };
  const scoreRaw = {
    irVersion: "0.1.0", tier: "score",
    meta: { title: "Source-assisted proof", register: "product-demo", width: 320, height: 320, fps: 30, seed: 23, safeZone: "none", reconstruction: { mode: "source-assisted", referenceSourceIds: ["licensed-card"], reason: "Render licensed reference artwork while preserving the clean-room benchmark boundary" } },
    style: { name: "proof", palette: { bg: "#050607", surface: "#151719", primary: "#d02040", accent: "#4aa8a0", text: "#f4f4f2", textDim: "#9a9e9d", onMedia: "#ffffff" }, fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" }, displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0 },
    scenes: [{ id: "licensed-card-shot", reason: "Prove that licensed figure and Lottie bytes render with typed lineage and cache invalidation", durationMs: 1000, background: "bg", elements: [
      { type: "figure", id: "licensed-card", role: "hero", src: "figure.html", assets: [{ src: "assets/card.svg", assetUse: { sourceId: "licensed-card", kind: "direct", note: "Render the licensed synthetic card without changing its authored pixels" } }], position: { anchor: "center", x: 50, y: 50 }, width: 50, height: 50, radius: 0, shadow: false },
      { type: "lottie", id: "licensed-accent", role: "support", src: "assets/accent-motion.json", assetUse: { sourceId: "licensed-motion", kind: "direct", note: "Render the licensed vector animation through the bounded seekable import" }, position: { anchor: "top-left" }, width: 1, height: 1, compositing: { opacity: 0, blendMode: "normal", isolation: false, filters: [] } },
    ], choreography: [], transitionOut: { type: "cut", duration: "standard" } }],
  };

  const intake = await materializeIntake(intakeRaw, project);
  const direction = validateDirection(directionRaw), storyboard = validateStoryboard(storyboardRaw), score = validateScore(scoreRaw);
  assert(direction.ok && storyboard.ok && score.ok, "source-assisted fixtures must validate");
  assert.deepEqual(runAssetProvenanceConformance(intake, direction.direction, storyboard.storyboard, score.score), []);

  const firstHash = sceneHash(score.score, 0, project);
  writeFileSync(path.join(project, "assets/card.svg"), redCard.replace("#d02040", "#2050d0"));
  assert.notEqual(sceneHash(score.score, 0, project), firstHash, "nested asset bytes must invalidate the scene hash");
  writeFileSync(path.join(project, "assets/card.svg"), redCard);

  const session = await openSession(score.score, project, path.join(project, ".cache"));
  try {
    const frame = await session.seekAndCapture(0), repeated = await session.seekAndCapture(0);
    assert.equal(sha(frame), sha(repeated), "same-frame capture must repeat byte-identically");
    const frameFile = path.join(project, "frame.png");
    writeFileSync(frameFile, frame);
    const pixel = spawnSync("ffmpeg", ["-v", "error", "-i", frameFile, "-vf", "scale=1:1", "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1"], { encoding: null });
    assert.equal(pixel.status, 0, String(pixel.stderr));
    assert(pixel.stdout[0] > pixel.stdout[2], "rendered frame must contain the red source asset");
  } finally {
    await session.close();
  }

  for (const [name, value] of [["intake", intake], ["direction", directionRaw], ["storyboard", storyboardRaw], ["score", scoreRaw]])
    writeFileSync(path.join(project, `${name}.json`), JSON.stringify(value, null, 2) + "\n");
  const cli = spawnSync(process.execPath, [path.join(root, "core/dist/cli/index.js"), "creative-check", ...["intake", "direction", "storyboard", "score"].map((name) => path.join(project, `${name}.json`)), "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);

  const denied = structuredClone(intake); denied.sources[0].rights = "reference-only";
  assert(runAssetProvenanceConformance(denied, direction.direction, storyboard.storyboard, score.score).some((finding) => finding.ruleId === "CC-ASSET-2"));
  const cleanRoom = structuredClone(score.score); cleanRoom.meta.reconstruction.mode = "clean-room";
  assert(runAssetProvenanceConformance(intake, direction.direction, storyboard.storyboard, cleanRoom).some((finding) => finding.ruleId === "CC-ASSET-3"));

  console.log("✔ source-assisted: licensed figure+Lottie lineage green, nested bytes render + invalidate cache, repeat capture exact, reference-only and false clean-room claims blocked");
} finally {
  rmSync(project, { recursive: true, force: true });
}
