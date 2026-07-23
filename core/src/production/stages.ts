/**
 * ADR-0045: role-owned staged Score handoffs.
 *
 * The comparison is intentionally structural and conservative. A specialist
 * who needs to change an earlier-stage decision redirects the artifact to that
 * stage instead of silently redesigning it downstream.
 */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import type { ScoreT } from "../ir/schema.js";
import { renderInputFiles } from "../render/index.js";

export type StageTransition = "board-to-motion" | "motion-to-master";

export interface StageFinding {
  ruleId: "CC-STAGE-1" | "CC-STAGE-2" | "CC-STAGE-3";
  severity: "P1";
  path: string;
  message: string;
}

export interface StageCheckOptions {
  fromProjectDir: string;
  toProjectDir: string;
}

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function changedPaths(a: unknown, b: unknown, path = "", out: string[] = []): string[] {
  if (out.length >= 16 || Object.is(a, b)) return out;
  if (a == null || b == null || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) {
    out.push(path || "<root>");
    return out;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path}.length`);
    const count = Math.min(a.length, b.length);
    for (let index = 0; index < count && out.length < 16; index++)
      changedPaths(a[index], b[index], `${path}[${index}]`, out);
    return out;
  }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const key of keys) {
    if (out.length >= 16) break;
    const child = path ? `${path}.${key}` : key;
    if (!(key in left) || !(key in right)) out.push(child);
    else changedPaths(left[key], right[key], child, out);
  }
  return out;
}

export function scoreStageDigest(score: ScoreT): string {
  return digest(score);
}

function boardSurface(score: ScoreT) {
  return {
    meta: score.meta,
    style: score.style,
    audio: score.audio ?? null,
    scenes: score.scenes.map(({ choreography: _choreography, transitionOut: _transitionOut, ...scene }) => scene),
  };
}

function stripSfx(score: ScoreT) {
  return {
    meta: score.meta,
    style: score.style,
    scenes: score.scenes.map((scene) => ({
      ...scene,
      choreography: scene.choreography.map(({ sfx: _sfx, ...animation }) => animation),
    })),
  };
}

function inputDigests(score: ScoreT, projectDir: string, ignoreAudio: boolean): Record<string, string> {
  const root = realpathSync(path.resolve(projectDir));
  const ignored = new Set<string>();
  if (ignoreAudio) {
    if (score.audio?.music) ignored.add(realpathSync(path.resolve(root, score.audio.music.src)));
    if (score.audio?.narration) ignored.add(realpathSync(path.resolve(root, score.audio.narration.src)));
    for (const scene of score.scenes)
      for (const animation of scene.choreography)
        if (animation.sfx) ignored.add(realpathSync(path.resolve(root, animation.sfx.src)));
  }
  return Object.fromEntries(renderInputFiles(score, root)
    .filter((file) => !ignored.has(file))
    .map((file) => [
      path.relative(root, file).split(path.sep).join("/"),
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ]));
}

function checkStage(
  from: ScoreT,
  to: ScoreT,
  transition: StageTransition,
  options?: StageCheckOptions,
): StageFinding[] {
  const findings: StageFinding[] = [];
  if (transition === "board-to-motion") {
    const authoredMotion = from.scenes.flatMap((scene) => scene.choreography.map((animation) => `${scene.id}/${animation.id}`));
    const authoredTransitions = from.scenes.filter((scene) => scene.transitionOut.type !== "cut").map((scene) => scene.id);
    if (authoredMotion.length || authoredTransitions.length)
      findings.push({
        ruleId: "CC-STAGE-1",
        severity: "P1",
        path: "from.scenes",
        message: `Board Score must contain no choreography or animated transitions before handoff; found ${[...authoredMotion, ...authoredTransitions.map((id) => `${id}/transitionOut`)].slice(0, 4).join(", ")}`,
      });
    const motionSfx = to.scenes.flatMap((scene) =>
      scene.choreography.filter((animation) => animation.sfx).map((animation) => `${scene.id}/${animation.id}`));
    if (motionSfx.length)
      findings.push({
        ruleId: "CC-STAGE-2",
        severity: "P1",
        path: "to.scenes.choreography.sfx",
        message: `Motion handoff added Sound-owned SFX: ${motionSfx.slice(0, 4).join(", ")}`,
      });
    const fromSurface = boardSurface(from), toSurface = boardSurface(to);
    if (digest(fromSurface) !== digest(toSurface))
      for (const path of changedPaths(fromSurface, toSurface))
        findings.push({
          ruleId: "CC-STAGE-2",
          severity: "P1",
          path: `to.${path}`,
          message: "Motion handoff changed an accepted Frame/Editorial surface; redirect this change to the board stage",
        });
    if (options) {
      const fromInputs = inputDigests(from, options.fromProjectDir, false);
      const toInputs = inputDigests(to, options.toProjectDir, false);
      for (const inputPath of changedPaths(fromInputs, toInputs))
        findings.push({
          ruleId: "CC-STAGE-2",
          severity: "P1",
          path: `to.renderInputs.${inputPath}`,
          message: "Motion handoff changed accepted render-input bytes",
        });
    }
    return findings;
  }

  const fromSurface = stripSfx(from), toSurface = stripSfx(to);
  if (digest(fromSurface) !== digest(toSurface))
    for (const path of changedPaths(fromSurface, toSurface))
      findings.push({
        ruleId: "CC-STAGE-3",
        severity: "P1",
        path: `to.${path}`,
        message: "Master handoff changed the accepted visual/timing/motion graph; only root audio and choreography-bound SFX may change",
      });
  if (options) {
    const fromInputs = inputDigests(from, options.fromProjectDir, true);
    const toInputs = inputDigests(to, options.toProjectDir, true);
    for (const inputPath of changedPaths(fromInputs, toInputs))
      findings.push({
        ruleId: "CC-STAGE-3",
        severity: "P1",
        path: `to.renderInputs.${inputPath}`,
        message: "Master handoff changed accepted visual render-input bytes",
      });
  }
  return findings;
}

/** Compare only typed Score ownership. This deliberately does not claim that
 * referenced render-input bytes are bound across project roots. */
export function checkStageStructure(
  from: ScoreT,
  to: ScoreT,
  transition: StageTransition,
): StageFinding[] {
  return checkStage(from, to, transition);
}

/** Release-safe stage comparison. Project roots are mandatory so identical
 * paths cannot conceal changed asset bytes. */
export function checkStageTransition(
  from: ScoreT,
  to: ScoreT,
  transition: StageTransition,
  options: StageCheckOptions,
): StageFinding[] {
  if (!options?.fromProjectDir || !options?.toProjectDir)
    throw new Error("stage byte comparison requires both fromProjectDir and toProjectDir");
  return checkStage(from, to, transition, options);
}
