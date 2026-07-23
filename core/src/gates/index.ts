/**
 * Quality Engine — Layer 2: deterministic gates (ADR-0004).
 * Every rule is ID-tagged to docs/motion/motion-language.md. Static gates
 * read the Score; frame gates read the actual render (text regions + pixels).
 * Priority is P1/P2/P3; independent policy decides whether release blocks.
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import type { SceneT, ScoreT, DirectionT, StoryboardT } from "../ir/schema.js";
import type { IntakeT } from "../intake/schema.js";
import { brandSystemDigest, type BrandSystemT } from "../brand/index.js";
import { resolveProjectAsset } from "../assets/local.js";
import { resolveSceneTimeline, totalDurationMs } from "../compile/index.js";
import {
  CHOREOGRAPHY,
  DURATIONS,
  PRESETS,
  REGISTERS,
  SAFE_ZONES,
  TYPE_SCALE,
  TYPOGRAPHY,
  type DurationToken,
  type PresetName,
  type Register,
  type SafeZone,
} from "../motion/tokens.js";
import type { RenderSession, TextRegion } from "../render/index.js";

export type GatePolicy = "hard-defect" | "style-flag";
type RulePolicy = GatePolicy | "required-meaning" | "p1-hard";

export interface Finding {
  ruleId: string;
  severity: "P1" | "P2" | "P3";
  path: string; // IR path (scenes[2].choreography[1]) or timecode context
  message: string;
  timecodeMs?: number;
  /** Added at the release/check boundary from the exhaustive registry below. */
  policy?: GatePolicy;
  /** Rendered/declared copy used to decide whether a legibility symptom affects required meaning. */
  subjectTexts?: string[];
  sceneId?: string;
  accepted?: { reason: string };
}
export type ClassifiedFinding = Omit<Finding, "policy"> & { policy: GatePolicy };

/**
 * Release policy is deliberately independent from priority (ADR-0041).
 * "required-meaning" resolves to hard-defect only when the affected copy is
 * explicitly required by locked Intake or approved Storyboard; otherwise it is
 * a non-blocking style flag. Unknown rule IDs fail closed.
 */
export const RULE_POLICIES = {
  "CC-ASSET-1": "hard-defect", "CC-ASSET-2": "hard-defect", "CC-ASSET-3": "hard-defect", "CC-ASSET-4": "hard-defect",
  "CC-BOARD-1": "hard-defect", "CC-BOARD-2": "hard-defect", "CC-BOARD-3": "style-flag", "CC-BOARD-4": "hard-defect",
  "CC-BOARD-5": "hard-defect", "CC-BOARD-6": "style-flag", "CC-BOARD-7": "p1-hard",
  "CC-BRAND-3": "hard-defect", "CC-BRAND-4": "hard-defect", "CC-BRAND-5": "hard-defect", "CC-BRAND-6": "hard-defect",
  "CC-CONF-1": "hard-defect", "CC-CONF-2": "hard-defect", "CC-CONF-3": "style-flag", "CC-CONF-4": "style-flag", "CC-CONF-5": "style-flag",
  "CC-INT-1": "hard-defect", "CC-INT-2": "hard-defect", "CC-INT-3": "hard-defect", "CC-INT-4": "hard-defect",
  "CC-INT-5": "hard-defect", "CC-INT-6": "hard-defect", "CC-INT-7": "hard-defect", "CC-INT-8": "hard-defect",
  "CC-PROD-1": "style-flag", "CC-PROD-2": "p1-hard",
  "CC-SCORE-1": "hard-defect", "CC-SCORE-2": "p1-hard", "CC-SCORE-3": "style-flag", "CC-SCORE-4": "hard-defect",
  "CC-SCORE-5": "style-flag", "CC-SCORE-6": "style-flag", "CC-SCORE-7": "hard-defect", "CC-SCORE-8": "p1-hard",
  "IR-CUR-1": "hard-defect", "IR-FIG-1": "style-flag", "IR-GROUP-1": "hard-defect", "IR-REF-1": "hard-defect", "IR-REF-2": "hard-defect",
  "MO-3D-1": "style-flag", "MO-3D-2": "hard-defect",
  "MO-AUD-2": "style-flag", "MO-AUD-3": "style-flag", "MO-AUD-4": "hard-defect", "MO-AUD-5": "hard-defect",
  "MO-CHOR-1": "style-flag", "MO-CHOR-2": "style-flag", "MO-CHOR-5": "style-flag",
  "MO-DUR-2": "style-flag", "MO-EASE-1": "style-flag", "MO-EASE-2": "style-flag",
  "MO-EDIT-1": "required-meaning", "MO-EDIT-2": "style-flag", "MO-EDIT-3": "style-flag", "MO-EDIT-5": "style-flag",
  "MO-KEY-1": "hard-defect", "MO-MED-1": "style-flag", "MO-PART-1": "hard-defect", "MO-PART-2": "style-flag", "MO-REG-1": "style-flag",
  "MO-SLOP-1": "style-flag", "MO-SLOP-2": "style-flag",
  "MO-TYPE-1": "required-meaning", "MO-TYPE-2": "required-meaning", "MO-TYPE-4": "style-flag",
  "QE-BLANK-1": "style-flag", "QE-OVERLAP-1": "required-meaning",
} as const satisfies Record<string, RulePolicy>;

export interface GatePolicyContext {
  intake?: IntakeT;
  storyboard?: StoryboardT;
}
export interface StyleAcceptance {
  ruleId: string;
  path: string;
  reason: string;
}

const normalizeMeaning = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();

export function applyGatePolicies(findings: Finding[], context: GatePolicyContext = {}): ClassifiedFinding[] {
  const globallyRequired = new Set<string>();
  for (const statement of context.intake?.constraints.mustInclude ?? []) globallyRequired.add(normalizeMeaning(statement));
  for (const statement of context.intake?.constraints.legal ?? []) globallyRequired.add(normalizeMeaning(statement));
  for (const statement of context.intake?.constraints.accessibility ?? []) globallyRequired.add(normalizeMeaning(statement));
  const storyboardRequired = new Map<string, Set<string>>();
  for (const shot of context.storyboard?.shots ?? [])
    storyboardRequired.set(shot.id, new Set(shot.typography.onScreenCopy.map(normalizeMeaning)));
  const allStoryboardRequired = new Set([...storyboardRequired.values()].flatMap((items) => [...items]));

  return findings.map((finding) => {
    const registered = (RULE_POLICIES as Record<string, RulePolicy>)[finding.ruleId];
    if (!registered) throw new Error(`gate policy registry is missing rule ${finding.ruleId}`);
    let policy: GatePolicy;
    if (finding.policy) policy = finding.policy;
    else if (registered === "p1-hard") policy = finding.severity === "P1" ? "hard-defect" : "style-flag";
    else if (registered !== "required-meaning") policy = registered;
    else {
      const subjects = (finding.subjectTexts ?? []).map(normalizeMeaning).filter(Boolean);
      const required = new Set([
        ...globallyRequired,
        ...(finding.sceneId ? storyboardRequired.get(finding.sceneId) ?? [] : allStoryboardRequired),
      ]);
      const affectsRequired = subjects.some((subject) =>
        [...required].some((item) => item === subject || subject.includes(item)));
      policy = affectsRequired ? "hard-defect" : "style-flag";
    }
    return { ...finding, policy } as ClassifiedFinding;
  });
}

export function applyStyleAcceptances(findings: ClassifiedFinding[], acceptances: StyleAcceptance[]): ClassifiedFinding[] {
  const seen = new Set<string>();
  const bySelector = new Map(findings.map((finding) => [`${finding.ruleId}|${finding.path}`, finding]));
  for (const acceptance of acceptances) {
    const selector = `${acceptance.ruleId}|${acceptance.path}`;
    if (seen.has(selector)) throw new Error(`duplicate style acceptance for ${acceptance.ruleId} at ${acceptance.path}`);
    seen.add(selector);
    if (acceptance.reason.trim().length < 8) throw new Error(`style acceptance reason must be at least 8 characters for ${acceptance.ruleId}`);
    const finding = bySelector.get(selector);
    if (!finding) throw new Error(`style acceptance does not match a finding: ${acceptance.ruleId} at ${acceptance.path}`);
    if (finding.policy !== "style-flag") throw new Error(`hard defect cannot be accepted: ${acceptance.ruleId} at ${acceptance.path}`);
  }
  return findings.map((finding) => {
    const acceptance = acceptances.find((candidate) => candidate.ruleId === finding.ruleId && candidate.path === finding.path);
    return acceptance ? { ...finding, accepted: { reason: acceptance.reason.trim() } } : finding;
  });
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const narrationWordStartMap = (score: ScoreT) => new Map(
  (score.audio?.narration?.words ?? []).map((word) => [
    word.id,
    (score.audio?.narration?.startMs ?? 0) + word.startMs,
  ]),
);

// ── Static gates ───────────────────────────────────────────────────────────
export function runStaticGates(score: ScoreT): Finding[] {
  const f: Finding[] = [];
  const reg = REGISTERS[score.meta.register as Register];
  const scale = Math.min(score.meta.width, score.meta.height) / 1080;
  const minPx = TYPOGRAPHY.minTextPx1080[score.meta.register as Register] * scale;

  const beats = score.audio?.music?.beats;
  const narrationWordStarts = narrationWordStartMap(score);
  const sceneStart = (idx: number) => score.scenes.slice(0, idx).reduce((a, s) => a + s.durationMs, 0);
  score.scenes.forEach((scene, si) => {
    const p = (rest: string) => `scenes[${si}]${rest}`;
    // MO-AUD-4 (ADR-0011): onBeat needs a declared beat grid. Checked before
    // timeline resolution so the specific message beats the generic IR-REF-1.
    scene.choreography.forEach((a, ai) => {
      if (a.at.onBeat == null) return;
      if (!beats?.length)
        f.push({ ruleId: "MO-AUD-4", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" uses at.onBeat but audio.music.beats is not declared — run \`chitra analyze-audio\`` });
      else if (a.at.onBeat >= beats.length)
        f.push({ ruleId: "MO-AUD-4", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" onBeat ${a.at.onBeat} exceeds ${beats.length} detected beats` });
    });
    scene.choreography.forEach((a, ai) => {
      if (a.at.onNarrationWord == null) return;
      const absolute = narrationWordStarts.get(a.at.onNarrationWord);
      const start = sceneStart(si);
      if (absolute == null)
        f.push({ ruleId: "MO-AUD-5", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" cites unknown narration word "${a.at.onNarrationWord}"` });
      else if (absolute < start || absolute >= start + scene.durationMs)
        f.push({ ruleId: "MO-AUD-5", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" cites narration word "${a.at.onNarrationWord}" outside scene "${scene.id}"` });
    });
    const resolved = safeResolve(scene, {
      sceneStartMs: sceneStart(si),
      beats,
      fps: score.meta.fps,
      narrationWordStarts,
    });
    if (!resolved) {
      f.push({ ruleId: "IR-REF-1", severity: "P1", path: p(".choreography"), message: "Choreography references an unknown animation id (broken relational timing)" });
      return;
    }

    // IR-REF-2: every animation target must resolve to an element (or group prefix)
    scene.choreography.forEach((a, ai) => {
      const exists = a.target.includes("/")
        ? // figure internals: the figure must exist here; the inner id is checked
          // against the live DOM at session open (missingTargets fails loudly)
          scene.elements.some((e) => e.id === a.target.split("/")[0] && e.type === "figure")
        : a.target.endsWith("*")
          ? scene.elements.some((e) => e.id.startsWith(a.target.slice(0, -1)))
          : scene.elements.some((e) => e.id === a.target);
      if (!exists)
        f.push({ ruleId: "IR-REF-2", severity: "P1", path: p(`.choreography[${ai}]`), message: `Animation "${a.id}" targets "${a.target}" but no such element exists in this scene${a.target.includes("/") ? " (figureId/innerId requires a figure element with that id)" : ""}` });
    });

    // IR-GROUP-1 (ADR-0021/0042): acyclic, bounded, single-owner hierarchy.
    const groupOwner = new Map<string, string>();
    const groups = new Map(scene.elements
      .filter((element): element is Extract<(typeof scene.elements)[number], { type: "group" }> => element.type === "group")
      .map((element) => [element.id, element]));
    scene.elements.forEach((element, ei) => {
      if (element.type !== "group") return;
      element.children.forEach((childId, ci) => {
        const child = scene.elements.find((candidate) => candidate.id === childId);
        const path = p(`.elements[${ei}].children[${ci}]`);
        if (!child)
          f.push({ ruleId: "IR-GROUP-1", severity: "P1", path, message: `group "${element.id}" references missing child "${childId}"` });
        const prior = groupOwner.get(childId);
        if (prior)
          f.push({ ruleId: "IR-GROUP-1", severity: "P1", path, message: `element "${childId}" belongs to both groups "${prior}" and "${element.id}"` });
        else groupOwner.set(childId, element.id);
      });
    });
    const visitGroup = (groupId: string, ancestry: string[]) => {
      if (ancestry.includes(groupId)) {
        f.push({
          ruleId: "IR-GROUP-1", severity: "P1", path: p(".elements"),
          message: `composition cycle ${[...ancestry, groupId].join(" -> ")}`,
        });
        return;
      }
      if (ancestry.length >= 8) {
        f.push({
          ruleId: "IR-GROUP-1", severity: "P1", path: p(".elements"),
          message: `composition depth exceeds 8 at "${groupId}"`,
        });
        return;
      }
      const next = [...ancestry, groupId];
      for (const childId of groups.get(groupId)?.children ?? [])
        if (groups.has(childId)) visitGroup(childId, next);
    };
    for (const groupId of groups.keys()) visitGroup(groupId, []);

    // IR-CUR-1 (ADR-0008): waypoints exist ONLY on cursor-move aimed at a cursor;
    // interaction presets must aim at their element kind.
    scene.choreography.forEach((a, ai) => {
      const target = scene.elements.find((e) => e.id === a.target);
      if (a.waypoints && a.preset !== "cursor-move")
        f.push({ ruleId: "IR-CUR-1", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" carries waypoints but preset is ${a.preset} — waypoints are cursor-move only` });
      if (a.preset === "cursor-move" || a.preset === "cursor-click") {
        if (target && target.type !== "cursor")
          f.push({ ruleId: "IR-CUR-1", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" (${a.preset}) targets "${a.target}" which is ${target.type}, not a cursor` });
        if (a.preset === "cursor-move" && !a.waypoints?.length)
          f.push({ ruleId: "IR-CUR-1", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" is cursor-move with no waypoints` });
      }
      if (a.preset === "type-in" && target && target.type !== "text")
        f.push({ ruleId: "IR-CUR-1", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" (type-in) targets "${a.target}" which is ${target.type}, not text` });
    });

    // MO-KEY-1 (ADR-0013): exact tracks are typed, frame-bounded, and an
    // explicit exception to the curated vocabulary — never a silent shortcut.
    scene.choreography.forEach((a, ai) => {
      const path = p(`.choreography[${ai}]`);
      if (a.preset !== "keyframe-track") {
        if (a.keyframes)
          f.push({ ruleId: "MO-KEY-1", severity: "P1", path, message: `"${a.id}" carries keyframes but preset is ${a.preset} — keyframes require keyframe-track` });
        return;
      }
      if (!a.keyframes?.length)
        f.push({ ruleId: "MO-KEY-1", severity: "P1", path, message: `"${a.id}" is keyframe-track with no keyframes` });
      if (!a.override?.reason)
        f.push({ ruleId: "MO-KEY-1", severity: "P1", path, message: `"${a.id}" is an exact track without override.reason explaining why presets are insufficient` });
      if (a.duration || a.override?.durationMs || a.override?.gsapEase || a.stagger || a.distance || a.direction || a.waypoints || a.morphTo)
        f.push({ ruleId: "MO-KEY-1", severity: "P1", path, message: `"${a.id}" mixes keyframes with incompatible preset controls; final frame sets duration and keyframes use token easings` });
      if (scene.choreography.some((other) => other !== a && other.preset !== "three-keyframe-track" && (
        other.target === a.target ||
        (other.target.endsWith("*") && a.target.startsWith(other.target.slice(0, -1))) ||
        (a.target.endsWith("*") && other.target.startsWith(a.target.slice(0, -1)))
      )))
        f.push({ ruleId: "MO-KEY-1", severity: "P1", path, message: `"${a.id}" does not exclusively own target "${a.target}" — exact tracks cannot stack with another tween on the same target` });
      const endMs = resolved.find((r) => r.anim.id === a.id);
      if (endMs && endMs.startMs + endMs.durationMs > scene.durationMs + 0.001)
        f.push({ ruleId: "MO-KEY-1", severity: "P1", path, message: `"${a.id}" ends at ${Math.round(endMs.startMs + endMs.durationMs)}ms, beyond scene duration ${scene.durationMs}ms` });
    });

    // MO-3D-2 (ADR-0028): internal Three state is a typed, single-owner track.
    scene.choreography.forEach((a, ai) => {
      const path = p(`.choreography[${ai}]`);
      if (a.preset !== "three-keyframe-track") {
        if (a.threeKeyframes)
          f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" carries threeKeyframes but preset is ${a.preset} — internal state requires three-keyframe-track` });
        return;
      }
      const target = scene.elements.find((element) => element.id === a.target);
      if (target?.type !== "scene3d")
        f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" requires one exact scene3d target; "${a.target}" resolves to ${target?.type ?? "a group or nested target"}` });
      if (!a.threeKeyframes?.length)
        f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" is three-keyframe-track with no threeKeyframes` });
      if (!a.override?.reason)
        f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" is an exact internal track without override.reason` });
      if (a.duration || a.easing || a.override?.durationMs || a.override?.gsapEase || a.stagger || a.distance || a.direction || a.waypoints || a.morphTo || a.morphPoints || a.keyframes)
        f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" mixes internal keyframes with incompatible controls; final frame sets duration and segments use token easings` });
      if (scene.choreography.some((other) => other !== a && other.preset === "three-keyframe-track" && other.target === a.target))
        f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" does not exclusively own internal state for target "${a.target}"` });
      const end = resolved.find((item) => item.anim.id === a.id);
      if (end && end.startMs + end.durationMs > scene.durationMs + 0.001)
        f.push({ ruleId: "MO-3D-2", severity: "P1", path, message: `"${a.id}" ends at ${Math.round(end.startMs + end.durationMs)}ms, beyond scene duration ${scene.durationMs}ms` });
    });

    // MO-3D-1 (ADR-0010): a 3D subject must settle, not spin forever (perpetual
    // rotation reads as a screensaver, not a hero). spinDeg is bounded in schema
    // (≤40°); a scene3d marked hero should be the only hero (handled by MO-CHOR-2).
    scene.elements.forEach((el, ei) => {
      if (el.type !== "scene3d") return;
      if (el.spinDeg > 30)
        f.push({ ruleId: "MO-3D-1", severity: "P2", path: p(`.elements[${ei}]`), message: `scene3d "${el.id}" spin ${el.spinDeg}° is agitated — a hero product settles (≤30° gentle oscillation)` });
    });

    // MO-PART-1/2 (ADR-0009): structure is hard; density is reviewable.
    scene.elements.forEach((el, ei) => {
      if (el.type !== "particles") return;
      const n = el.formation === "grid" ? el.cols * el.rows : el.formation === "custom" ? (el.points?.length ?? 0) : el.count;
      if (n > 400)
        f.push({ ruleId: "MO-PART-2", severity: "P1", path: p(`.elements[${ei}]`), message: `particle field "${el.id}" has ${n} dots (recommended max 400 — performance and density review)` });
      if (el.formation === "custom" && !el.points?.length)
        f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.elements[${ei}].points`), message: `custom particle field "${el.id}" requires ordered points` });
      if (el.formation !== "custom" && el.points)
        f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.elements[${ei}].points`), message: `particle field "${el.id}" supplies points but formation is ${el.formation}` });
    });
    scene.choreography.forEach((a, ai) => {
      const target = scene.elements.find((e) => e.id === a.target);
      if (a.morphTo && a.preset !== "particle-morph")
        f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" has morphTo but preset is ${a.preset} — morphTo is particle-morph only` });
      if (a.morphPoints && (a.preset !== "particle-morph" || a.morphTo !== "custom"))
        f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.choreography[${ai}].morphPoints`), message: `"${a.id}" has morphPoints without a custom particle-morph` });
      const isPart = a.preset === "particle-shimmer" || a.preset === "particle-form" || a.preset === "particle-morph";
      if (isPart && target && target.type !== "particles")
        f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.choreography[${ai}]`), message: `"${a.id}" (${a.preset}) targets "${a.target}" which is ${target.type}, not a particles field` });
      if (a.preset === "particle-morph" && a.morphTo === "custom" && target?.type === "particles") {
        const sourceCount = target.formation === "grid" ? target.cols * target.rows : target.formation === "custom" ? (target.points?.length ?? 0) : target.count;
        const destination = a.morphPoints ?? (target.formation === "custom" ? target.points : undefined);
        if (!destination)
          f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.choreography[${ai}].morphPoints`), message: `custom morph "${a.id}" requires morphPoints or a custom source formation` });
        else if (destination.length !== sourceCount)
          f.push({ ruleId: "MO-PART-1", severity: "P1", path: p(`.choreography[${ai}].morphPoints`), message: `custom morph "${a.id}" has ${destination.length} destination points for ${sourceCount} source dots` });
      }
    });

    // MO-CHOR-5: two entrances on one target without an exit between reads as a
    // blink (the second enter re-hides it first). Reactions use `pulse`.
    const entersByTarget = new Map<string, number>();
    scene.choreography.forEach((a) => {
      const kind = PRESETS[a.preset as PresetName].kind;
      if (kind === "enter") entersByTarget.set(a.target, (entersByTarget.get(a.target) ?? 0) + 1);
      if (kind === "exit") entersByTarget.set(a.target, 0);
    });
    for (const [tgt, n] of entersByTarget)
      if (n > 1)
        f.push({ ruleId: "MO-CHOR-5", severity: "P2", path: p(".choreography"), message: `"${tgt}" has ${n} entrances with no exit between — the later one re-hides it first (use 'pulse' for reactions)` });

    // IR-FIG-1: figure internal state does NOT carry across cuts — each scene
    // instantiates the fragment at its authored initial state. If a figure
    // continues into the next scene (same src, same position), every internal
    // whose visibility this scene changed must be re-declared there (enter it,
    // or pin its end-state with `hide`). Forgetting this resurrects hidden
    // placeholders under typed text (found by the Claude Design recreation).
    const nextScene = score.scenes[si + 1];
    if (nextScene) {
      for (const fig of scene.elements) {
        if (fig.type !== "figure") continue;
        const cont = nextScene.elements.find(
          (e) => e.type === "figure" && e.src === fig.src && (e.position.x ?? 50) === (fig.position.x ?? 50) && (e.position.y ?? 50) === (fig.position.y ?? 50)
        );
        if (!cont) continue;
        scene.choreography.forEach((a) => {
          if (!a.target.startsWith(`${fig.id}/`)) return;
          const kind = PRESETS[a.preset as PresetName].kind;
          if (kind !== "enter" && kind !== "exit") return;
          const inner = a.target.split("/")[1];
          const redeclared = nextScene.choreography.some((b) => b.target === `${cont.id}/${inner}`);
          if (!redeclared)
            f.push({ ruleId: "IR-FIG-1", severity: "P2", path: p(`.choreography`), message: `Figure "${fig.id}" continues into scene "${nextScene.id}" but internal "${inner}" (${kind} via "${a.id}") is not re-declared there — it will reset to its authored initial state across the cut (use \`hide\` or re-enter it)` });
        });
      }
    }

    // MO-MED-1: text positioned over a media rect needs a scrim or on-media color.
    // Static approximation: the text element's anchor point falling inside the
    // image rect counts as "over" — the rendered-frame gates own exact geometry.
    // MO-AUD-3: SFX are sparse — more than one sound per scene on average is design noise
    const sfxCount = scene.choreography.filter((a) => a.sfx).length;
    if (sfxCount > 2)
      f.push({ ruleId: "MO-AUD-3", severity: "P2", path: p(".choreography"), message: `${sfxCount} SFX in one scene — sound marks hero moments, not every move (max 2/scene)` });

    const mediaRects = scene.elements.filter((e) => e.type === "image" || e.type === "video").map((e) => {
      const cx = e.position.x ?? 50, cy = e.position.y ?? 50;
      const a = e.position.anchor;
      const left = a.includes("left") ? cx : a.includes("right") ? cx - e.width : cx - e.width / 2;
      const top = a.includes("top") ? cy : a.includes("bottom") ? cy - e.height : cy - e.height / 2;
      return { el: e, left, top, right: left + e.width, bottom: top + e.height };
    });
    scene.elements.forEach((el, ei) => {
      if (el.type !== "text") return;
      const tx = el.position.x ?? 50, ty = el.position.y ?? 50;
      for (const r of mediaRects) {
        if (tx >= r.left && tx <= r.right && ty >= r.top && ty <= r.bottom && r.el.scrim < 0.3 && el.color !== "on-media")
          f.push({ ruleId: "MO-MED-1", severity: "P2", path: p(`.elements[${ei}]`), message: `"${el.content.slice(0, 30)}" sits over image "${r.el.id}" with scrim ${r.el.scrim} — raise scrim to ≥0.3 or use on-media color` });
      }
    });

    // Register scene-length bounds
    if (scene.durationMs > reg.maxSceneMs)
      f.push({ ruleId: "MO-EDIT-2", severity: "P2", path: p(".durationMs"), message: `Scene runs ${scene.durationMs}ms; ${score.meta.register} scenes should stay ≤ ${reg.maxSceneMs}ms` });
    if (scene.durationMs < reg.minSceneMs)
      f.push({ ruleId: "MO-EDIT-2", severity: "P1", path: p(".durationMs"), message: `Scene runs ${scene.durationMs}ms; below the ${reg.minSceneMs}ms floor for ${score.meta.register} — unreadable` });

    // MO-EDIT-5: no dead air — first non-ambient entrance starts early enough
    const nonAmbient = resolved.filter((r) => {
      const kind = PRESETS[r.anim.preset as PresetName].kind;
      return kind === "enter" || kind === "feature";
    });
    if (nonAmbient.length) {
      const firstStart = Math.min(...nonAmbient.map((r) => r.startMs));
      const deadline = Math.max(600, scene.durationMs * 0.2);
      if (firstStart > deadline)
        f.push({ ruleId: "MO-EDIT-5", severity: "P2", path: p(".choreography"), message: `First entrance at ${Math.round(firstStart)}ms; scene opens dead for ${Math.round(firstStart)}ms (deadline ${Math.round(deadline)}ms) — a cut to an empty frame wastes the cut` });
    }

    // MO-CHOR-2: hero discipline
    const heroes = scene.elements.filter((e) => (e as { role?: string }).role === "hero");
    if (heroes.length > 2)
      f.push({ ruleId: "MO-CHOR-2", severity: "P1", path: p(".elements"), message: `${heroes.length} hero elements — one hero motion per scene, everything else supports it` });
    else if (heroes.length === 2)
      f.push({ ruleId: "MO-CHOR-2", severity: "P2", path: p(".elements"), message: "Two hero elements compete; prefer one" });

    // MO-CHOR-1: simultaneity + stagger totals
    for (const r of resolved) {
      if (r.anim.stagger) {
        const n = targetCount(scene, r.anim.target);
        const total = r.anim.stagger.eachMs * Math.max(0, n - 1);
        if (total > CHOREOGRAPHY.maxStaggerTotalMs)
          f.push({ ruleId: "MO-CHOR-1", severity: "P1", path: p(`.choreography[${scene.choreography.indexOf(r.anim)}]`), message: `Stagger total ${total}ms across ${n} targets exceeds ${CHOREOGRAPHY.maxStaggerTotalMs}ms cap` });
      }
    }
    const overlapPeak = peakConcurrency(resolved);
    if (overlapPeak > CHOREOGRAPHY.maxSimultaneousElements)
      f.push({ ruleId: "MO-CHOR-1", severity: "P1", path: p(".choreography"), message: `${overlapPeak} elements animate simultaneously (max ${CHOREOGRAPHY.maxSimultaneousElements})` });

    // MO-DUR-2: exit/entrance ratio
    const enters = new Map<string, number>();
    for (const r of resolved) if (PRESETS[r.anim.preset as PresetName].kind === "enter") enters.set(r.anim.target, r.durationMs);
    for (const r of resolved) {
      if (PRESETS[r.anim.preset as PresetName].kind === "exit") {
        const enterD = enters.get(r.anim.target);
        if (enterD && r.durationMs > enterD)
          f.push({ ruleId: "MO-DUR-2", severity: "P2", path: p(`.choreography[${scene.choreography.indexOf(r.anim)}]`), message: `Exit (${r.durationMs}ms) slower than entrance (${enterD}ms); exits run at ~75% of entrances` });
      }
    }

    // MO-EASE-1/2: overrides
    scene.choreography.forEach((a, ai) => {
      if (a.override) {
        f.push({ ruleId: "MO-EASE-1", severity: "P3", path: p(`.choreography[${ai}]`), message: `Token override in use ("${a.override.reason}") — verify it earns its exception` });
        const kind = PRESETS[a.preset as PresetName].kind;
        if (a.override.gsapEase && kind === "enter" && /\.in(?![A-Za-z(])/.test(a.override.gsapEase))
          f.push({ ruleId: "MO-EASE-2", severity: "P1", path: p(`.choreography[${ai}]`), message: `Entrance with ease-in ("${a.override.gsapEase}") — entrances settle out, never accelerate in` });
      }
    });

    // MO-EDIT-1: reading time
    scene.elements.forEach((el, ei) => {
      if (el.type !== "text") return;
      const enter = resolved.find((r) => r.anim.target === el.id && PRESETS[r.anim.preset as PresetName].kind === "enter");
      const exit = resolved.find((r) => r.anim.target === el.id && PRESETS[r.anim.preset as PresetName].kind === "exit");
      // A continuation of a match cut (identical text/position carried over from
      // the previous scene, no fresh entrance) was already counted in the chain.
      const prev = score.scenes[si - 1];
      if (
        !enter &&
        prev?.elements.some(
          (e) =>
            e.type === "text" &&
            e.content === el.content &&
            (e.position.x ?? 50) === (el.position.x ?? 50) &&
            (e.position.y ?? 50) === (el.position.y ?? 50)
        )
      )
        return;
      const visibleFrom = enter ? enter.startMs + enter.durationMs * 0.5 : 0;
      let visibleTo = exit ? exit.startMs : scene.durationMs;
      // Match-cut chaining: identical text at the identical position in the
      // following scene(s) reads as ONE continuous span across the cut.
      if (!exit) {
        for (let ni = si + 1; ni < score.scenes.length; ni++) {
          const next = score.scenes[ni];
          const cont = next.elements.find(
            (e) =>
              e.type === "text" &&
              e.content === el.content &&
              (e.position.x ?? 50) === (el.position.x ?? 50) &&
              (e.position.y ?? 50) === (el.position.y ?? 50) &&
              !next.choreography.some((a) => a.target === e.id && PRESETS[a.preset as PresetName].kind === "enter")
          );
          if (!cont) break;
          const contExit = next.choreography.find((a) => a.target === cont.id && PRESETS[a.preset as PresetName].kind === "exit");
          visibleTo += contExit ? safeResolve(next, { sceneStartMs: sceneStart(ni), beats, fps: score.meta.fps })?.find((r) => r.anim.id === contExit.id)?.startMs ?? next.durationMs : next.durationMs;
          if (contExit) break;
        }
      }
      const needMs = (wordCount(el.content) / TYPOGRAPHY.readingWpm) * 60000 * TYPOGRAPHY.readingSafety + TYPOGRAPHY.sceneEntryGraceMs;
      const haveMs = visibleTo - visibleFrom;
      if (haveMs < needMs)
        f.push({ ruleId: "MO-EDIT-1", severity: "P1", path: p(`.elements[${ei}]`), sceneId: scene.id, subjectTexts: [el.content], message: `"${el.content.slice(0, 40)}…" visible ${Math.round(haveMs)}ms, needs ${Math.round(needMs)}ms at ${TYPOGRAPHY.readingWpm}wpm×${TYPOGRAPHY.readingSafety}` });

      // MO-TYPE-1: min size
      const px = TYPE_SCALE[el.textRole as keyof typeof TYPE_SCALE] * scale;
      if (px < minPx)
        f.push({ ruleId: "MO-TYPE-1", severity: "P1", path: p(`.elements[${ei}]`), sceneId: scene.id, subjectTexts: [el.content], message: `Text renders at ${Math.round(px)}px; minimum for ${score.meta.register} is ${Math.round(minPx)}px` });
    });

    // Elements with no entrance and scenes with no motion
    const animated = new Set(resolved.map((r) => r.anim.target.replace(/\*$/, "")));
    const coverage = motionCoverage(resolved, scene.durationMs);
    if (coverage < reg.minMotionRatio)
      f.push({ ruleId: "MO-REG-1", severity: "P2", path: p(""), message: `Motion covers ${(coverage * 100).toFixed(0)}% of scene; ${score.meta.register} floor is ${reg.minMotionRatio * 100}%` });
    void animated;
  });

  // MO-EDIT-3: adjacent diversity + slideshow risk
  for (let i = 1; i < score.scenes.length; i++) {
    const a = signature(score.scenes[i - 1]);
    const b = signature(score.scenes[i]);
    const diffs = (a.bg !== b.bg ? 1 : 0) + (a.types !== b.types ? 1 : 0) + (a.layout !== b.layout ? 1 : 0) + (a.motion !== b.motion ? 1 : 0);
    if (diffs < 2)
      f.push({ ruleId: "MO-EDIT-3", severity: "P2", path: `scenes[${i}]`, message: `Scene nearly identical in composition to previous (differs on ${diffs}/4 axes) — anti-slideshow rule` });
  }
  const slideshow = score.scenes.filter((s) => {
    const kinds = new Set(s.choreography.map((c) => c.preset));
    const textOnly = s.elements.every((e) => e.type === "text");
    return textOnly && [...kinds].every((k) => String(k).startsWith("fade"));
  });
  if (slideshow.length >= Math.max(2, Math.floor(score.scenes.length * 0.5)))
    f.push({ ruleId: "MO-SLOP-1", severity: "P1", path: "scenes", message: `${slideshow.length}/${score.scenes.length} scenes are fade-only text cards — slideshow slop` });

  // MO-AUD-2: with a declared beat grid, brand-film cuts land within 80ms of a beat
  const music = score.audio?.music;
  if (music?.bpm && score.meta.register === "brand-film") {
    const beatMs = 60000 / music.bpm;
    let cutMs = 0;
    score.scenes.slice(0, -1).forEach((scene, si) => {
      cutMs += scene.durationMs;
      const gridPos = (cutMs - music.firstBeatMs) / beatMs;
      const offBeatMs = Math.abs(gridPos - Math.round(gridPos)) * beatMs;
      if (offBeatMs > 80)
        f.push({ ruleId: "MO-AUD-2", severity: "P2", path: `scenes[${si}].durationMs`, message: `Cut at ${(cutMs / 1000).toFixed(2)}s lands ${Math.round(offBeatMs)}ms off the ${music.bpm}bpm grid (max 80ms) — nudge scene duration by ${Math.round(offBeatMs <= beatMs / 2 ? -offBeatMs : beatMs - offBeatMs)}ms` });
    });
  }

  // MO-DUR (uniformity slop): identical duration+preset everywhere
  const allAnims = score.scenes.flatMap((s) => s.choreography);
  if (allAnims.length >= 6) {
    const sigs = new Set(allAnims.map((a) => `${a.preset}:${a.duration ?? "d"}`));
    if (sigs.size === 1)
      f.push({ ruleId: "MO-SLOP-2", severity: "P2", path: "scenes", message: "Every animation is the same preset+duration — uniform-timing slop; vary rhythm with intent" });
  }

  return f;
}

function safeResolve(
  scene: SceneT,
  ctx?: { sceneStartMs: number; beats?: number[]; fps?: number; narrationWordStarts?: ReadonlyMap<string, number> },
) {
  try {
    return resolveSceneTimeline(scene, ctx);
  } catch {
    return null;
  }
}

function targetCount(scene: SceneT, target: string): number {
  if (target.endsWith("*")) return scene.elements.filter((e) => e.id.startsWith(target.slice(0, -1))).length;
  const el = scene.elements.find((e) => e.id === target);
  if (el?.type === "chart-bar") return el.series.length;
  return 1;
}

function peakConcurrency(resolved: ReturnType<typeof resolveSceneTimeline>): number {
  const events: Array<[number, number]> = [];
  for (const r of resolved) {
    if (PRESETS[r.anim.preset as PresetName].kind === "ambient") continue;
    events.push([r.startMs, 1], [r.startMs + r.durationMs, -1]);
  }
  events.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let cur = 0, peak = 0;
  for (const [, d] of events) { cur += d; peak = Math.max(peak, cur); }
  return peak;
}

function motionCoverage(resolved: ReturnType<typeof resolveSceneTimeline>, durationMs: number): number {
  const iv = resolved
    .map((r) => [r.startMs, Math.min(durationMs, r.startMs + r.durationMs)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let covered = 0, end = 0;
  for (const [s, e] of iv) {
    if (e <= end) continue;
    covered += e - Math.max(s, end);
    end = e;
  }
  return durationMs === 0 ? 0 : covered / durationMs;
}

function signature(scene: SceneT) {
  return {
    bg: `${scene.background}:${scene.backgroundImage ?? ""}`,
    types: scene.elements.map((e) => e.type).sort().join(","),
    layout: scene.elements.map((e) => (e as { position?: { anchor?: string } }).position?.anchor ?? "center").sort().join(","),
    motion: [...new Set(scene.choreography.map((c) => `${c.preset}:${c.direction ?? ""}`))].sort().join(","),
  };
}

// ── Frame gates (need a live render session) ──────────────────────────────
const luminance = (r: number, g: number, b: number) => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const hexLum = (hex: string) => luminance(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
const contrast = (l1: number, l2: number) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

export const FRAME_GATE_INTERVAL_MS = 250;

/** ADR-0027: output-frame samples with no interval wider than 250ms, enriched
 * around the moments where choreography and transitions can create defects. */
export function frameGateSampleTimes(score: ScoreT): number[] {
  const frameMs = 1000 / score.meta.fps;
  const totalFrames = Math.max(1, Math.round((totalDurationMs(score) / 1000) * score.meta.fps));
  const lastFrame = totalFrames - 1;
  const intervalFrames = Math.max(1, Math.floor(FRAME_GATE_INTERVAL_MS / frameMs));
  const frames = new Set<number>();
  const narrationWordStarts = narrationWordStartMap(score);
  const addMs = (ms: number) => frames.add(Math.max(0, Math.min(lastFrame, Math.round(ms / frameMs))));
  let sceneStartMs = 0;
  for (const scene of score.scenes) {
    const sceneEndMs = sceneStartMs + scene.durationMs;
    const firstFrame = Math.max(0, Math.round(sceneStartMs / frameMs));
    const endFrame = Math.min(lastFrame, Math.ceil(sceneEndMs / frameMs) - 1);
    for (let frame = firstFrame; frame <= endFrame; frame += intervalFrames) frames.add(frame);
    frames.add(firstFrame);
    frames.add(Math.min(endFrame, firstFrame + 1));
    frames.add(Math.round((firstFrame + endFrame) / 2));
    frames.add(Math.max(firstFrame, endFrame - 1));
    frames.add(endFrame);

    const resolved = safeResolve(scene, {
      sceneStartMs,
      beats: score.audio?.music?.beats,
      fps: score.meta.fps,
      narrationWordStarts,
    }) ?? [];
    for (const item of resolved) {
      const start = sceneStartMs + item.startMs;
      const end = start + item.durationMs;
      for (const marker of [start, start + frameMs, (start + end) / 2, end - frameMs, end, end + frameMs]) addMs(marker);
    }
    if (scene.transitionOut.type !== "cut") {
      const transitionStart = sceneEndMs - DURATIONS[scene.transitionOut.duration as DurationToken];
      for (const marker of [transitionStart - frameMs, transitionStart, transitionStart + frameMs, sceneEndMs - frameMs, sceneEndMs]) addMs(marker);
    }
    sceneStartMs = sceneEndMs;
  }
  return [...frames].sort((a, b) => a - b).map((frame) => frame * frameMs);
}

export async function runFrameGates(score: ScoreT, session: RenderSession): Promise<Finding[]> {
  const f: Finding[] = [];
  const narrationWordStarts = narrationWordStartMap(score);
  const findingKeys = new Set<string>();
  const addFinding = (finding: Finding) => {
    const key = `${finding.ruleId}|${finding.path}`;
    if (!findingKeys.has(key)) {
      findingKeys.add(key);
      f.push(finding);
    }
  };
  const zone = SAFE_ZONES[score.meta.safeZone as SafeZone];
  const W = score.meta.width, H = score.meta.height;
  const minPx = TYPOGRAPHY.minTextPx1080[score.meta.register as Register] * (Math.min(W, H) / 1080);
  const safe = { x0: W * zone.left, y0: H * zone.top, x1: W * (1 - zone.right), y1: H * (1 - zone.bottom) };
  const sceneIndex = new Map(score.scenes.map((scene, index) => [scene.id, index]));
  const figureText = score.scenes.map(() => new Map<string, { region: TextRegion; sampledAtMs: number; text: string }>());
  const samples = frameGateSampleTimes(score);
  for (const t of samples) {
    const regions = (await session.textRegions(t)).filter((region) => region.visible);
    for (const region of regions) {
      const si = sceneIndex.get(region.scene);
      if (si != null && region.origin === "figure") {
        const previous = figureText[si].get(region.sel);
        if (!previous) figureText[si].set(region.sel, { region, sampledAtMs: t, text: region.text ?? "" });
        else {
          if (region.fontSizePx < previous.region.fontSizePx) {
            previous.region = region;
            previous.sampledAtMs = t;
          }
          if (wordCount(region.text ?? "") > wordCount(previous.text)) previous.text = region.text ?? "";
        }
      }
    }
    let shot: Buffer | null = null;
    if (regions.some((region) => region.overMedia)) {
      shot = await session.contrastCapture(t);
    }
    for (const r of regions) {
      if (r.x < safe.x0 - 1 || r.y < safe.y0 - 1 || r.x + r.w > safe.x1 + 1 || r.y + r.h > safe.y1 + 1)
        addFinding({ ruleId: "MO-TYPE-4", severity: "P1", path: r.sel, sceneId: r.scene, subjectTexts: r.text ? [r.text] : [], timecodeMs: Math.round(t), message: `Text outside ${score.meta.safeZone} safe zone at ${(t / 1000).toFixed(2)}s` });
      if (r.overMedia && shot) {
        const left = Math.max(0, Math.min(W - 1, Math.floor(r.x)));
        const top = Math.max(0, Math.min(H - 1, Math.floor(r.y)));
        const right = Math.max(left + 1, Math.min(W, Math.ceil(r.x + r.w)));
        const bottom = Math.max(top + 1, Math.min(H, Math.ceil(r.y + r.h)));
        const stats = await sharp(shot).extract({ left, top, width: right - left, height: bottom - top }).stats();
        const bgLum = luminance(stats.channels[0].mean, stats.channels[1].mean, stats.channels[2].mean);
        const ratio = contrast(hexLum(r.color), bgLum);
        if (ratio < TYPOGRAPHY.minContrast)
          addFinding({ ruleId: "MO-TYPE-2", severity: "P1", path: r.sel, sceneId: r.scene, subjectTexts: r.text ? [r.text] : [], timecodeMs: Math.round(t), message: `Text contrast ${ratio.toFixed(1)}:1 over media at ${(t / 1000).toFixed(2)}s (min ${TYPOGRAPHY.minContrast}:1)` });
      }
    }
    for (let a = 0; a < regions.length; a++) {
      for (let b = a + 1; b < regions.length; b++) {
        const A = regions[a], B = regions[b];
        const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
        const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        const sameMatchCut = A.scene !== B.scene && !!A.text?.trim() && A.text.trim() === B.text?.trim() &&
          Math.abs(A.x - B.x) <= 2 && Math.abs(A.y - B.y) <= 2 && Math.abs(A.w - B.w) <= 2 && Math.abs(A.h - B.h) <= 2;
        if (ox > 2 && oy > 2 && !sameMatchCut)
          addFinding({ ruleId: "QE-OVERLAP-1", severity: "P1", path: `${A.sel} ∩ ${B.sel}`, sceneId: A.scene === B.scene ? A.scene : undefined, subjectTexts: [A.text, B.text].filter((value): value is string => !!value), timecodeMs: Math.round(t), message: `Text elements overlap by ${Math.round(ox)}×${Math.round(oy)}px at ${(t / 1000).toFixed(2)}s` });
      }
    }
  }

  for (let si = 0; si < score.scenes.length; si++) {
    const b = session.compiled.sceneBoundsMs[si];
    const readingGroups = new Map<string, { text: string[]; region: TextRegion }>();
    for (const { region, sampledAtMs, text } of figureText[si].values()) {
      if (region.fontSizePx < minPx)
        addFinding({ ruleId: "MO-TYPE-1", severity: "P1", path: region.sel, sceneId: region.scene, subjectTexts: text ? [text] : [], timecodeMs: Math.round(sampledAtMs), message: `Figure text renders at ${Math.round(region.fontSizePx)}px; minimum for ${score.meta.register} is ${Math.round(minPx)}px` });
      const key = region.target ?? region.figureId ?? region.sel;
      const group = readingGroups.get(key) ?? { text: [], region };
      group.text.push(text);
      readingGroups.set(key, group);
    }
    const resolved = safeResolve(score.scenes[si], {
      sceneStartMs: b.startMs,
      beats: score.audio?.music?.beats,
      fps: score.meta.fps,
      narrationWordStarts,
    }) ?? [];
    for (const [target, group] of readingGroups) {
      const targets = new Set([target, group.region.figureId].filter((value): value is string => !!value));
      let visibleFrom = 0, visibleTo = score.scenes[si].durationMs;
      for (const targetId of targets) {
        const enter = resolved.find((item) => item.anim.target === targetId && PRESETS[item.anim.preset as PresetName].kind === "enter");
        const exit = resolved.find((item) => item.anim.target === targetId && PRESETS[item.anim.preset as PresetName].kind === "exit");
        if (enter) visibleFrom = Math.max(visibleFrom, enter.startMs + enter.durationMs * 0.5);
        if (exit) visibleTo = Math.min(visibleTo, exit.startMs);
      }
      const text = group.text.join(" ").trim();
      const needMs = (wordCount(text) / TYPOGRAPHY.readingWpm) * 60000 * TYPOGRAPHY.readingSafety + TYPOGRAPHY.sceneEntryGraceMs;
      const haveMs = Math.max(0, visibleTo - visibleFrom);
      if (text && haveMs < needMs)
        addFinding({ ruleId: "MO-EDIT-1", severity: "P1", path: group.region.sel, sceneId: group.region.scene, subjectTexts: [text], message: `Figure text "${text.slice(0, 40)}…" visible ${Math.round(haveMs)}ms, needs ${Math.round(needMs)}ms at ${TYPOGRAPHY.readingWpm}wpm×${TYPOGRAPHY.readingSafety}` });
    }
    const midpoint = (b.startMs + b.endMs) / 2;
    const mid = await session.seekAndCapture(midpoint);
    const stats = await sharp(mid).stats();
    const sd = stats.channels.reduce((s, c) => s + c.stdev, 0) / stats.channels.length;
    if (sd < 1.0)
      addFinding({ ruleId: "QE-BLANK-1", severity: "P1", path: `scenes[${si}]`, timecodeMs: Math.round(midpoint), message: `Scene midpoint is a near-uniform frame (stdev ${sd.toFixed(2)}) — likely blank render or dead scene` });
  }

  // Static contrast for non-media text (cheap, exact, whole score)
  const p = score.style.palette;
  const bgFor = (scene: SceneT) => (scene.background === "surface" ? p.surface : scene.background === "primary" ? p.primary : p.bg);
  score.scenes.forEach((scene, si) => {
    if (scene.background === "image") return;
    // Text sitting ON media (image/video/figure) is lit by the media, not the
    // scene background — its legibility belongs to MO-MED-1 + frame gates.
    const media = scene.elements.filter((e) => e.type === "image" || e.type === "video" || e.type === "lottie" || e.type === "figure");
    const onMedia = (tx: number, ty: number) =>
      media.some((m) => {
        const cx = m.position.x ?? 50, cy = m.position.y ?? 50, a = m.position.anchor;
        const left = a.includes("left") ? cx : a.includes("right") ? cx - m.width : cx - m.width / 2;
        const top = a.includes("top") ? cy : a.includes("bottom") ? cy - m.height : cy - m.height / 2;
        return tx >= left && tx <= left + m.width && ty >= top && ty <= top + m.height;
      });
    scene.elements.forEach((el, ei) => {
      if (el.type !== "text") return;
      if (onMedia(el.position.x ?? 50, el.position.y ?? 50)) return;
      const colorHex = el.color === "text" ? p.text : el.color === "text-dim" ? p.textDim : el.color === "primary" ? p.primary : el.color === "accent" ? p.accent : p.onMedia;
      const ratio = contrast(hexLum(colorHex), hexLum(bgFor(scene)));
      const min = el.textRole === "display" || el.textRole === "headline" ? 3 : TYPOGRAPHY.minContrast; // large-text allowance
      if (ratio < min)
        f.push({ ruleId: "MO-TYPE-2", severity: "P1", path: `scenes[${si}].elements[${ei}]`, sceneId: scene.id, subjectTexts: [el.content], message: `Palette contrast ${ratio.toFixed(1)}:1 for "${el.content.slice(0, 30)}" (min ${min}:1)` });
    });
  });

  return f;
}

/**
 * Creative conformance (ADR-0012): does the executed Score honor the Direction?
 * The first deterministic gate of the creative-intelligence layer — the WHY
 * (Direction) governing the HOW (Score), checkable, IR-addressed. CC-* rule IDs
 * trace to the Creative Constitution.
 */
export function runConformance(direction: DirectionT, score: ScoreT): Finding[] {
  const f: Finding[] = [];
  // CC-CONF-1: plan and execution must agree on the register.
  if (direction.register !== score.meta.register)
    f.push({ ruleId: "CC-CONF-1", severity: "P1", path: "meta.register", message: `Direction register "${direction.register}" ≠ Score register "${score.meta.register}" — the plan and the execution disagree on the format` });

  const dirIds = new Set(direction.scenes.map((s) => s.id));
  const scoreIds = new Set(score.scenes.map((s) => s.id));

  // CC-CONF-2: every directed beat must be executed (no dropped intent).
  direction.scenes.forEach((ds, i) => {
    if (!scoreIds.has(ds.id))
      f.push({ ruleId: "CC-CONF-2", severity: "P1", path: `direction.scenes[${i}]`, message: `Directed beat "${ds.id}" (${ds.narrativeRole}) has no Score scene — a planned beat was dropped` });
  });

  // CC-CONF-3: every executed scene must trace to a directed beat (no scene
  // without a WHY — CC-CORE-1 made structural).
  score.scenes.forEach((ss, i) => {
    if (!dirIds.has(ss.id))
      f.push({ ruleId: "CC-CONF-3", severity: "P2", path: `scenes[${i}]`, message: `Score scene "${ss.id}" traces to no directed beat — it exists without a stated reason (add it to the Direction or cut it)` });
  });

  // CC-CONF-4: a declared hero moment must be executed as a hero-role element.
  direction.scenes.forEach((ds) => {
    if (!ds.heroMoment) return;
    const scene = score.scenes.find((s) => s.id === ds.id);
    if (scene && !scene.elements.some((e) => (e as { role?: string }).role === "hero"))
      f.push({ ruleId: "CC-CONF-4", severity: "P2", path: `scenes[${score.scenes.indexOf(scene)}]`, message: `Beat "${ds.id}" declares a hero moment ("${ds.heroMoment}") but its Score scene has no hero-role element — the peak wasn't executed` });
  });

  // CC-CONF-5 (CC-RHY-2/CC-NARR-4 proxy): pacingWeight should track relative
  // hold. The beat with the highest pacingWeight should not be among the
  // shortest scenes — the emphasized moment must get air.
  if (direction.scenes.length >= 3) {
    const peak = direction.scenes.reduce((a, b) => (b.pacingWeight > a.pacingWeight ? b : a));
    const durs = score.scenes.map((s) => s.durationMs).sort((a, b) => a - b);
    const peakScene = score.scenes.find((s) => s.id === peak.id);
    if (peak.pacingWeight >= 1.4 && peakScene && peakScene.durationMs <= durs[Math.floor(durs.length / 3)])
      f.push({ ruleId: "CC-CONF-5", severity: "P3", path: `scenes[${score.scenes.indexOf(peakScene)}].durationMs`, message: `Beat "${peak.id}" is the pacing peak (weight ${peak.pacingWeight}) but is among the shortest scenes — the emphasized moment isn't getting air (CC-RHY-2)` });
  }

  return f;
}

/** ADR-0018: does the directed concept preserve the locked user truth? */
export function runIntakeDirectionConformance(intake: IntakeT, direction: DirectionT): Finding[] {
  const findings: Finding[] = [];
  if (direction.trace.intakeProjectId !== intake.projectId)
    findings.push({ ruleId: "CC-INT-1", severity: "P1", path: "direction.trace.intakeProjectId", message: `Direction traces to "${direction.trace.intakeProjectId}", not Intake project "${intake.projectId}"` });
  if (intake.deliverable.register && intake.deliverable.register !== direction.register)
    findings.push({ ruleId: "CC-INT-2", severity: "P1", path: "direction.register", message: `Direction register "${direction.register}" contradicts Intake register "${intake.deliverable.register}"` });
  for (const field of ["primary", "audience", "singleMessage"] as const) {
    if (direction.trace.objective[field] !== intake.objective[field])
      findings.push({ ruleId: "CC-INT-8", severity: "P1", path: `direction.trace.objective.${field}`, message: `Direction must preserve Intake objective.${field} verbatim before interpreting it creatively` });
  }
  for (const field of ["targetDurationMs", "width", "height", "channel"] as const) {
    if (intake.deliverable[field] != null && direction.deliverable[field] !== intake.deliverable[field])
      findings.push({ ruleId: "CC-INT-8", severity: "P1", path: `direction.deliverable.${field}`, message: `Direction deliverable.${field} does not preserve the Intake value` });
  }
  for (const field of ["mustInclude", "mustAvoid", "legal", "accessibility"] as const) {
    intake.constraints[field].forEach((statement) => {
      if (!direction.trace.constraints[field].includes(statement))
        findings.push({ ruleId: "CC-INT-8", severity: "P1", path: `direction.trace.constraints.${field}`, message: `Direction dropped Intake constraint "${statement}"` });
    });
  }

  intake.openQuestions.forEach((question, index) => {
    if (question.blocksDirection)
      findings.push({ ruleId: "CC-INT-3", severity: "P1", path: `intake.openQuestions[${index}]`, message: `Direction is blocked by unresolved question "${question.question}"` });
  });

  const sources = new Set(intake.sources.map((source) => source.id));
  const preferences = new Map(intake.preferences.map((preference) => [preference.id, preference]));
  const brands = new Map(intake.brand.constraints.map((constraint) => [constraint.id, constraint]));
  const assumptions = new Map(intake.assumptions.map((assumption) => [assumption.id, assumption]));
  const traceSets = {
    sourceIds: new Set(direction.trace.sourceIds),
    preferenceIds: new Set(direction.trace.preferenceIds),
    brandConstraintIds: new Set(direction.trace.brandConstraintIds),
    assumptionIds: new Set(direction.trace.assumptionIds),
  };

  direction.trace.sourceIds.forEach((sourceId, index) => {
    if (!sources.has(sourceId)) findings.push({ ruleId: "CC-INT-4", severity: "P1", path: `direction.trace.sourceIds[${index}]`, message: `Unknown Intake source "${sourceId}"` });
  });
  direction.trace.preferenceIds.forEach((preferenceId, index) => {
    if (!preferences.has(preferenceId)) findings.push({ ruleId: "CC-INT-4", severity: "P1", path: `direction.trace.preferenceIds[${index}]`, message: `Unknown Intake preference "${preferenceId}"` });
  });
  direction.trace.brandConstraintIds.forEach((constraintId, index) => {
    if (!brands.has(constraintId)) findings.push({ ruleId: "CC-INT-4", severity: "P1", path: `direction.trace.brandConstraintIds[${index}]`, message: `Unknown Intake brand constraint "${constraintId}"` });
  });
  direction.trace.assumptionIds.forEach((assumptionId, index) => {
    const assumption = assumptions.get(assumptionId);
    if (!assumption) findings.push({ ruleId: "CC-INT-4", severity: "P1", path: `direction.trace.assumptionIds[${index}]`, message: `Unknown Intake assumption "${assumptionId}"` });
    else if (assumption.status === "rejected") findings.push({ ruleId: "CC-INT-5", severity: "P1", path: `direction.trace.assumptionIds[${index}]`, message: `Direction relies on rejected assumption "${assumptionId}"` });
    else if (assumption.status === "proposed" && assumption.risk === "high") findings.push({ ruleId: "CC-INT-5", severity: "P1", path: `direction.trace.assumptionIds[${index}]`, message: `High-risk assumption "${assumptionId}" requires approval before Direction` });
    else if (assumption.status === "proposed") findings.push({ ruleId: "CC-INT-5", severity: "P2", path: `direction.trace.assumptionIds[${index}]`, message: `Direction relies on unapproved assumption "${assumptionId}"` });
  });

  for (const preference of intake.preferences) {
    if (preference.priority !== "must") continue;
    if (!traceSets.preferenceIds.has(preference.id))
      findings.push({ ruleId: "CC-INT-6", severity: "P1", path: "direction.trace.preferenceIds", message: `Must-level ${preference.polarity} preference "${preference.id}" was dropped` });
    else if (!direction.scenes.some((scene) => scene.preferenceIds.includes(preference.id)))
      findings.push({ ruleId: "CC-INT-6", severity: "P1", path: "direction.scenes", message: `Must-level ${preference.polarity} preference "${preference.id}" is acknowledged but shapes no directed beat` });
  }
  for (const constraint of intake.brand.constraints) {
    if (constraint.priority === "must" && !traceSets.brandConstraintIds.has(constraint.id))
      findings.push({ ruleId: "CC-INT-6", severity: "P1", path: "direction.trace.brandConstraintIds", message: `Must-level brand constraint "${constraint.id}" was dropped` });
  }

  direction.scenes.forEach((scene, sceneIndex) => {
    scene.sourceIds.forEach((sourceId, index) => {
      if (!sources.has(sourceId)) findings.push({ ruleId: "CC-INT-7", severity: "P1", path: `direction.scenes[${sceneIndex}].sourceIds[${index}]`, message: `Beat "${scene.id}" cites unknown source "${sourceId}"` });
      else if (!traceSets.sourceIds.has(sourceId)) findings.push({ ruleId: "CC-INT-7", severity: "P2", path: `direction.scenes[${sceneIndex}].sourceIds[${index}]`, message: `Beat "${scene.id}" cites source "${sourceId}" absent from the Direction trace summary` });
    });
    scene.preferenceIds.forEach((preferenceId, index) => {
      if (!preferences.has(preferenceId)) findings.push({ ruleId: "CC-INT-7", severity: "P1", path: `direction.scenes[${sceneIndex}].preferenceIds[${index}]`, message: `Beat "${scene.id}" cites unknown preference "${preferenceId}"` });
      else if (!traceSets.preferenceIds.has(preferenceId)) findings.push({ ruleId: "CC-INT-7", severity: "P2", path: `direction.scenes[${sceneIndex}].preferenceIds[${index}]`, message: `Beat "${scene.id}" cites preference "${preferenceId}" absent from the Direction trace summary` });
    });
  });
  return findings;
}

/** ADR-0018: does every designed shot execute a directed beat without drift? */
export function runDirectionStoryboardConformance(direction: DirectionT, storyboard: StoryboardT): Finding[] {
  const findings: Finding[] = [];
  if (storyboard.directionId !== direction.id)
    findings.push({ ruleId: "CC-BOARD-1", severity: "P1", path: "storyboard.directionId", message: `Storyboard traces to "${storyboard.directionId}", not Direction "${direction.id}"` });
  if (storyboard.register !== direction.register)
    findings.push({ ruleId: "CC-BOARD-1", severity: "P1", path: "storyboard.register", message: `Storyboard register "${storyboard.register}" contradicts Direction register "${direction.register}"` });
  for (const field of ["targetDurationMs", "width", "height", "channel"] as const) {
    if (direction.deliverable[field] != null && storyboard.deliverable[field] !== direction.deliverable[field])
      findings.push({ ruleId: "CC-BOARD-7", severity: "P1", path: `storyboard.deliverable.${field}`, message: `Storyboard deliverable.${field} does not preserve the Direction value` });
  }

  const beats = new Map(direction.scenes.map((beat) => [beat.id, beat]));
  for (const beat of direction.scenes) {
    const shots = storyboard.shots.filter((shot) => shot.directionBeatId === beat.id);
    if (!shots.length)
      findings.push({ ruleId: "CC-BOARD-2", severity: "P1", path: `direction.scenes[${direction.scenes.indexOf(beat)}]`, message: `Directed beat "${beat.id}" has no Storyboard shot` });
    if (beat.heroMoment && shots.length && !shots.some((shot) => shot.hero))
      findings.push({ ruleId: "CC-BOARD-3", severity: "P2", path: `storyboard.shots`, message: `Beat "${beat.id}" declares hero moment "${beat.heroMoment}" but none of its shots plans a hero` });
  }

  storyboard.shots.forEach((shot, index) => {
    const beat = beats.get(shot.directionBeatId);
    if (!beat) {
      findings.push({ ruleId: "CC-BOARD-2", severity: "P1", path: `storyboard.shots[${index}].directionBeatId`, message: `Shot "${shot.id}" cites unknown directed beat "${shot.directionBeatId}"` });
      return;
    }
    shot.sourceIds.forEach((sourceId) => {
      if (!beat.sourceIds.includes(sourceId)) findings.push({ ruleId: "CC-BOARD-4", severity: "P2", path: `storyboard.shots[${index}].sourceIds`, message: `Shot "${shot.id}" cites source "${sourceId}" not declared on beat "${beat.id}"` });
    });
    shot.preferenceIds.forEach((preferenceId) => {
      if (!beat.preferenceIds.includes(preferenceId)) findings.push({ ruleId: "CC-BOARD-4", severity: "P2", path: `storyboard.shots[${index}].preferenceIds`, message: `Shot "${shot.id}" cites preference "${preferenceId}" not declared on beat "${beat.id}"` });
    });
  });

  const firstBeatOrder = storyboard.shots
    .map((shot) => shot.directionBeatId)
    .filter((beatId, index, all) => all.indexOf(beatId) === index);
  const expectedOrder = direction.scenes.map((beat) => beat.id).filter((beatId) => firstBeatOrder.includes(beatId));
  if (firstBeatOrder.join("|") !== expectedOrder.join("|"))
    findings.push({ ruleId: "CC-BOARD-5", severity: "P1", path: "storyboard.shots", message: "Storyboard reorders directed beats; revise Direction first if the narrative order changed" });

  if (direction.scenes.length >= 3) {
    const peak = direction.scenes.reduce((a, b) => (b.pacingWeight > a.pacingWeight ? b : a));
    const totals = direction.scenes.map((beat) => storyboard.shots.filter((shot) => shot.directionBeatId === beat.id).reduce((sum, shot) => sum + shot.targetDurationMs, 0));
    const peakDuration = storyboard.shots.filter((shot) => shot.directionBeatId === peak.id).reduce((sum, shot) => sum + shot.targetDurationMs, 0);
    const sorted = [...totals].sort((a, b) => a - b);
    if (peak.pacingWeight >= 1.4 && peakDuration <= sorted[Math.floor(sorted.length / 3)])
      findings.push({ ruleId: "CC-BOARD-6", severity: "P3", path: "storyboard.shots", message: `Pacing peak "${peak.id}" is among the shortest storyboard beats; the planned emphasis may not get air` });
  }
  if (storyboard.deliverable.targetDurationMs != null) {
    const total = storyboard.shots.reduce((sum, shot) => sum + shot.targetDurationMs, 0);
    const tolerance = Math.max(250, storyboard.deliverable.targetDurationMs * 0.05);
    if (Math.abs(total - storyboard.deliverable.targetDurationMs) > tolerance)
      findings.push({ ruleId: "CC-BOARD-7", severity: "P2", path: "storyboard.shots", message: `Storyboard totals ${total}ms vs target ${storyboard.deliverable.targetDurationMs}ms (tolerance ${Math.round(tolerance)}ms)` });
  }
  return findings;
}

const normalizedFigureCopy = (html: string) => html
  .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
  .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
  .replace(/<\/?(?:br|div|p|section|article|h[1-6]|li|tr|td|th)\b[^>]*>/gi, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

/** ADR-0018/0026: does executable Score preserve the approved shot plan? */
export function runStoryboardScoreConformance(storyboard: StoryboardT, score: ScoreT, projectDir?: string): Finding[] {
  const findings: Finding[] = [];
  if (storyboard.register !== score.meta.register)
    findings.push({ ruleId: "CC-SCORE-1", severity: "P1", path: "score.meta.register", message: `Score register "${score.meta.register}" contradicts Storyboard register "${storyboard.register}"` });
  if (storyboard.deliverable.width != null && storyboard.deliverable.width !== score.meta.width)
    findings.push({ ruleId: "CC-SCORE-8", severity: "P1", path: "score.meta.width", message: `Score width ${score.meta.width} contradicts Storyboard width ${storyboard.deliverable.width}` });
  if (storyboard.deliverable.height != null && storyboard.deliverable.height !== score.meta.height)
    findings.push({ ruleId: "CC-SCORE-8", severity: "P1", path: "score.meta.height", message: `Score height ${score.meta.height} contradicts Storyboard height ${storyboard.deliverable.height}` });
  const shots = new Map(storyboard.shots.map((shot) => [shot.id, shot]));
  const scenes = new Map(score.scenes.map((scene) => [scene.id, scene]));
  storyboard.shots.forEach((shot, index) => {
    const scene = scenes.get(shot.id);
    if (!scene) {
      findings.push({ ruleId: "CC-SCORE-2", severity: "P1", path: `storyboard.shots[${index}]`, message: `Storyboard shot "${shot.id}" has no Score scene` });
      return;
    }
    const tolerance = Math.max(250, shot.targetDurationMs * 0.2);
    if (Math.abs(scene.durationMs - shot.targetDurationMs) > tolerance)
      findings.push({ ruleId: "CC-SCORE-3", severity: "P2", path: `score.scenes[${score.scenes.indexOf(scene)}].durationMs`, message: `Scene "${scene.id}" runs ${scene.durationMs}ms vs storyboard ${shot.targetDurationMs}ms (tolerance ${Math.round(tolerance)}ms)` });
    const text = new Set(scene.elements.filter((element) => element.type === "text").map((element) => element.content));
    const figureText = projectDir == null ? [] : scene.elements
      .filter((element) => element.type === "figure")
      .flatMap((element) => {
        try { return [normalizedFigureCopy(readFileSync(resolveProjectAsset(projectDir, element.src), "utf8"))]; }
        catch { return []; }
      });
    shot.typography.onScreenCopy.forEach((copy) => {
      const normalized = normalizedFigureCopy(copy);
      if (!text.has(copy) && !figureText.some((content) => content.includes(normalized)))
        findings.push({ ruleId: "CC-SCORE-4", severity: "P1", path: `score.scenes[${score.scenes.indexOf(scene)}].elements`, message: `Planned copy "${copy}" is missing from scene "${scene.id}"` });
    });
    if (shot.hero?.elementType && !scene.elements.some((element) => element.type === shot.hero?.elementType && element.role === "hero"))
      findings.push({ ruleId: "CC-SCORE-5", severity: "P2", path: `score.scenes[${score.scenes.indexOf(scene)}].elements`, message: `Shot "${shot.id}" plans a hero ${shot.hero.elementType}, but the Score has no hero-role ${shot.hero.elementType}` });
    if (shot.transition.preferredType && scene.transitionOut.type !== shot.transition.preferredType)
      findings.push({ ruleId: "CC-SCORE-6", severity: "P2", path: `score.scenes[${score.scenes.indexOf(scene)}].transitionOut.type`, message: `Scene "${scene.id}" uses ${scene.transitionOut.type}, not planned ${shot.transition.preferredType}` });
  });
  score.scenes.forEach((scene, index) => {
    if (!shots.has(scene.id)) findings.push({ ruleId: "CC-SCORE-2", severity: "P2", path: `score.scenes[${index}]`, message: `Score scene "${scene.id}" has no Storyboard shot` });
  });
  const shotOrder = storyboard.shots.map((shot) => shot.id);
  const scoreOrder = score.scenes.map((scene) => scene.id);
  if (shotOrder.join("|") !== scoreOrder.join("|"))
    findings.push({ ruleId: "CC-SCORE-7", severity: "P1", path: "score.scenes", message: "Score scene order differs from the Storyboard shot order" });
  if (storyboard.deliverable.targetDurationMs != null) {
    const total = score.scenes.reduce((sum, scene) => sum + scene.durationMs, 0);
    const tolerance = Math.max(250, storyboard.deliverable.targetDurationMs * 0.05);
    if (Math.abs(total - storyboard.deliverable.targetDurationMs) > tolerance)
      findings.push({ ruleId: "CC-SCORE-8", severity: "P2", path: "score.scenes", message: `Score totals ${total}ms vs Storyboard target ${storyboard.deliverable.targetDurationMs}ms (tolerance ${Math.round(tolerance)}ms)` });
  }
  return findings;
}

type AssetUse = { sourceId: string; kind: "direct" | "derived"; note: string };
type RenderedAsset = { path: string; assetUse?: AssetUse; irPath: string; sceneId?: string };

function renderedAssets(score: ScoreT): RenderedAsset[] {
  const assets: RenderedAsset[] = [];
  score.style.fontAssets.forEach((font, index) =>
    assets.push({ path: font.src, assetUse: font.assetUse, irPath: `score.style.fontAssets[${index}].src` }));
  score.scenes.forEach((scene, sceneIndex) => {
    if (scene.background === "image" && scene.backgroundImage)
      assets.push({ path: scene.backgroundImage, assetUse: scene.backgroundAssetUse, irPath: `score.scenes[${sceneIndex}].backgroundImage`, sceneId: scene.id });
    scene.elements.forEach((element, elementIndex) => {
      const base = `score.scenes[${sceneIndex}].elements[${elementIndex}]`;
      if (element.type === "image" || element.type === "video")
        assets.push({ path: element.src, assetUse: element.assetUse, irPath: `${base}.src`, sceneId: scene.id });
      if (element.type === "lottie")
        assets.push({ path: element.src, assetUse: element.assetUse, irPath: `${base}.src`, sceneId: scene.id });
      if (element.type === "figure") element.assets.forEach((asset, assetIndex) =>
        assets.push({ path: asset.src, assetUse: asset.assetUse, irPath: `${base}.assets[${assetIndex}].src`, sceneId: scene.id }));
      if (element.type === "scene3d" && element.frontTexture)
        assets.push({ path: element.frontTexture, assetUse: element.frontTextureAssetUse, irPath: `${base}.frontTexture`, sceneId: scene.id });
      if (element.compositing?.matte?.kind === "asset")
        assets.push({
          path: element.compositing.matte.src,
          assetUse: element.compositing.matte.assetUse,
          irPath: `${base}.compositing.matte.src`,
          sceneId: scene.id,
        });
    });
    scene.choreography.forEach((animation, animationIndex) => {
      if (animation.sfx) assets.push({ path: animation.sfx.src, assetUse: animation.sfx.assetUse, irPath: `score.scenes[${sceneIndex}].choreography[${animationIndex}].sfx.src`, sceneId: scene.id });
    });
  });
  if (score.audio?.music) assets.push({ path: score.audio.music.src, assetUse: score.audio.music.assetUse, irPath: "score.audio.music.src" });
  if (score.audio?.narration) assets.push({ path: score.audio.narration.src, assetUse: score.audio.narration.assetUse, irPath: "score.audio.narration.src" });
  return assets;
}

/** ADR-0031: expensive Score work cannot silently substitute an unsupported hero. */
export function runProductionApproachConformance(direction: DirectionT, score: ScoreT): Finding[] {
  const findings: Finding[] = [];
  const scoreAssets = new Set(renderedAssets(score).map((asset) => asset.path));
  direction.productionApproach.requirements.forEach((requirement, index) => {
    const path = `direction.productionApproach.requirements[${index}]`;
    if (requirement.support === "asset-assisted" && requirement.assetPath && !scoreAssets.has(requirement.assetPath))
      findings.push({
        ruleId: "CC-PROD-2",
        severity: requirement.importance === "must" ? "P1" : "P2",
        path,
        message: `${requirement.importance}-level asset-assisted requirement "${requirement.id}" planned ${requirement.assetPath}, but the Score does not render it`,
      });
    if (requirement.support === "unsupported")
      findings.push({
        ruleId: "CC-PROD-1",
        severity: requirement.importance === "should" ? "P2" : "P3",
        path,
        message: `Requirement "${requirement.id}" remains unsupported and must not be described as delivered`,
      });
  });
  return findings;
}

/** ADR-0023: rendered bytes must preserve Intake rights and reconstruction mode. */
export function runAssetProvenanceConformance(intake: IntakeT, direction: DirectionT, storyboard: StoryboardT, score: ScoreT): Finding[] {
  const findings: Finding[] = [];
  const sources = new Map(intake.sources.map((source) => [source.id, source]));
  const reconstruction = score.meta.reconstruction;
  const assets = renderedAssets(score);
  const referenceIds = new Set(reconstruction?.referenceSourceIds ?? []);

  for (const sourceId of referenceIds) {
    const source = sources.get(sourceId);
    if (!source) {
      findings.push({ ruleId: "CC-ASSET-1", severity: "P1", path: "score.meta.reconstruction.referenceSourceIds", message: `Reconstruction cites unknown Intake source "${sourceId}"` });
      continue;
    }
    if (!direction.trace.sourceIds.includes(sourceId) || !direction.scenes.some((beat) => beat.sourceIds.includes(sourceId)) || !storyboard.shots.some((shot) => shot.sourceIds.includes(sourceId)))
      findings.push({ ruleId: "CC-ASSET-4", severity: "P1", path: "score.meta.reconstruction.referenceSourceIds", message: `Reconstruction source "${sourceId}" was not planned in both Direction and Storyboard` });
    if (reconstruction?.mode === "source-assisted" && source.rights !== "owned" && source.rights !== "licensed")
      findings.push({ ruleId: "CC-ASSET-2", severity: "P1", path: "score.meta.reconstruction.referenceSourceIds", message: `Source-assisted reconstruction cannot render "${sourceId}" with rights "${source.rights}"` });
  }

  let renderedReference = false;
  for (const asset of assets) {
    if (reconstruction && !asset.assetUse) {
      findings.push({ ruleId: "CC-ASSET-1", severity: "P1", path: asset.irPath, message: `Declared ${reconstruction.mode} reconstruction must trace rendered asset "${asset.path}"` });
      continue;
    }
    if (!asset.assetUse) continue;
    const source = sources.get(asset.assetUse.sourceId);
    if (!source) {
      findings.push({ ruleId: "CC-ASSET-1", severity: "P1", path: asset.irPath, message: `Rendered asset "${asset.path}" cites unknown Intake source "${asset.assetUse.sourceId}"` });
      continue;
    }
    if (source.rights !== "owned" && source.rights !== "licensed")
      findings.push({ ruleId: "CC-ASSET-2", severity: "P1", path: asset.irPath, message: `Rendered asset "${asset.path}" cannot use source "${source.id}" with rights "${source.rights}"` });
    const shot = asset.sceneId ? storyboard.shots.find((item) => item.id === asset.sceneId) : undefined;
    const beat = shot ? direction.scenes.find((item) => item.id === shot.directionBeatId) : undefined;
    const planned = direction.trace.sourceIds.includes(source.id) && (shot
      ? !!beat?.sourceIds.includes(source.id) && shot.sourceIds.includes(source.id)
      : direction.scenes.some((item) => item.sourceIds.includes(source.id)) && storyboard.shots.some((item) => item.sourceIds.includes(source.id)));
    if (!planned)
      findings.push({ ruleId: "CC-ASSET-4", severity: "P1", path: asset.irPath, message: `Rendered source "${source.id}" was not planned for ${asset.sceneId ? `shot "${asset.sceneId}"` : "the Storyboard"}` });
    const localSource = source.origin.type === "path" ? source.origin.path : source.origin.type === "url" ? source.origin.capturedPath : undefined;
    if (!localSource || !source.origin.sha256 || source.origin.bytes == null)
      findings.push({ ruleId: "CC-ASSET-1", severity: "P1", path: asset.irPath, message: `Rendered source "${source.id}" must be a locked local path or URL capture` });
    else if (asset.assetUse.kind === "direct" && asset.path !== localSource)
      findings.push({ ruleId: "CC-ASSET-1", severity: "P1", path: asset.irPath, message: `Direct asset "${asset.path}" does not match locked source path "${localSource}"` });
    if (referenceIds.has(source.id)) renderedReference = true;
    if (reconstruction?.mode === "clean-room" && referenceIds.has(source.id))
      findings.push({ ruleId: "CC-ASSET-3", severity: "P1", path: asset.irPath, message: `Clean-room reconstruction cannot render bytes from reference source "${source.id}"` });
  }
  if (reconstruction?.mode === "source-assisted" && !renderedReference)
    findings.push({ ruleId: "CC-ASSET-3", severity: "P1", path: "score.meta.reconstruction", message: "Source-assisted reconstruction must trace at least one rendered asset to a named reference source" });
  return findings;
}

/** ADR-0040: brand evidence and executable style must survive without semantic pretending. */
export function runBrandConformance(brand: BrandSystemT, intake: IntakeT, direction: DirectionT, score: ScoreT): Finding[] {
  const findings: Finding[] = [];
  if (!score.meta.brand || score.meta.brand.brandId !== brand.brandId || score.meta.brand.brandSystemDigest !== brandSystemDigest(brand))
    findings.push({ ruleId: "CC-BRAND-3", severity: "P1", path: "score.meta.brand", message: `Score does not bind locked Brand System ${brand.brandId} at digest ${brandSystemDigest(brand)}` });
  if (intake.brand.profileId !== brand.brandId)
    findings.push({ ruleId: "CC-BRAND-3", severity: "P1", path: "intake.brand.profileId", message: `Intake Brand profile "${intake.brand.profileId ?? "<unset>"}" does not match locked Brand System "${brand.brandId}"` });
  if (intake.brand.name !== brand.name)
    findings.push({ ruleId: "CC-BRAND-3", severity: "P1", path: "intake.brand.name", message: `Intake brand "${intake.brand.name ?? "<unset>"}" does not match locked Brand System "${brand.name}"` });
  const sources = new Map(intake.sources.map((source) => [source.id, source]));
  brand.sourceIds.forEach((sourceId, index) => {
    const source = sources.get(sourceId);
    if (!source) findings.push({ ruleId: "CC-BRAND-3", severity: "P1", path: `brand.sourceIds[${index}]`, message: `Brand System cites unknown Intake source "${sourceId}"` });
    else if (!source.roles.includes("brand")) findings.push({ ruleId: "CC-BRAND-3", severity: "P1", path: `intake.sources[${intake.sources.indexOf(source)}].roles`, message: `Brand source "${sourceId}" is not declared with the brand role` });
  });
  const constraints = new Map(intake.brand.constraints.map((constraint) => [constraint.id, constraint]));
  for (const rule of brand.rules) {
    const constraint = constraints.get(rule.id);
    if (!constraint || constraint.statement !== rule.statement || constraint.priority !== rule.priority ||
      [...constraint.sourceIds].sort().join("|") !== [...rule.sourceIds].sort().join("|"))
      findings.push({ ruleId: "CC-BRAND-4", severity: "P1", path: `brand.rules.${rule.id}`, message: `Brand rule "${rule.id}" is not preserved verbatim as an Intake brand constraint` });
    if (rule.priority === "must" && !direction.trace.brandConstraintIds.includes(rule.id))
      findings.push({ ruleId: "CC-BRAND-4", severity: "P1", path: "direction.trace.brandConstraintIds", message: `Must-level Brand rule "${rule.id}" was dropped by Direction` });
  }
  if (score.style.name !== brand.styleName)
    findings.push({ ruleId: "CC-BRAND-5", severity: "P1", path: "score.style.name", message: `Score style "${score.style.name}" does not match Brand style "${brand.styleName}"` });
  for (const key of ["bg", "surface", "primary", "accent", "text", "textDim", "onMedia"] as const) {
    if (score.style.palette[key].toLowerCase() !== brand.palette[key].toLowerCase())
      findings.push({ ruleId: "CC-BRAND-5", severity: "P1", path: `score.style.palette.${key}`, message: `Score ${key} ${score.style.palette[key]} does not match Brand ${brand.palette[key]}` });
  }
  for (const [role, expected, family, weight] of [
    ["display", brand.typography.display, score.style.fonts.display, score.style.displayWeight],
    ["text", brand.typography.text, score.style.fonts.text, score.style.textWeight],
    ["mono", brand.typography.mono, score.style.fonts.mono, 400],
  ] as const) {
    if (family !== expected.family || weight !== expected.weight)
      findings.push({ ruleId: "CC-BRAND-6", severity: "P1", path: `score.style.fonts.${role}`, message: `Score ${role} face ${family}:${weight} does not match Brand ${expected.family}:${expected.weight}` });
  }
  if (score.style.trackingDisplay !== brand.typography.trackingDisplay)
    findings.push({ ruleId: "CC-BRAND-6", severity: "P1", path: "score.style.trackingDisplay", message: `Score display tracking ${score.style.trackingDisplay} does not match Brand ${brand.typography.trackingDisplay}` });
  const scoreFaces = new Map(score.style.fontAssets.map((face) => [`${face.family}:${face.weight}`, face]));
  for (const face of brand.fontAssets) {
    const scoreFace = scoreFaces.get(`${face.family}:${face.weight}`);
    if (!scoreFace || scoreFace.src !== face.src || scoreFace.assetUse?.sourceId !== face.sourceId)
      findings.push({ ruleId: "CC-BRAND-6", severity: "P1", path: "score.style.fontAssets", message: `Brand font ${face.family}:${face.weight} at ${face.src} is not rendered with source ${face.sourceId}` });
  }
  if (score.style.fontAssets.length !== brand.fontAssets.length)
    findings.push({ ruleId: "CC-BRAND-6", severity: "P1", path: "score.style.fontAssets", message: "Score custom-font set differs from the locked Brand System" });
  return findings;
}

export function runCreativeConformance(intake: IntakeT, direction: DirectionT, storyboard: StoryboardT, score: ScoreT, projectDir?: string): Finding[] {
  return [
    ...runIntakeDirectionConformance(intake, direction),
    ...runDirectionStoryboardConformance(direction, storyboard),
    ...runStoryboardScoreConformance(storyboard, score, projectDir),
    ...runProductionApproachConformance(direction, score),
    ...runAssetProvenanceConformance(intake, direction, storyboard, score),
  ];
}

export function summarize(findings: Finding[]): {
  p1: number; p2: number; p3: number; hardDefects: number; styleFlags: number; acceptedStyleFlags: number; releasable: boolean;
} {
  const classified = applyGatePolicies(findings);
  const p1 = classified.filter((x) => x.severity === "P1").length;
  const p2 = classified.filter((x) => x.severity === "P2").length;
  const p3 = classified.filter((x) => x.severity === "P3").length;
  const hardDefects = classified.filter((x) => x.policy === "hard-defect").length;
  const styleFlags = classified.filter((x) => x.policy === "style-flag").length;
  const acceptedStyleFlags = classified.filter((x) => x.policy === "style-flag" && x.accepted).length;
  return { p1, p2, p3, hardDefects, styleFlags, acceptedStyleFlags, releasable: hardDefects === 0 };
}
export { totalDurationMs };
