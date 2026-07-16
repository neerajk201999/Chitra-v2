import { z } from "zod";
import { REGISTERS } from "../motion/tokens.js";

export const INTAKE_VERSION = "0.1.0";

const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case, start with a letter");
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "sha256 is 64 lowercase hex characters");
const projectPath = z.string().min(1).refine(
  (value) => {
    const parts = value.split("/");
    return !value.startsWith("/") && !value.includes("\\") &&
      parts.every((part) => part.length > 0 && part !== "." && part !== "..");
  },
  "path must be a normalized project-relative POSIX path without traversal"
);
const httpUrl = z.string().url().refine(
  (value) => value.startsWith("https://") || value.startsWith("http://"),
  "URL must use http or https"
);
const register = z.enum(Object.keys(REGISTERS) as [string, ...string[]]);

const fingerprint = {
  sha256: sha256.optional(),
  bytes: z.number().int().nonnegative().optional(),
};

export const SourceOrigin = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("inline"),
    content: z.string().min(1),
    label: z.string().min(1).optional(),
    ...fingerprint,
  }),
  z.object({
    type: z.literal("path"),
    path: projectPath,
    ...fingerprint,
  }),
  z.object({
    type: z.literal("url"),
    url: httpUrl,
    capturedPath: projectPath.optional(),
    ...fingerprint,
  }),
]);

const Evidence = z.object({
  kind: z.enum([
    "style-dna",
    "transcript",
    "audio-analysis",
    "image-inspection",
    "web-capture",
    "notes",
    "other",
  ]),
  path: projectPath,
  ...fingerprint,
});

export const IntakeSource = z.object({
  id,
  kind: z.enum([
    "direction-prompt",
    "reference-video",
    "reference-image",
    "screenshot",
    "webpage",
    "brand-asset",
    "footage",
    "audio",
    "document",
    "data",
    "other",
  ]),
  roles: z.array(z.enum([
    "content",
    "style",
    "structure",
    "motion",
    "audio",
    "brand",
    "constraint",
  ])).min(1).max(7),
  origin: SourceOrigin,
  usage: z.string().min(8, "state how this source should influence the film"),
  rights: z.enum(["owned", "licensed", "reference-only", "unknown"]),
  evidence: z.array(Evidence).default([]),
});

const Preference = z.object({
  id,
  statement: z.string().min(4),
  polarity: z.enum(["prefer", "avoid"]),
  priority: z.enum(["must", "should", "could"]),
  sourceIds: z.array(id).default([]),
});

const BrandConstraint = z.object({
  id,
  statement: z.string().min(4),
  priority: z.enum(["must", "should", "could"]),
  sourceIds: z.array(id).default([]),
});

const Assumption = z.object({
  id,
  statement: z.string().min(4),
  risk: z.enum(["low", "medium", "high"]),
  status: z.enum(["proposed", "approved", "rejected"]).default("proposed"),
});

const OpenQuestion = z.object({
  id,
  question: z.string().min(4),
  blocksDirection: z.boolean().default(false),
});

export const Intake = z.object({
  intakeVersion: z.literal(INTAKE_VERSION),
  tier: z.literal("intake"),
  projectId: id,
  title: z.string().min(1),
  objective: z.object({
    primary: z.string().min(8),
    audience: z.string().min(4),
    singleMessage: z.string().min(4),
    callToAction: z.string().min(2).optional(),
  }),
  deliverable: z.object({
    register: register.optional(),
    targetDurationMs: z.number().int().min(1000).max(600000).optional(),
    width: z.number().int().min(320).max(4096).optional(),
    height: z.number().int().min(320).max(4096).optional(),
    channel: z.string().min(2).optional(),
  }).superRefine((value, ctx) => {
    if ((value.width == null) !== (value.height == null))
      ctx.addIssue({ code: "custom", message: "deliverable width and height must be supplied together" });
  }),
  sources: z.array(IntakeSource).min(1),
  preferences: z.array(Preference).default([]),
  brand: z.object({
    name: z.string().min(1).optional(),
    constraints: z.array(BrandConstraint).default([]),
  }).default({ constraints: [] }),
  constraints: z.object({
    mustInclude: z.array(z.string().min(2)).default([]),
    mustAvoid: z.array(z.string().min(2)).default([]),
    legal: z.array(z.string().min(2)).default([]),
    accessibility: z.array(z.string().min(2)).default([]),
  }).default({ mustInclude: [], mustAvoid: [], legal: [], accessibility: [] }),
  assumptions: z.array(Assumption).default([]),
  openQuestions: z.array(OpenQuestion).default([]),
}).superRefine((value, ctx) => {
  const sourceIds = new Set<string>();
  value.sources.forEach((source, index) => {
    if (sourceIds.has(source.id))
      ctx.addIssue({ code: "custom", path: ["sources", index, "id"], message: `duplicate source id ${source.id}` });
    sourceIds.add(source.id);
    if (new Set(source.roles).size !== source.roles.length)
      ctx.addIssue({ code: "custom", path: ["sources", index, "roles"], message: "source roles must be unique" });
    if (source.origin.type === "url" && !source.origin.capturedPath && (source.origin.sha256 || source.origin.bytes != null))
      ctx.addIssue({ code: "custom", path: ["sources", index, "origin"], message: "an uncaptured URL cannot claim a content fingerprint" });
  });

  const unique = (items: Array<{ id: string }>, path: string) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id))
        ctx.addIssue({ code: "custom", path: [path, index, "id"], message: `duplicate ${path} id ${item.id}` });
      seen.add(item.id);
    });
  };
  unique(value.preferences, "preferences");
  unique(value.brand.constraints, "brand.constraints");
  unique(value.assumptions, "assumptions");
  unique(value.openQuestions, "openQuestions");

  const checkRefs = (refs: string[], path: Array<string | number>) => refs.forEach((ref, index) => {
    if (!sourceIds.has(ref))
      ctx.addIssue({ code: "custom", path: [...path, index], message: `unknown source id ${ref}` });
  });
  value.preferences.forEach((item, index) => checkRefs(item.sourceIds, ["preferences", index, "sourceIds"]));
  value.brand.constraints.forEach((item, index) => checkRefs(item.sourceIds, ["brand", "constraints", index, "sourceIds"]));
});

export type IntakeT = z.infer<typeof Intake>;
export type IntakeSourceT = z.infer<typeof IntakeSource>;
export type ValidationIssue = { path: string; message: string };

export function validateIntake(data: unknown): { ok: true; intake: IntakeT } | { ok: false; issues: ValidationIssue[] } {
  const result = Intake.safeParse(data);
  if (result.success) return { ok: true, intake: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}
