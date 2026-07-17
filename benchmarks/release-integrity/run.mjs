#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { verifyReleaseReceipt } from "../../core/dist/release/index.js";

const root = path.resolve(import.meta.dirname, "../..");
const cli = path.join(root, "core/dist/cli/index.js");
const project = mkdtempSync(path.join(os.tmpdir(), "chitra-release-integrity-"));
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};

const intake = {
  intakeVersion: "0.1.0", tier: "intake", projectId: "release-proof", title: "Release proof",
  objective: { primary: "Prove that a Chitra release binds checks to delivered bytes", audience: "Chitra builders", singleMessage: "A release is a verified transaction" },
  deliverable: { register: "product-demo", targetDurationMs: 1800, width: 320, height: 320 },
  sources: [{ id: "brief", kind: "direction-prompt", roles: ["content", "constraint"], origin: { type: "inline", content: "Show one calm release claim." }, usage: "Defines the release proof", rights: "owned" }],
  preferences: [], brand: { constraints: [] }, constraints: { mustInclude: ["Release integrity."], mustAvoid: [], legal: [], accessibility: [] }, assumptions: [], openQuestions: [],
};
const direction = {
  directionVersion: "0.3.0", irVersion: "0.1.0", tier: "direction", id: "release-direction", title: "Release proof", register: "product-demo",
  logline: "One checked claim becomes one bound artifact.", narrativeArc: "State the claim, hold it for inspection, then release cleanly.", tone: ["calm", "precise"], audience: "Chitra builders",
  deliverable: { targetDurationMs: 1800, width: 320, height: 320 },
  creativeConcept: { emotionalPromise: "Confidence replaces release ambiguity", governingIdea: "A release is a verified transaction", tension: "Separate checks can become stale", resolution: "One transaction binds inputs and output", visualThesis: "One centered statement on a restrained field" },
  productionApproach: { requirements: [{ id: "release-type", description: "Hold one inspectable release statement", importance: "must", capabilityId: "typography-layout", support: "native", approach: "Use one native headline element", acceptanceTest: "Release statement is centered, legible, and isolated" }] },
  trace: { intakeProjectId: "release-proof", objective: intake.objective, constraints: intake.constraints, sourceIds: ["brief"], preferenceIds: [], brandConstraintIds: [], assumptionIds: [] },
  scenes: [{ id: "release", narrativeRole: "resolve stale release ambiguity", shotIntent: "Hold one verified release claim", heroMoment: "The release claim settles", pacingWeight: 1, sourceIds: ["brief"], preferenceIds: [] }],
};
const storyboard = {
  storyboardVersion: "0.1.0", tier: "storyboard", title: "Release proof", register: "product-demo", directionId: "release-direction",
  deliverable: { targetDurationMs: 1800, width: 320, height: 320 },
  shots: [{ id: "release", directionBeatId: "release", reason: "Prove the release contract with one inspectable frame", whyNow: "The transaction must be visible before its receipt matters", shotIntent: "Hold one verified release claim", sourceIds: ["brief"], preferenceIds: [], hero: { description: "The release claim", elementType: "text" }, composition: { layout: "centered single claim", hierarchy: "one line owns the frame", negativeSpace: "wide margins isolate the proof" }, camera: { movement: "locked", reason: "A locked view makes inspection unambiguous" }, typography: { intent: "one precise statement", onScreenCopy: ["Release integrity."] }, colorIntent: "Near-black with one mint accent", targetDurationMs: 1800, transition: { intent: "End after the claim clears", preferredType: "cut" } }],
};
const score = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Release proof", register: "product-demo", width: 320, height: 320, fps: 30, seed: 27, safeZone: "16x9-standard" },
  style: { name: "release-proof", palette: { bg: "#050706", surface: "#111713", primary: "#5ee6b1", accent: "#5ee6b1", text: "#f4f7f5", textDim: "#a7b0ab", onMedia: "#ffffff" }, fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" }, displayWeight: 600, textWeight: 400, trackingDisplay: -0.02, grain: 0 },
  scenes: [{ id: "release", reason: "Hold one claim long enough to inspect the verified output", durationMs: 1800, background: "bg", elements: [
    { type: "shape", id: "field", role: "ambient", shape: "gradient-field", position: { anchor: "center", x: 50, y: 50 }, width: 100, height: 100, color: "primary", opacity: 0.12 },
    { type: "text", id: "claim", role: "hero", textRole: "headline", content: "Release integrity.", position: { anchor: "center", x: 50, y: 50 }, maxWidth: 80, align: "center", color: "text" },
  ], choreography: [
    { id: "field-drift", target: "field", preset: "drift", at: { after: "scene-start", offsetMs: 0 }, override: { durationMs: 1800, reason: "The ambient field travels the full proof scene" } },
    { id: "claim-in", target: "claim", preset: "fade-up", duration: "standard", at: { after: "scene-start", offsetMs: 100 } },
    { id: "claim-out", target: "claim", preset: "fade-out", duration: "quick", at: { after: "scene-start", offsetMs: 1500 } },
  ], transitionOut: { type: "cut", duration: "standard" } }],
  audio: { music: { src: "assets/bed.wav", gainDb: -6, fadeOutMs: 300, firstBeatMs: 0 } },
};

try {
  mkdirSync(path.join(project, "assets"), { recursive: true });
  run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=2", path.join(project, "assets/bed.wav")]);
  for (const [name, value] of [["intake", intake], ["direction", direction], ["storyboard", storyboard], ["score", score]])
    writeFileSync(path.join(project, `${name}.json`), JSON.stringify(value, null, 2));
  run(process.execPath, [cli, "intake", path.join(project, "intake.json"), "-o", path.join(project, "intake.lock.json")]);
  const out = path.join(project, "out/final.mp4"), evidence = path.join(project, "out/evidence"), receipt = path.join(project, "out/release.json");
  const released = JSON.parse(run(process.execPath, [cli, "release", path.join(project, "intake.lock.json"), path.join(project, "direction.json"), path.join(project, "storyboard.json"), path.join(project, "score.json"), "-o", out, "-e", evidence, "-r", receipt, "--json"]));
  assert.equal(released.summary.p1, 0);
  assert.equal(released.audio.status, "present");
  assert(existsSync(path.join(evidence, "cut-strips.png")), "single-scene releases must include opening-to-closing boundary evidence");
  assert(Math.abs(released.audio.integratedLufs + 14) <= 0.5, `loudness ${released.audio.integratedLufs}`);
  assert(released.audio.truePeakDbtp <= -1.5, `true peak ${released.audio.truePeakDbtp}`);
  const verified = verifyReleaseReceipt(receipt);
  assert(verified.ok, verified.issues.join("; "));
  assert(verified.receipt.gates.sampledFrames > 3);

  const originalScore = readFileSync(path.join(project, "score.json"), "utf8");
  const changed = JSON.parse(originalScore);
  changed.meta.title = "Changed after release";
  writeFileSync(path.join(project, "score.json"), JSON.stringify(changed, null, 2));
  assert.equal(verifyReleaseReceipt(receipt).ok, false, "changed Score must stale the receipt");
  writeFileSync(path.join(project, "score.json"), originalScore);
  const unsafe = spawnSync(process.execPath, [cli, "release", path.join(project, "intake.lock.json"), path.join(project, "direction.json"), path.join(project, "storyboard.json"), path.join(project, "score.json"), "-o", path.join(project, "score.json"), "-e", path.join(project, "out/unsafe-evidence"), "-r", path.join(project, "out/unsafe-release.json"), "--json"], { encoding: "utf8" });
  assert.notEqual(unsafe.status, 0, "release must reject a video target that aliases an input");
  assert.equal(readFileSync(path.join(project, "score.json"), "utf8"), originalScore, "unsafe target rejection must preserve the input");
  writeFileSync(out, Buffer.concat([readFileSync(out), Buffer.from("tamper")]));
  assert.equal(verifyReleaseReceipt(receipt).ok, false, "changed output must stale the receipt");
  console.log(`✔ release integrity: ${released.releaseId}, ${released.audio.integratedLufs.toFixed(2)} LUFS, ${released.audio.truePeakDbtp.toFixed(2)} dBTP, stale input/output refused`);
} finally {
  rmSync(project, { recursive: true, force: true });
}
