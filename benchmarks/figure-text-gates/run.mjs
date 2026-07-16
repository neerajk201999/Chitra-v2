#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateScore } from "../../core/dist/ir/schema.js";
import { runFrameGates } from "../../core/dist/gates/index.js";
import { openSession } from "../../core/dist/render/index.js";

const project = mkdtempSync(path.join(os.tmpdir(), "chitra-figure-text-"));
const scoreRaw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Figure text gate proof", register: "product-demo", width: 320, height: 320, fps: 30, seed: 24, safeZone: "16x9-standard" },
  style: { name: "proof", palette: { bg: "#050607", surface: "#151719", primary: "#d02040", accent: "#4aa8a0", text: "#f4f4f2", textDim: "#9a9e9d", onMedia: "#ffffff" }, fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" }, displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0 },
  scenes: [{ id: "figure-text", reason: "Prove that text authored inside a figure reaches every rendered typography gate", durationMs: 1000, background: "bg", elements: [{ type: "figure", id: "ui", role: "hero", src: "figure.html", assets: [], position: { anchor: "top-left", x: 0, y: 0 }, width: 100, height: 100, radius: 0, shadow: false }], choreography: [], transitionOut: { type: "cut", duration: "standard" } }],
};
const parsed = validateScore(scoreRaw);
assert(parsed.ok, "figure text benchmark score must validate");
const score = parsed.score;
const targeted = new Set(["MO-TYPE-1", "MO-TYPE-2", "MO-TYPE-4", "MO-EDIT-1", "QE-OVERLAP-1"]);

async function inspect(html, cache) {
  writeFileSync(path.join(project, "figure.html"), html);
  const session = await openSession(score, project, path.join(project, cache));
  try {
    const regions = (await session.textRegions(500)).filter((region) => region.origin === "figure");
    const findings = await runFrameGates(score, session);
    return { regions, findings: findings.filter((finding) => targeted.has(finding.ruleId)) };
  } finally {
    await session.close();
  }
}

try {
  const bad = await inspect(`
    <div id="tiny-label" style="position:absolute;left:0;top:140px;width:250px;color:#080808;font:3px/1.1 Inter">
      This unreadably long figure label cannot possibly be read in one second
    </div>
    <div id="overlap-label" style="position:absolute;left:0;top:140px;color:#080808;font:3px/1.1 Inter">Overlap</div>
  `, "bad-cache");
  assert.equal(bad.regions.length, 2);
  assert(bad.regions.every((region) => region.target?.startsWith("ui/")));
  const ids = new Set(bad.findings.map((finding) => finding.ruleId));
  for (const id of targeted) assert(ids.has(id), `expected ${id}, got ${[...ids].join(", ")}`);

  const good = await inspect('<div id="clear-label" style="position:absolute;left:64px;top:140px;color:#ffffff;font:16px/1.2 Inter">Clear</div>', "good-cache");
  assert.equal(good.regions.length, 1);
  assert.deepEqual(good.findings, []);

  const hidden = await inspect(`
    <div style="position:absolute;left:64px;top:140px;width:20px;height:10px;overflow:hidden">
      <span id="clipped-label" style="position:absolute;top:20px;color:#080808;font:3px Inter">Clipped text must not be gated</span>
    </div>
    <div id="transparent-label" style="position:absolute;left:64px;top:180px;color:rgba(255,255,255,0);font:3px Inter">Transparent text must not be gated</div>
  `, "hidden-cache");
  assert.equal(hidden.regions.length, 2);
  assert(hidden.regions.every((region) => !region.visible));
  assert.deepEqual(hidden.findings, []);

  console.log("✔ figure text gates: rendered DOM registration catches five typography rules; compliant, clipped, and transparent controls stay green");
} finally {
  rmSync(project, { recursive: true, force: true });
}
