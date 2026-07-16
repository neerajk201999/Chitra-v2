#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { materializeIntake } from "../../core/dist/intake/materialize.js";

const root = mkdtempSync(path.join(os.tmpdir(), "chitra-intake-bench-"));
try {
  mkdirSync(path.join(root, "assets"));
  mkdirSync(path.join(root, "evidence"));
  writeFileSync(path.join(root, "assets", "reference.mp4"), "deterministic-reference");
  writeFileSync(path.join(root, "evidence", "style-dna.json"), "{\"tier\":\"style-dna\"}\n");
  const input = {
    intakeVersion: "0.1.0", tier: "intake", projectId: "mixed-input", title: "Mixed input benchmark",
    objective: { primary: "Direct a premium product film", audience: "product teams", singleMessage: "Work becomes legible" },
    deliverable: { register: "brand-film", targetDurationMs: 15000 },
    sources: [
      { id: "direction", kind: "direction-prompt", roles: ["content", "constraint"], origin: { type: "inline", content: "Assured, quiet, exact." }, usage: "Defines the user creative direction", rights: "owned" },
      { id: "reference", kind: "reference-video", roles: ["motion", "structure"], origin: { type: "path", path: "assets/reference.mp4" }, usage: "Supplies rhythm and camera grammar only", rights: "reference-only", evidence: [{ kind: "style-dna", path: "evidence/style-dna.json" }] },
      { id: "site", kind: "webpage", roles: ["content", "brand"], origin: { type: "url", url: "https://example.com" }, usage: "Identifies product facts to capture explicitly", rights: "unknown" },
    ],
    preferences: [
      { id: "restraint", statement: "Use one considered move per shot", polarity: "prefer", priority: "must", sourceIds: ["direction"] },
      { id: "no-slop", statement: "Avoid generic purple gradient cards", polarity: "avoid", priority: "must", sourceIds: ["direction"] },
    ],
    brand: { constraints: [] }, constraints: { mustInclude: [], mustAvoid: [], legal: [], accessibility: [] },
    assumptions: [], openQuestions: [{ id: "site-capture", question: "Which live product state is approved?", blocksDirection: false }],
  };
  const first = await materializeIntake(input, root);
  const second = await materializeIntake(input, root);
  assert.deepEqual(second, first, "repeated locking must be byte-equivalent as JSON data");
  assert.match(first.sources[0].origin.sha256, /^[0-9a-f]{64}$/);
  assert.match(first.sources[1].origin.sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.sources[2].origin.sha256, undefined, "uncaptured URLs must remain explicitly unlocked");
  assert.equal(first.sources[1].evidence.length, 1);
  console.log("✔ multimodal intake: 3 source origins, preferences + anti-reference, deterministic hashes, remote honesty");
} finally {
  rmSync(root, { recursive: true, force: true });
}
