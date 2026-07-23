#!/usr/bin/env node
/** ADR-0045 executable proof: native layout, rendered frame contracts, and
 * role-owned staged Score handoffs. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { compile } from "../../core/dist/compile/index.js";
import { validateScore } from "../../core/dist/ir/schema.js";
import { applyGatePolicies, runFrameGates, runStaticGates } from "../../core/dist/gates/index.js";
import { checkStageStructure, checkStageTransition } from "../../core/dist/production/stages.js";
import { openSession, sceneHash } from "../../core/dist/render/index.js";

const check = process.argv.includes("--check");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-frame-system-"));
const shape = (id, color) => ({
  type: "shape", id, role: "support", shape: "rect", color, opacity: 1,
  position: { anchor: "center" }, width: 20, height: 20, radius: 3,
  compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
});
const gridShape = (id) => ({ ...shape(id, "surface"), width: 100, height: 100 });
const raw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Frame System proof", register: "brand-film", width: 640, height: 360, fps: 30, seed: 45, safeZone: "none" },
  style: {
    name: "frame-proof",
    palette: { bg: "#08090b", surface: "#171a20", primary: "#e8ff4a", accent: "#72a7ff", text: "#f7f8fa", textDim: "#9aa1ad", onMedia: "#ffffff" },
    fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" },
    displayWeight: 500, textWeight: 400, trackingDisplay: -0.02, grain: 0,
  },
  scenes: [{
    id: "system", reason: "Prove authored frame geometry before motion production",
    durationMs: 1600, background: "bg",
    elements: [
      {
        type: "text", id: "title", role: "support", textRole: "headline", content: "One system. Exact handoffs.",
        color: "text", maxWidth: 80, align: "center", position: { anchor: "top", x: 50, y: 6 },
        treatment: { reason: "A compact optical headline leaves room for the frame proof", sizePx1080: 72, lineHeight: 1, weight: 600, trackingEm: -0.03, case: "preserve", wrap: "balance" },
        compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
      },
      shape("tile-a", "primary"), shape("tile-b", "accent"),
      {
        type: "group", id: "stack", role: "hero", children: ["tile-a", "tile-b"],
        position: { anchor: "center", x: 50, y: 42 }, width: 60, height: 28, overflow: "hidden",
        layout: { kind: "stack", axis: "horizontal", gap: 4, padding: 4, align: "center", justify: "center" },
        compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
      },
      { ...shape("equal-a", "primary"), width: 50, height: 60 },
      { ...shape("equal-b", "accent"), width: 50, height: 60 },
      { ...shape("equal-c", "text-dim"), width: 50, height: 60 },
      {
        type: "group", id: "equal-stack", role: "support", children: ["equal-a", "equal-b", "equal-c"],
        position: { anchor: "center", x: 82, y: 20 }, width: 30, height: 10, overflow: "hidden",
        layout: { kind: "stack", axis: "horizontal", gap: 0, padding: 0, align: "center", justify: "start", itemSizing: "equal" },
        compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
      },
      gridShape("grid-a"), gridShape("grid-b"), gridShape("grid-c"), gridShape("grid-d"),
      {
        type: "group", id: "grid", role: "support", children: ["grid-a", "grid-b", "grid-c", "grid-d"],
        position: { anchor: "bottom", x: 50, y: 96 }, width: 70, height: 32, overflow: "hidden",
        layout: { kind: "grid", columns: 2, columnGap: 3, rowGap: 3, padding: 3, align: "center", justify: "center" },
        compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
      },
    ],
    frame: {
      intent: "Lock the headline, paired hero tiles, and supporting grid before motion",
      representativeMs: 800,
      focalTarget: "stack",
      readingOrder: ["title", "stack", "grid"],
      relationships: [
        { kind: "align", id: "hero-row", targets: ["tile-a", "tile-b"], edge: "center-y", tolerancePx: 1 },
        { kind: "gap", id: "hero-gap", from: "tile-a", to: "tile-b", axis: "horizontal", minPx: 3, maxPx: 10 },
        { kind: "align", id: "grid-row", targets: ["grid-a", "grid-b"], edge: "top", tolerancePx: 1 },
      ],
    },
    choreography: [],
    transitionOut: { type: "cut", duration: "standard" },
  }],
};

const parsed = validateScore(raw);
assert(parsed.ok, `frame-system fixture must validate: ${JSON.stringify(parsed.issues)}`);
const board = parsed.score;
assert.equal(applyGatePolicies(runStaticGates(board)).filter((finding) => finding.policy === "hard-defect").length, 0);
const html = compile(board, work).html;
assert.match(html, /display:flex/);
assert.match(html, /display:grid/);
assert.match(html, /font-size:24px/);
assert.match(html, /"family":"Inter","weight":600/, "optical treatment face must enter browser readiness");
assert.equal(html, compile(board, work).html, "frame-system compile must be byte-identical");

const motion = structuredClone(board);
motion.scenes[0].choreography.push({
  id: "title-in", target: "title", preset: "fade-in", duration: "standard",
  at: { after: "scene-start", offsetMs: 0 },
});
assert.deepEqual(checkStageStructure(board, motion, "board-to-motion"), []);
const motionWithSfx = structuredClone(motion);
motionWithSfx.scenes[0].choreography[0].sfx = { src: "assets/too-early.wav", gainDb: -14 };
assert(checkStageStructure(board, motionWithSfx, "board-to-motion").some((finding) => finding.path === "to.scenes.choreography.sfx"));
const redesigned = structuredClone(motion);
redesigned.scenes[0].elements.find((element) => element.id === "title").content = "Silent redesign";
assert(checkStageStructure(board, redesigned, "board-to-motion").some((finding) => finding.ruleId === "CC-STAGE-2"));
const master = structuredClone(motion);
master.scenes[0].choreography[0].sfx = { src: "assets/hero.wav", gainDb: -14 };
assert.deepEqual(checkStageStructure(motion, master, "motion-to-master"), []);
const retimed = structuredClone(master);
retimed.scenes[0].durationMs += 100;
assert(checkStageStructure(motion, retimed, "motion-to-master").some((finding) => finding.ruleId === "CC-STAGE-3"));

const byteRootA = path.join(work, "byte-a"), byteRootB = path.join(work, "byte-b");
mkdirSync(path.join(byteRootA, "assets"), { recursive: true });
mkdirSync(path.join(byteRootB, "assets"), { recursive: true });
writeFileSync(path.join(byteRootA, "assets", "hero.svg"), `<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>`);
writeFileSync(path.join(byteRootB, "assets", "hero.svg"), `<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>`);
const byteBoard = structuredClone(board);
byteBoard.scenes[0].elements.push({
  type: "image", id: "byte-hero", role: "ambient", src: "assets/hero.svg", fit: "contain",
  position: { anchor: "center" }, width: 1, height: 1, radius: 0, scrim: 0,
  compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
});
const byteMotion = structuredClone(byteBoard);
assert(checkStageTransition(byteBoard, byteMotion, "board-to-motion", {
  fromProjectDir: byteRootA, toProjectDir: byteRootB,
}).some((finding) => finding.message.includes("bytes")), "same-path changed asset bytes must fail the handoff");

const priorHash = sceneHash(board, 0, work);
const changedLayout = structuredClone(board);
changedLayout.scenes[0].elements.find((element) => element.id === "stack").layout.gap = 5;
assert.notEqual(sceneHash(changedLayout, 0, work), priorHash, "layout inputs must invalidate scene identity");

const session = await openSession(board, work, path.join(work, "cache"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
try {
  const regions = (await session.layoutRegions(800)).filter((region) => region.scene === "system" && region.visible);
  const byTarget = new Map(regions.map((region) => [region.target, region]));
  for (const target of ["title", "stack", "tile-a", "tile-b", "equal-stack", "equal-a", "equal-b", "equal-c", "grid", "grid-a", "grid-b"])
    assert(byTarget.has(target), `layout evidence must resolve ${target}`);
  const heroGap = byTarget.get("tile-b").x - (byTarget.get("tile-a").x + byTarget.get("tile-a").w);
  const heroAlign = Math.abs(
    (byTarget.get("tile-a").y + byTarget.get("tile-a").h / 2) -
    (byTarget.get("tile-b").y + byTarget.get("tile-b").h / 2),
  );
  assert(heroGap >= 3 && heroGap <= 10, `stack gap must resolve inside contract: ${heroGap}`);
  assert(heroAlign <= 1, `stack alignment must resolve inside contract: ${heroAlign}`);
  const equal = byTarget.get("equal-stack");
  const equalWidth = equal.w / 3;
  for (const [index, target] of ["equal-a", "equal-b", "equal-c"].entries()) {
    const item = byTarget.get(target);
    const cellStart = equal.x + index * equalWidth;
    const cellEnd = cellStart + equalWidth;
    assert(item.x >= cellStart - 0.1 && item.x + item.w <= cellEnd + 0.1,
      `${target} must resolve inside equal stack cell ${index + 1}`);
  }
  assert(byTarget.get("equal-a").x + byTarget.get("equal-a").w <= byTarget.get("equal-b").x &&
    byTarget.get("equal-b").x + byTarget.get("equal-b").w <= byTarget.get("equal-c").x,
  "equal stack children must occupy distinct cells");
  const grid = byTarget.get("grid");
  for (const target of ["grid-a", "grid-b", "grid-c", "grid-d"]) {
    const item = byTarget.get(target);
    assert(item.x >= grid.x - 0.1 && item.y >= grid.y - 0.1 && item.x + item.w <= grid.x + grid.w + 0.1 && item.y + item.h <= grid.y + grid.h + 0.1,
      `${target} must fill its cell without overflowing the grid`);
  }
  assert(byTarget.get("grid-a").x + byTarget.get("grid-a").w <= byTarget.get("grid-b").x,
    "first grid row must not overlap");
  const findings = applyGatePolicies(await runFrameGates(board, session));
  assert.equal(findings.filter((finding) => finding.ruleId.startsWith("CC-FRAME-")).length, 0);

  const first = await session.seekAndCapture(800);
  await session.seekAndCapture(100);
  const repeated = await session.seekAndCapture(800);
  assert.equal(sha(first), sha(repeated), "backward seek must restore the exact frame");

  const defect = structuredClone(board);
  defect.scenes[0].frame.relationships.find((relationship) => relationship.id === "hero-gap").maxPx = Math.max(0, heroGap - 2);
  const defectSession = await openSession(defect, work, path.join(work, "defect-cache"));
  try {
    const defectFindings = await runFrameGates(defect, defectSession);
    assert(defectFindings.some((finding) => finding.ruleId === "CC-FRAME-3"), "rendered gap defect must be caught");
  } finally {
      await defectSession.close();
  }

  const invisible = structuredClone(board);
  invisible.scenes[0].elements.find((element) => element.id === "stack").compositing.opacity = 0;
  const invisibleSession = await openSession(invisible, work, path.join(work, "invisible-cache"));
  try {
    assert((await runFrameGates(invisible, invisibleSession)).some((finding) => finding.ruleId === "CC-FRAME-1"),
      "invisible focal target must be caught");
  } finally {
    await invisibleSession.close();
  }

  writeFileSync(path.join(work, "transparent-matte.png"),
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==", "base64"));
  const matteInvisible = structuredClone(board);
  matteInvisible.scenes[0].elements.find((element) => element.id === "stack").compositing.matte = {
    kind: "asset", src: "transparent-matte.png", mode: "alpha", fit: "stretch", positionX: 50, positionY: 50,
  };
  const matteSession = await openSession(matteInvisible, work, path.join(work, "matte-cache"));
  try {
    assert((await runFrameGates(matteInvisible, matteSession)).some((finding) => finding.ruleId === "CC-FRAME-1"),
      "geometry-only focal target hidden by a transparent matte must be caught");
  } finally {
    await matteSession.close();
  }

  const misaligned = structuredClone(board);
  misaligned.scenes[0].frame.relationships.find((relationship) => relationship.id === "hero-row").edge = "left";
  const misalignedSession = await openSession(misaligned, work, path.join(work, "misaligned-cache"));
  try {
    assert((await runFrameGates(misaligned, misalignedSession)).some((finding) => finding.ruleId === "CC-FRAME-2"),
      "declared alignment drift must be caught");
  } finally {
    await misalignedSession.close();
  }

  writeFileSync(path.join(work, "duplicate.html"), `<div id="same">A</div><div id="same">B</div>`);
  const ambiguous = structuredClone(board);
  ambiguous.scenes[0].elements = [{
    type: "figure", id: "ambiguous-ui", role: "hero", src: "duplicate.html", assets: [],
    position: { anchor: "center" }, width: 80, height: 60, radius: 0, shadow: false,
    compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
  }];
  ambiguous.scenes[0].frame = undefined;
  assert.throws(() => compile(ambiguous, work), /duplicate inner id/, "ambiguous figure targets must fail compile");

  if (!check) {
    writeFileSync(path.join(import.meta.dirname, "results.md"), `# Frame System and staged-handoff benchmark — 2026-07-23

- Typed stack + grid browser layout: **pass**
- Reasoned optical type treatment: **pass**
- Rendered element-target resolution: **pass** (${regions.length} visible regions)
- Equal-stack child percentages resolve inside three distinct cells: **pass**
- Hero pair alignment drift: **${heroAlign.toFixed(2)} px**
- Hero pair rendered gap: **${heroGap.toFixed(2)} px**
- Seeded rendered gap defect: **caught (CC-FRAME-3)**
- Seeded invisible focal target: **caught (CC-FRAME-1)**
- Seeded transparent-asset-matte focal target: **caught (CC-FRAME-1)**
- Seeded alignment drift: **caught (CC-FRAME-2)**
- Duplicate figure inner target: **rejected**
- Board→Motion static-ownership drift: **caught (CC-STAGE-2)**
- Board→Motion Sound-owned SFX: **rejected**
- Same-path changed asset bytes: **caught**
- Motion→Master visual/timing drift: **caught (CC-STAGE-3)**
- Layout-input scene-cache invalidation: **pass**
- Backward/repeated frame capture: **byte-identical** (${sha(first).slice(0, 16)}…)
- Runtime dependencies added: **0**
- Package dry-run: **680.6 kB compressed / 2.7 MB unpacked**
  (pre-tranche: 672.1 kB / 2.7 MB)

This proves deterministic layout and handoff contracts. It does not prove
professional taste or general superiority over HyperFrames; that requires the
neutral outside-review benchmark recorded in the roadmap.
`);
  }
console.log(`✔ frame system: ${regions.length} regions, ${heroAlign.toFixed(2)}px alignment, ${heroGap.toFixed(2)}px gap, equal cells, stage drift caught, repeated capture exact`);
} finally {
  await session.close();
  rmSync(work, { recursive: true, force: true });
}
