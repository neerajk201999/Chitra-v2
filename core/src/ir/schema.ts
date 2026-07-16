/**
 * The Chitra Motion IR — two tiers (ADR-0003).
 * Tier 1 (Direction): intent, written by director agents, read by critics.
 * Tier 2 (Score): deterministic execution, compiled to the render backend.
 * Both are zod-validated; validation IS Quality Engine layer 1 (ADR-0004).
 */
import { z } from "zod";
import {
  DURATIONS,
  EASINGS,
  IR_VERSION,
  PRESETS,
  REGISTERS,
  SAFE_ZONES,
  TRANSITIONS,
  TYPE_SCALE,
} from "../motion/tokens.js";

const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case, start with a letter");
const reason = z.string().min(8, "every creative decision carries a real reason");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "6-digit hex color");
const projectAssetPath = z.string().min(1).refine(
  (value) => {
    const parts = value.split("/");
    return !value.startsWith("/") && !value.includes("\\") &&
      !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
      parts.every((part) => part.length > 0 && part !== "." && part !== "..");
  },
  "asset path must be a normalized project-relative POSIX path without traversal"
);
const AssetUse = z.object({
  sourceId: id,
  kind: z.enum(["direct", "derived"]),
  note: reason,
});

const durationToken = z.enum(Object.keys(DURATIONS) as [string, ...string[]]);
const easingToken = z.enum(Object.keys(EASINGS) as [string, ...string[]]);
const presetName = z.enum(Object.keys(PRESETS) as [string, ...string[]]);
const register = z.enum(Object.keys(REGISTERS) as [string, ...string[]]);
const typeRole = z.enum(Object.keys(TYPE_SCALE) as [string, ...string[]]);
const transition = z.enum(TRANSITIONS);

// ── Tier 1: Direction ──────────────────────────────────────────────────────
export const DIRECTION_VERSION = "0.2.0";
export const STORYBOARD_VERSION = "0.1.0";

export const SceneDirection = z.object({
  id,
  narrativeRole: z.string().min(4), // e.g. "cold open — state the tension"
  shotIntent: z.string().min(8), // what the viewer should feel/notice
  heroMoment: z.string().optional(), // what visually peaks here, if anything
  pacingWeight: z.number().min(0.25).max(3).default(1), // relative hold emphasis
  sourceIds: z.array(id).min(1),
  preferenceIds: z.array(id).default([]),
});

export const Direction = z.object({
  directionVersion: z.literal(DIRECTION_VERSION),
  irVersion: z.literal(IR_VERSION),
  tier: z.literal("direction"),
  id,
  title: z.string().min(1),
  register,
  logline: z.string().min(10),
  narrativeArc: z.string().min(20), // setup → tension → peak → release
  tone: z.array(z.string()).min(1).max(5),
  audience: z.string().min(4),
  deliverable: z.object({
    targetDurationMs: z.number().int().min(1000).max(600000).optional(),
    width: z.number().int().min(320).max(4096).optional(),
    height: z.number().int().min(320).max(4096).optional(),
    channel: z.string().min(2).optional(),
  }).superRefine((value, ctx) => {
    if ((value.width == null) !== (value.height == null))
      ctx.addIssue({ code: "custom", message: "deliverable width and height must be supplied together" });
  }),
  creativeConcept: z.object({
    emotionalPromise: z.string().min(8),
    governingIdea: z.string().min(8),
    tension: z.string().min(8),
    resolution: z.string().min(8),
    visualThesis: z.string().min(8),
    soundThesis: z.string().min(8).optional(),
  }),
  trace: z.object({
    intakeProjectId: id,
    objective: z.object({
      primary: z.string().min(8),
      audience: z.string().min(4),
      singleMessage: z.string().min(4),
    }),
    constraints: z.object({
      mustInclude: z.array(z.string().min(2)).default([]),
      mustAvoid: z.array(z.string().min(2)).default([]),
      legal: z.array(z.string().min(2)).default([]),
      accessibility: z.array(z.string().min(2)).default([]),
    }),
    sourceIds: z.array(id).min(1),
    preferenceIds: z.array(id).default([]),
    brandConstraintIds: z.array(id).default([]),
    assumptionIds: z.array(id).default([]),
  }),
  scenes: z.array(SceneDirection).min(1),
}).superRefine((value, ctx) => {
  const unique = (values: string[], path: Array<string | number>) => {
    const seen = new Set<string>();
    values.forEach((entry, index) => {
      if (seen.has(entry)) ctx.addIssue({ code: "custom", path: [...path, index], message: `duplicate trace id ${entry}` });
      seen.add(entry);
    });
  };
  unique(value.trace.sourceIds, ["trace", "sourceIds"]);
  unique(value.trace.preferenceIds, ["trace", "preferenceIds"]);
  unique(value.trace.brandConstraintIds, ["trace", "brandConstraintIds"]);
  unique(value.trace.assumptionIds, ["trace", "assumptionIds"]);
  const sceneIds = new Set<string>();
  value.scenes.forEach((scene, index) => {
    if (sceneIds.has(scene.id))
      ctx.addIssue({ code: "custom", path: ["scenes", index, "id"], message: `duplicate directed beat id ${scene.id}` });
    sceneIds.add(scene.id);
    unique(scene.sourceIds, ["scenes", index, "sourceIds"]);
    unique(scene.preferenceIds, ["scenes", index, "preferenceIds"]);
  });
});
export type DirectionT = z.infer<typeof Direction>;

// ── Tier 1.5: Storyboard ──────────────────────────────────────────────────
const storyboardElementType = z.enum([
  "text", "shape", "image", "video", "figure", "cursor", "particles",
  "scene3d", "stat", "chart-bar",
]);

export const StoryboardShot = z.object({
  id,
  directionBeatId: id,
  reason: z.string().min(8),
  whyNow: z.string().min(8),
  shotIntent: z.string().min(8),
  sourceIds: z.array(id).min(1),
  preferenceIds: z.array(id).default([]),
  hero: z.object({
    description: z.string().min(4),
    elementType: storyboardElementType.optional(),
  }).optional(),
  composition: z.object({
    layout: z.string().min(4),
    hierarchy: z.string().min(4),
    negativeSpace: z.string().min(4),
  }),
  camera: z.object({
    movement: z.enum(["locked", "push", "pull", "pan", "tilt", "orbit", "ui-follow", "other"]),
    reason: z.string().min(8),
  }),
  typography: z.object({
    intent: z.string().min(4),
    onScreenCopy: z.array(z.string().min(1)).max(10).default([]),
  }),
  colorIntent: z.string().min(4),
  audioIntent: z.string().min(4).optional(),
  targetDurationMs: z.number().int().min(500).max(20000),
  transition: z.object({
    intent: z.string().min(4),
    preferredType: transition.optional(),
  }),
});

export const Storyboard = z.object({
  storyboardVersion: z.literal(STORYBOARD_VERSION),
  tier: z.literal("storyboard"),
  title: z.string().min(1),
  register,
  directionId: id,
  deliverable: z.object({
    targetDurationMs: z.number().int().min(1000).max(600000).optional(),
    width: z.number().int().min(320).max(4096).optional(),
    height: z.number().int().min(320).max(4096).optional(),
    channel: z.string().min(2).optional(),
  }).superRefine((value, ctx) => {
    if ((value.width == null) !== (value.height == null))
      ctx.addIssue({ code: "custom", message: "deliverable width and height must be supplied together" });
  }),
  shots: z.array(StoryboardShot).min(1).max(60),
}).superRefine((value, ctx) => {
  const shotIds = new Set<string>();
  value.shots.forEach((shot, index) => {
    if (shotIds.has(shot.id))
      ctx.addIssue({ code: "custom", path: ["shots", index, "id"], message: `duplicate storyboard shot id ${shot.id}` });
    shotIds.add(shot.id);
    if (new Set(shot.sourceIds).size !== shot.sourceIds.length)
      ctx.addIssue({ code: "custom", path: ["shots", index, "sourceIds"], message: "shot source IDs must be unique" });
    if (new Set(shot.preferenceIds).size !== shot.preferenceIds.length)
      ctx.addIssue({ code: "custom", path: ["shots", index, "preferenceIds"], message: "shot preference IDs must be unique" });
  });
});
export type StoryboardT = z.infer<typeof Storyboard>;

// ── Tier 2: Score — shared pieces ─────────────────────────────────────────
const Anchor = z.enum([
  "center",
  "top-left",
  "top",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
]);

/** Position on a 100×100 unit stage; anchor defines the reference point. */
const Position = z.object({
  anchor: Anchor.default("center"),
  x: z.number().min(-20).max(120).optional(), // stage units; omit → anchor default
  y: z.number().min(-20).max(120).optional(),
});

const TextElement = z.object({
  type: z.literal("text"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("support"),
  textRole: typeRole,
  content: z.string().min(1),
  color: z.enum(["text", "text-dim", "primary", "accent", "on-media"]).default("text"),
  maxWidth: z.number().min(10).max(100).optional(), // stage units
  align: z.enum(["left", "center", "right"]).default("center"),
  position: Position.default({ anchor: "center" }),
});

const ShapeElement = z.object({
  type: z.literal("shape"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("ambient"),
  shape: z.enum(["rect", "line", "circle", "gradient-field"]),
  color: z.enum(["primary", "accent", "surface", "text-dim"]).default("surface"),
  opacity: z.number().min(0).max(1).default(1),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(0).max(140).default(20),
  height: z.number().min(0).max(140).default(20),
  radius: z.number().min(0).max(50).default(0), // corner radius, stage units
});

const ImageElement = z.object({
  type: z.literal("image"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("support"),
  // Project-relative path only. Remote URLs are forbidden by ADR-0006: the render
  // path never touches the network — acquisition is `chitra fetch`/`chitra snap`.
  src: projectAssetPath,
  assetUse: AssetUse.optional(),
  fit: z.enum(["cover", "contain"]).default("cover"),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(1).max(140).default(100),
  height: z.number().min(1).max(140).default(100),
  radius: z.number().min(0).max(50).default(0),
  scrim: z.number().min(0).max(0.8).default(0), // darkening overlay for text legibility
});

const VideoElement = z.object({
  type: z.literal("video"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("hero"),
  // Same hermetic rule as images (ADR-0006/0007): project-relative only.
  src: projectAssetPath,
  assetUse: AssetUse.optional(),
  startMs: z.number().int().min(0).default(0), // offset into the source clip
  fit: z.enum(["cover", "contain"]).default("cover"),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(1).max(140).default(100),
  height: z.number().min(1).max(140).default(100),
  radius: z.number().min(0).max(50).default(0),
  scrim: z.number().min(0).max(0.8).default(0),
});

/** ADR-0009/0020: deterministic dot-matrix particle field. Authors pick a
 *  generated formation or supply bounded, ordered custom coordinates. */
const ParticleCoordinate = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
}).strict();
const ParticlePoint = ParticleCoordinate.extend({
  /** ADR-0025: bounded per-dot appearance; absent values preserve uniform fields. */
  size: z.number().min(0.25).max(2).optional(),
  opacity: z.number().min(0.05).max(1).optional(),
});

const ParticlesElement = z.object({
  type: z.literal("particles"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("ambient"),
  formation: z.enum(["grid", "ring", "scatter", "custom"]).default("grid"),
  /** ADR-0020: ordered normalized coordinates for a bounded custom formation. */
  points: z.array(ParticlePoint).min(4).max(400).optional(),
  color: z.enum(["primary", "accent", "text", "on-media"]).default("accent"),
  cols: z.number().int().min(2).max(24).default(8), // grid columns
  rows: z.number().int().min(2).max(24).default(6), // grid rows
  count: z.number().int().min(4).max(400).default(48), // ring/scatter dot count
  radius: z.number().min(5).max(60).default(20), // ring radius, stage units
  dotSize: z.number().min(1).max(40).default(7), // px at 1080
  glow: z.number().min(0).max(4).default(1.5), // shadow-radius multiplier
  seed: z.number().int().min(0).max(99999).default(1),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(5).max(140).default(40),
  height: z.number().min(5).max(140).default(40),
}).superRefine((value, ctx) => {
  if (value.formation === "custom" && !value.points)
    ctx.addIssue({ code: "custom", path: ["points"], message: "custom particle formation requires points" });
  if (value.formation !== "custom" && value.points)
    ctx.addIssue({ code: "custom", path: ["points"], message: "particle points are only valid with formation custom" });
});

/** ADR-0008: agent-authored UI mockup — a sandboxed, token-themed HTML fragment.
 *  Scripts/handlers/external refs are stripped at compile; gates run on its pixels. */
const FigureElement = z.object({
  type: z.literal("figure"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  src: projectAssetPath.refine((value) => value.endsWith(".html"), "figure src must be an .html fragment"),
  assets: z.array(z.object({ src: projectAssetPath, assetUse: AssetUse })).max(32).default([]),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(5).max(140).default(60),
  height: z.number().min(5).max(140).default(60),
  radius: z.number().min(0).max(50).default(0),
  shadow: z.boolean().default(true), // soft elevation, theme-aware
}).superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.assets.forEach((asset, index) => {
    if (seen.has(asset.src)) ctx.addIssue({ code: "custom", path: ["assets", index, "src"], message: `duplicate figure asset ${asset.src}` });
    seen.add(asset.src);
  });
});

/** ADR-0008: stylized pointer for staged interaction moments. */
const CursorElement = z.object({
  type: z.literal("cursor"),
  id,
  role: z.literal("support").default("support"),
  variant: z.enum(["arrow", "hand"]).default("arrow"),
  position: Position.default({ anchor: "center" }),
  scale: z.number().min(0.6).max(2).default(1),
});

/** ADR-0010: real 3D via a curated Three.js scene driven by our seek clock.
 *  Authors pick a primitive + params; we own the scene code (no user script). */
const Scene3dElement = z.object({
  type: z.literal("scene3d"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  primitive: z.enum(["card", "coin", "slab"]).default("card"),
  frontTexture: projectAssetPath.refine(
    (value) => /\.(?:png|jpe?g|webp)$/i.test(value),
    "scene3d frontTexture must be PNG, JPEG, or WebP"
  ).optional(),
  frontTextureAssetUse: AssetUse.optional(),
  // Palette-driven look; hexes resolved from style at compile.
  baseColor: z.enum(["surface", "primary", "accent", "text"]).default("surface"),
  envTint: z.enum(["primary", "accent", "neutral"]).default("accent"),
  metalness: z.number().min(0).max(1).default(0.5),
  roughness: z.number().min(0.05).max(1).default(0.3),
  spinDeg: z.number().min(0).max(40).default(16), // gentle oscillation amplitude, degrees
  tiltDeg: z.number().min(-30).max(30).default(12),
  exposure: z.number().min(0.5).max(2.5).default(1.4),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(10).max(140).default(70),
  height: z.number().min(10).max(140).default(50),
}).superRefine((value, ctx) => {
  if (value.frontTexture && value.primitive === "coin")
    ctx.addIssue({ code: "custom", path: ["frontTexture"], message: "scene3d coin front textures are unsupported" });
  if (value.frontTextureAssetUse && !value.frontTexture)
    ctx.addIssue({ code: "custom", path: ["frontTextureAssetUse"], message: "frontTextureAssetUse requires frontTexture" });
});

const StatElement = z.object({
  type: z.literal("stat"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  value: z.number(),
  format: z.enum(["plain", "percent", "compact", "currency-usd"]).default("plain"),
  decimals: z.number().int().min(0).max(2).default(0),
  label: z.string().optional(),
  color: z.enum(["text", "primary", "accent"]).default("text"),
  position: Position.default({ anchor: "center" }),
});

const ChartBarElement = z.object({
  type: z.literal("chart-bar"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  series: z
    .array(z.object({ label: z.string(), value: z.number().min(0) }))
    .min(2)
    .max(8),
  highlight: z.number().int().min(0).optional(), // index of emphasized bar
  position: Position.default({ anchor: "center" }),
  width: z.number().min(20).max(100).default(60),
  height: z.number().min(10).max(80).default(40),
});

/** ADR-0021: one-level full-stage transform hierarchy. */
const GroupElement = z.object({
  type: z.literal("group"),
  id,
  role: z.enum(["support", "ambient"]).default("support"),
  children: z.array(id).min(1).max(11),
});

export const Element = z.discriminatedUnion("type", [
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  FigureElement,
  CursorElement,
  ParticlesElement,
  Scene3dElement,
  StatElement,
  ChartBarElement,
  GroupElement,
]);
export type ElementT = z.infer<typeof Element>;

// ── Choreography ───────────────────────────────────────────────────────────
/** Relational timing: after scene-start or a named animation, plus offset. */
const At = z.object({
  after: z.union([z.literal("scene-start"), id]).default("scene-start"),
  offsetMs: z.number().int().min(0).max(10000).default(0),
  /** ADR-0011: fire at detected beat index N (absolute, from audio.music.beats),
   *  converted to scene-relative at compile. Overrides `after` when present. */
  onBeat: z.number().int().min(0).max(1999).optional(),
});

const Stagger = z.object({
  eachMs: z.number().int().min(10).max(60), // MO-CHOR-1 cap encoded in schema
  from: z.enum(["start", "center", "end"]).default("start"),
});

/** ADR-0013: an exact, frame-addressed transform state. Values are deliberately
 *  typed and bounded; this is not an arbitrary GSAP/JavaScript escape hatch. */
const TransformKeyframe = z
  .object({
    frame: z.number().int().min(0).max(1200), // max scene: 20s × 60fps
    x: z.number().min(-200).max(200).optional(), // stage-unit offset
    y: z.number().min(-200).max(200).optional(),
    scale: z.number().min(0.01).max(20).optional(),
    scaleX: z.number().min(0.01).max(20).optional(),
    scaleY: z.number().min(0.01).max(20).optional(),
    rotationXDeg: z.number().min(-1440).max(1440).optional(),
    rotationYDeg: z.number().min(-1440).max(1440).optional(),
    rotationZDeg: z.number().min(-1440).max(1440).optional(),
    opacity: z.number().min(0).max(1).optional(),
    perspectivePx: z.number().min(100).max(5000).optional(),
    origin: Anchor.optional(),
    easing: easingToken.optional(), // easing of the segment arriving here
  })
  .refine(
    (k) =>
      k.x != null || k.y != null || k.scale != null || k.scaleX != null ||
      k.scaleY != null || k.rotationXDeg != null || k.rotationYDeg != null ||
      k.rotationZDeg != null || k.opacity != null || k.perspectivePx != null ||
      k.origin != null,
    { message: "a keyframe must set at least one transform/compositing property" }
  )
  .refine((k) => k.scale == null || (k.scaleX == null && k.scaleY == null), {
    message: "a keyframe cannot combine uniform scale with axis scale",
  });

const KeyframeTrack = z
  .array(TransformKeyframe)
  .min(2)
  .max(1201)
  .superRefine((frames, ctx) => {
    if (frames[0]?.frame !== 0)
      ctx.addIssue({ code: "custom", path: [0, "frame"], message: "a keyframe track must begin at frame 0" });
    for (let i = 1; i < frames.length; i++) {
      if (frames[i].frame <= frames[i - 1].frame)
        ctx.addIssue({ code: "custom", path: [i, "frame"], message: "keyframe indices must be strictly increasing" });
    }
  });

/** ADR-0028: bounded state inside Chitra's curated Three.js subject. */
const ThreeVector = z.object({
  x: z.number().min(-50).max(50).optional(),
  y: z.number().min(-50).max(50).optional(),
  z: z.number().min(-50).max(50).optional(),
}).strict().refine((value) => value.x != null || value.y != null || value.z != null, "a 3D vector must set at least one axis");
const ThreeRotation = z.object({
  x: z.number().min(-1440).max(1440).optional(),
  y: z.number().min(-1440).max(1440).optional(),
  z: z.number().min(-1440).max(1440).optional(),
}).strict().refine((value) => value.x != null || value.y != null || value.z != null, "a 3D rotation must set at least one axis");
const ThreeScale = z.object({
  x: z.number().min(0.01).max(20).optional(),
  y: z.number().min(0.01).max(20).optional(),
  z: z.number().min(0.01).max(20).optional(),
}).strict().refine((value) => value.x != null || value.y != null || value.z != null, "a 3D scale must set at least one axis");
const ThreeKeyframe = z.object({
  frame: z.number().int().min(0).max(1200),
  mesh: z.object({ position: ThreeVector.optional(), rotationDeg: ThreeRotation.optional(), scale: ThreeScale.optional() }).strict().optional(),
  camera: z.object({ position: ThreeVector.optional(), fov: z.number().min(10).max(100).optional() }).strict().optional(),
  keyLight: z.object({ position: ThreeVector.optional(), intensity: z.number().min(0).max(20).optional() }).strict().optional(),
  fillLight: z.object({ position: ThreeVector.optional(), intensity: z.number().min(0).max(20).optional() }).strict().optional(),
  exposure: z.number().min(0.25).max(5).optional(),
  easing: easingToken.optional(),
}).strict().refine((value) => value.mesh || value.camera || value.keyLight || value.fillLight || value.exposure != null, {
  message: "a three keyframe must set at least one internal 3D property",
});
const ThreeKeyframeTrack = z.array(ThreeKeyframe).min(2).max(1201).superRefine((frames, ctx) => {
  if (frames[0]?.frame !== 0)
    ctx.addIssue({ code: "custom", path: [0, "frame"], message: "a three keyframe track must begin at frame 0" });
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].frame <= frames[i - 1].frame)
      ctx.addIssue({ code: "custom", path: [i, "frame"], message: "three keyframe indices must be strictly increasing" });
  }
});

export const Animation = z.object({
  id,
  /** Element id; group prefix with trailing '*'; or `figureId/innerId` to
   *  choreograph an element INSIDE a figure fragment (ADR-0008 nested comps).
   *  Inner ids are author-defined in the fragment; unresolved selectors fail
   *  loudly at session open (missingTargets). */
  target: z
    .string()
    .regex(/^[a-z][a-z0-9-]*(\*|\/[a-z][a-z0-9-]*)?$/, "target is an element id, a group prefix ending in *, or figureId/innerId"),
  preset: presetName,
  duration: durationToken.optional(), // defaults from preset
  easing: easingToken.optional(), // defaults from preset
  at: At.default({ after: "scene-start", offsetMs: 0 }),
  stagger: Stagger.optional(),
  distance: z.number().min(1).max(60).optional(), // travel in stage units (slide/fade-up/drift)
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  /** ADR-0008: cursor-move only (gated IR-CUR-1) — the sole waypoint surface in the IR. */
  waypoints: z
    .array(z.object({ x: z.number().min(-20).max(120), y: z.number().min(-20).max(120) }))
    .min(1)
    .max(8)
    .optional(),
  /** ADR-0009: particle-morph only (gated MO-PART-1) — target formation for a dot field. */
  morphTo: z.enum(["grid", "ring", "scatter", "custom"]).optional(),
  /** ADR-0020: destination coordinates for morphTo custom. A custom source may
   *  omit these to return to its own ordered base points. */
  morphPoints: z.array(ParticleCoordinate).min(4).max(400).optional(),
  /** ADR-0013: only valid with `keyframe-track`; MO-KEY-1 enforces the pairing,
   *  explicit reason, and scene bounds. */
  keyframes: KeyframeTrack.optional(),
  /** ADR-0028: typed internal scene3d state; paired by MO-3D-2. */
  threeKeyframes: ThreeKeyframeTrack.optional(),
  /** Escape hatch (MO-EASE-1): raw values allowed ONLY with a reason. Flagged by gates. */
  override: z
    .object({ reason, durationMs: z.number().min(50).max(5000).optional(), gsapEase: z.string().optional() })
    .optional(),
  /** ADR-0007: a sound fired at this animation's resolved start (mixed at mux).
   *  Sparse by rule (MO-AUD-3) — hero entrances and transitions, not every move. */
  sfx: z
    .object({
      src: projectAssetPath,
      assetUse: AssetUse.optional(),
      gainDb: z.number().min(-40).max(6).default(-14),
    })
    .optional(),
}).superRefine((value, ctx) => {
  if (value.morphPoints && value.morphTo !== "custom")
    ctx.addIssue({ code: "custom", path: ["morphPoints"], message: "morphPoints require morphTo custom" });
});
export type AnimationT = z.infer<typeof Animation>;

// ── Scene ──────────────────────────────────────────────────────────────────
export const Scene = z.object({
  id,
  reason, // why this scene exists (OpenMontage's best idea)
  durationMs: z.number().int().min(500).max(20000),
  background: z.enum(["bg", "surface", "primary", "image"]).default("bg"),
  backgroundImage: projectAssetPath.optional(),
  backgroundAssetUse: AssetUse.optional(),
  elements: z.array(Element).min(1).max(12),
  choreography: z.array(Animation).default([]),
  transitionOut: z
    .object({ type: transition, duration: durationToken.default("standard") })
    .default({ type: "cut", duration: "standard" }),
}).superRefine((value, ctx) => {
  if (value.background === "image" && !value.backgroundImage)
    ctx.addIssue({ code: "custom", path: ["backgroundImage"], message: "image background requires backgroundImage" });
  if (value.background !== "image" && (value.backgroundImage || value.backgroundAssetUse))
    ctx.addIssue({ code: "custom", path: ["backgroundImage"], message: "backgroundImage and backgroundAssetUse require background image" });
  if (value.backgroundAssetUse && !value.backgroundImage)
    ctx.addIssue({ code: "custom", path: ["backgroundAssetUse"], message: "backgroundAssetUse requires backgroundImage" });
});
export type SceneT = z.infer<typeof Scene>;

// ── Style (resolved house style; styles/ presets produce this) ────────────
export const Style = z.object({
  name: z.string(),
  palette: z.object({
    bg: hex,
    surface: hex,
    primary: hex,
    accent: hex,
    text: hex,
    textDim: hex,
    onMedia: hex.default("#ffffff"),
  }),
  fonts: z.object({
    display: z.enum(["Space Grotesk", "Instrument Serif", "Inter"]),
    text: z.enum(["Inter", "Space Grotesk"]),
    mono: z.enum(["JetBrains Mono"]).default("JetBrains Mono"),
  }),
  displayWeight: z.number().int().min(300).max(700).default(500),
  textWeight: z.number().int().min(300).max(600).default(400),
  trackingDisplay: z.number().min(-0.05).max(0.02).default(-0.02), // em
  grain: z.number().min(0).max(0.12).default(0), // film-grain opacity
});
export type StyleT = z.infer<typeof Style>;

// ── Tier 2 root: Score ─────────────────────────────────────────────────────
export const Score = z.object({
  irVersion: z.literal(IR_VERSION),
  tier: z.literal("score"),
  meta: z.object({
    title: z.string().min(1),
    register,
    width: z.number().int().min(320).max(4096).default(1920),
    height: z.number().int().min(320).max(4096).default(1080),
    fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).default(30),
    seed: z.number().int().min(0).default(1),
    safeZone: z.enum(Object.keys(SAFE_ZONES) as [string, ...string[]]).default("16x9-standard"),
    reconstruction: z.object({
      mode: z.enum(["clean-room", "source-assisted"]),
      referenceSourceIds: z.array(id).min(1).refine((ids) => new Set(ids).size === ids.length, "reference source IDs must be unique"),
      reason,
    }).optional(),
  }),
  style: Style,
  scenes: z.array(Scene).min(1),
  /** Audio v1: music bed with loudness normalization and an optional declared beat grid. */
  audio: z
    .object({
      music: z
        .object({
          src: projectAssetPath,
          assetUse: AssetUse.optional(),
          gainDb: z.number().min(-30).max(0).default(-6), // pre-normalization trim
          bpm: z.number().min(40).max(220).optional(), // declared tempo → enables MO-AUD-2 beat-cut gate
          firstBeatMs: z.number().int().min(0).default(0), // offset of beat 1 in the music file
          // ADR-0011: detected beat times (ms from start) from `chitra analyze-audio`.
          // Enables at.onBeat — motion snapped to the actual track.
          beats: z.array(z.number().int().min(0)).max(2000).optional(),
          fadeOutMs: z.number().int().min(0).max(5000).default(800),
        })
        .optional(),
    })
    .optional(),
});
export type ScoreT = z.infer<typeof Score>;

export type ValidationIssue = { path: string; message: string };

export function validateScore(data: unknown): { ok: true; score: ScoreT } | { ok: false; issues: ValidationIssue[] } {
  const r = Score.safeParse(data);
  if (r.success) return { ok: true, score: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function validateDirection(data: unknown): { ok: true; direction: DirectionT } | { ok: false; issues: ValidationIssue[] } {
  const r = Direction.safeParse(data);
  if (r.success) return { ok: true, direction: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function validateStoryboard(data: unknown): { ok: true; storyboard: StoryboardT } | { ok: false; issues: ValidationIssue[] } {
  const result = Storyboard.safeParse(data);
  if (result.success) return { ok: true, storyboard: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}
