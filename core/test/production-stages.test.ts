import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateScore, type ScoreT } from "../src/ir/schema.js";
import { checkStageStructure, checkStageTransition, scoreStageDigest } from "../src/production/stages.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(path.join(here, "../../examples/launch-film/score.json"), "utf8"));
const parsed = validateScore(raw);
if (!parsed.ok) throw new Error("launch fixture must validate");

const fixture = (): ScoreT => structuredClone(parsed.score);

describe("ADR-0045 staged Score ownership", () => {
  it("accepts motion over a static board and rejects frame redesign", () => {
    const board = fixture();
    for (const scene of board.scenes) {
      scene.choreography = [];
      scene.transitionOut = { type: "cut", duration: "standard" };
    }
    const motion = structuredClone(board);
    motion.scenes[0].choreography = fixture().scenes[0].choreography;
    motion.scenes[0].transitionOut = { type: "fade", duration: "emphasis" };
    expect(checkStageStructure(board, motion, "board-to-motion")).toEqual([]);

    const redesigned = structuredClone(motion);
    const text = redesigned.scenes[0].elements.find((element) => element.type === "text");
    if (text?.type === "text") text.content = "Motion worker rewrote the accepted frame";
    expect(checkStageStructure(board, redesigned, "board-to-motion"))
      .toContainEqual(expect.objectContaining({ ruleId: "CC-STAGE-2" }));
    motion.scenes[0].choreography[0].sfx = { src: "assets/motion-owned.wav", gainDb: -14 };
    expect(checkStageStructure(board, motion, "board-to-motion"))
      .toContainEqual(expect.objectContaining({ ruleId: "CC-STAGE-2", path: "to.scenes.choreography.sfx" }));
  });

  it("requires a static board", () => {
    const board = fixture();
    expect(checkStageStructure(board, fixture(), "board-to-motion"))
      .toContainEqual(expect.objectContaining({ ruleId: "CC-STAGE-1" }));
    for (const scene of board.scenes) scene.choreography = [];
    board.scenes[0].transitionOut = { type: "fade", duration: "standard" };
    expect(checkStageStructure(board, fixture(), "board-to-motion"))
      .toContainEqual(expect.objectContaining({ ruleId: "CC-STAGE-1" }));
  });

  it("lets Sound add audio and SFX but not alter motion or timing", () => {
    const motion = fixture();
    const master = structuredClone(motion);
    master.audio = undefined;
    master.scenes[0].choreography[0].sfx = { src: "assets/click.wav", gainDb: -14 };
    expect(checkStageStructure(motion, master, "motion-to-master")).toEqual([]);

    const retimed = structuredClone(master);
    retimed.scenes[0].durationMs += 100;
    expect(checkStageStructure(motion, retimed, "motion-to-master"))
      .toContainEqual(expect.objectContaining({ ruleId: "CC-STAGE-3" }));
  });

  it("produces deterministic stage digests", () => {
    expect(scoreStageDigest(fixture())).toBe(scoreStageDigest(fixture()));
    const changed = fixture();
    changed.style.grain += 0.01;
    expect(scoreStageDigest(changed)).not.toBe(scoreStageDigest(fixture()));
  });

  it("binds accepted render-input bytes across different project roots", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "chitra-stage-bytes-"));
    const boardRoot = path.join(root, "board"), motionRoot = path.join(root, "motion");
    try {
      mkdirSync(path.join(boardRoot, "assets"), { recursive: true });
      mkdirSync(path.join(motionRoot, "assets"), { recursive: true });
      writeFileSync(path.join(boardRoot, "assets", "hero.png"), "accepted");
      writeFileSync(path.join(motionRoot, "assets", "hero.png"), "changed");
      const board = fixture();
      for (const scene of board.scenes) {
        scene.choreography = [];
        scene.transitionOut = { type: "cut", duration: "standard" };
      }
      board.scenes[0].elements.push({
        type: "image", id: "hero-asset", role: "support", src: "assets/hero.png",
        fit: "contain", position: { anchor: "center" }, width: 20, height: 20, radius: 0, scrim: 0,
        compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
      });
      const motion = structuredClone(board);
      expect(checkStageTransition(board, motion, "board-to-motion", {
        fromProjectDir: boardRoot, toProjectDir: motionRoot,
      })).toContainEqual(expect.objectContaining({ ruleId: "CC-STAGE-2", message: expect.stringContaining("bytes") }));
      writeFileSync(path.join(motionRoot, "assets", "hero.png"), "accepted");
      expect(checkStageTransition(board, motion, "board-to-motion", {
        fromProjectDir: boardRoot, toProjectDir: motionRoot,
      })).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("ADR-0045 frame-system schema", () => {
  it("accepts stack/grid layouts, reasoned type, and a frame contract", () => {
    const score = fixture();
    const scene = score.scenes[0];
    const children = scene.elements.slice(0, 2).map((element) => element.id);
    scene.elements.push({
      type: "group", id: "frame-stack", role: "hero", children,
      position: { anchor: "center" }, width: 80, height: 60, overflow: "visible",
      layout: { kind: "stack", axis: "vertical", gap: 2, padding: 2, align: "start", justify: "center" },
      compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
    });
    const text = scene.elements.find((element) => element.type === "text");
    if (text?.type === "text")
      text.treatment = { reason: "Optical scale makes the composed hero read correctly", sizePx1080: 72, lineHeight: 1, case: "preserve", wrap: "balance" };
    scene.frame = {
      intent: "Keep the two opening ideas on one exact vertical axis",
      focalTarget: children[0],
      readingOrder: children,
      relationships: [{ kind: "align", id: "opening-axis", targets: children, edge: "left", tolerancePx: 2 }],
    };
    expect(validateScore(score).ok).toBe(true);
  });

  it("rejects missing frame targets and inverted gap bounds", () => {
    const score = fixture();
    score.scenes[0].frame = {
      intent: "This invalid fixture exercises the contract boundary",
      focalTarget: "missing",
      readingOrder: ["missing"],
      relationships: [{ kind: "gap", id: "bad-gap", from: "missing", to: "missing", axis: "vertical", minPx: 20, maxPx: 10 }],
    };
    const result = validateScore(score);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.message).join(" ")).toMatch(/missing element|greater than/);
  });

  it("rejects vacuous frame relationships and unavailable type weights", () => {
    const score = fixture();
    const ids = score.scenes[0].elements.slice(0, 2).map((element) => element.id);
    score.scenes[0].frame = {
      intent: "Invalid repeated relationships cannot masquerade as proof",
      focalTarget: ids[0], readingOrder: ids,
      relationships: [
        { kind: "align", id: "same-target", targets: [ids[0], ids[0]], edge: "left", tolerancePx: 0 },
        { kind: "gap", id: "same-gap", from: ids[0], to: ids[0], axis: "horizontal", minPx: 0, maxPx: 0 },
      ],
    };
    const text = score.scenes[0].elements.find((element) => element.type === "text");
    if (text?.type === "text")
      text.treatment = { reason: "This unavailable bundled face must be rejected", weight: 700, case: "preserve", wrap: "normal" };
    const result = validateScore(score);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues.map((issue) => issue.message).join(" ")).toMatch(/unique|distinct|does not include/);
  });

  it("requires every custom optical treatment weight to be declared", () => {
    const score = fixture();
    score.style.fonts.display = "Acme Display";
    score.style.fontAssets = [{ family: "Acme Display", src: "assets/acme-500.woff2", weight: 500 }];
    const text = score.scenes[0].elements.find((element) => element.type === "text" && (element.textRole === "headline" || element.textRole === "display"));
    if (!text || text.type !== "text") throw new Error("fixture needs display text");
    text.treatment = { reason: "The optical treatment requests an undeclared custom face", weight: 700, case: "preserve", wrap: "normal" };
    const result = validateScore(score);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues.some((issue) => issue.message.includes("requires declared treatment weight 700"))).toBe(true);
  });

  it("rejects unavailable implicit kicker and stat-label faces", () => {
    for (const kind of ["kicker", "stat"] as const) {
      const score = fixture();
      score.style.fonts.text = "Instrument Serif";
      score.style.textWeight = 400;
      if (kind === "kicker")
        score.scenes[0].elements.push({
          type: "text", id: "implicit-kicker", role: "support", textRole: "kicker",
          content: "SIGNAL", color: "text", align: "left", position: { anchor: "center" },
          compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
        });
      else
        score.scenes[0].elements.push({
          type: "stat", id: "implicit-stat", role: "support", value: 20, label: "companies",
          format: "compact", decimals: 0, color: "text", position: { anchor: "center" },
          compositing: { opacity: 1, blendMode: "normal", isolation: false, filters: [] },
        });
      const result = validateScore(score);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.issues.some((issue) => issue.message.includes("does not include") && issue.message.includes("600"))).toBe(true);
    }
  });
});
