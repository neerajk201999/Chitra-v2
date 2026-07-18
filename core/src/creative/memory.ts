import { z } from "zod";
import { CRAFT_PRINCIPLES, type CraftPrincipleId } from "./review.js";
import { REGISTERS } from "../motion/tokens.js";

export const REVISION_MEMORY_VERSION = "0.1.0";
export const REVISION_CONTEXT_VERSION = "0.1.0";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case");
const digest = z.string().regex(/^[0-9a-f]{64}$/, "digest must be SHA-256");
const reason = z.string().min(8);
const principleId = z.enum(Object.keys(CRAFT_PRINCIPLES) as [CraftPrincipleId, ...CraftPrincipleId[]]);
const register = z.enum(Object.keys(REGISTERS) as [keyof typeof REGISTERS, ...Array<keyof typeof REGISTERS>]);

const MemoryScope = z.object({
  kind: z.enum(["project", "brand", "universal"]),
  projectId: id.optional(),
  brandId: id.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "project" && !value.projectId)
    ctx.addIssue({ code: "custom", path: ["projectId"], message: "project scope requires projectId" });
  if (value.kind === "brand" && !value.brandId)
    ctx.addIssue({ code: "custom", path: ["brandId"], message: "brand scope requires brandId" });
  if (value.kind !== "project" && value.projectId)
    ctx.addIssue({ code: "custom", path: ["projectId"], message: "projectId is only valid for project scope" });
  if (value.kind !== "brand" && value.brandId)
    ctx.addIssue({ code: "custom", path: ["brandId"], message: "brandId is only valid for brand scope" });
});

const OutcomeEvidence = z.object({
  kind: z.enum(["render", "comparison", "measurement", "panel", "human-review"]),
  digest,
  path: z.string().min(1).optional(),
  note: reason,
}).strict();

const RevisionEntry = z.object({
  id,
  scope: MemoryScope,
  subject: z.object({ id, digest, register }).strict(),
  source: z.object({
    reviewDigest: digest,
    findingId: id,
    principleIds: z.array(principleId).min(1).max(3)
      .refine((items) => new Set(items).size === items.length, "principle ids must be unique"),
  }).strict(),
  decision: z.object({
    status: z.enum(["accepted", "rejected", "reverted"]),
    decidedBy: id,
    reason,
  }).strict(),
  change: z.object({
    artifact: z.enum(["direction", "storyboard", "score", "asset", "audio", "delivery"]),
    patchDigest: digest,
    summary: reason,
  }).strict(),
  outcome: z.object({
    assessment: z.enum(["improved", "mixed", "neutral", "worse", "not-measured"]),
    evidence: z.array(OutcomeEvidence).max(12).default([]),
    note: reason,
  }).strict(),
  guidance: z.object({
    do: reason,
    avoid: reason,
    tags: z.array(id).max(12).default([])
      .refine((items) => new Set(items).size === items.length, "guidance tags must be unique"),
  }).strict(),
  promotion: z.object({
    studyDigest: digest,
    caseCount: z.number().int().min(20),
    minimumReviewersPerCase: z.number().int().min(3),
  }).strict().optional(),
  createdAt: z.string().datetime({ offset: true }),
}).strict().superRefine((value, ctx) => {
  if (value.decision.status === "accepted" && value.outcome.assessment === "not-measured")
    ctx.addIssue({ code: "custom", path: ["outcome", "assessment"], message: "accepted revisions require a measured outcome" });
  if (value.decision.status === "accepted" && value.outcome.evidence.length === 0)
    ctx.addIssue({ code: "custom", path: ["outcome", "evidence"], message: "accepted revisions require outcome evidence" });
  if (value.outcome.assessment !== "not-measured" && value.outcome.evidence.length === 0)
    ctx.addIssue({ code: "custom", path: ["outcome", "evidence"], message: "measured outcomes require evidence" });
  if (value.scope.kind === "universal" && value.decision.status !== "accepted")
    ctx.addIssue({ code: "custom", path: ["decision", "status"], message: "universal memory must be an accepted revision" });
  if (value.scope.kind === "universal" && !value.promotion)
    ctx.addIssue({ code: "custom", path: ["promotion"], message: "universal memory requires independent calibration promotion" });
  if (value.scope.kind !== "universal" && value.promotion)
    ctx.addIssue({ code: "custom", path: ["promotion"], message: "promotion is only valid for universal memory" });
});

export const RevisionMemory = z.object({
  memoryVersion: z.literal(REVISION_MEMORY_VERSION),
  entries: z.array(RevisionEntry).min(1).max(5000),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.entries.forEach((entry, index) => {
    if (seen.has(entry.id)) ctx.addIssue({ code: "custom", path: ["entries", index, "id"], message: `duplicate revision ${entry.id}` });
    seen.add(entry.id);
  });
});

export type RevisionMemoryT = z.infer<typeof RevisionMemory>;
export type RevisionEntryT = z.infer<typeof RevisionEntry>;

export interface RevisionContextQuery {
  projectId?: string;
  brandId?: string;
  register?: keyof typeof REGISTERS;
  principleIds?: CraftPrincipleId[];
  maxChars?: number;
}

const RevisionContextQuerySchema = z.object({
  projectId: id.optional(),
  brandId: id.optional(),
  register: register.optional(),
  principleIds: z.array(principleId).max(28).optional()
    .refine((items) => !items || new Set(items).size === items.length, "principle ids must be unique"),
  maxChars: z.number().int().min(512).max(50000).optional(),
}).strict();

export function validateRevisionMemory(data: unknown) {
  const result = RevisionMemory.safeParse(data);
  if (result.success) return { ok: true as const, memory: result.data };
  return { ok: false as const, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

export function validateRevisionContextQuery(data: unknown) {
  const result = RevisionContextQuerySchema.safeParse(data);
  if (result.success) return { ok: true as const, query: result.data };
  return { ok: false as const, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

function scopeMatches(entry: RevisionEntryT, query: RevisionContextQuery) {
  if (entry.scope.kind === "project") return !!query.projectId && entry.scope.projectId === query.projectId;
  if (entry.scope.kind === "brand") return !!query.brandId && entry.scope.brandId === query.brandId;
  return true;
}

function directiveFor(entry: RevisionEntryT) {
  const effect = entry.decision.status === "rejected" || entry.outcome.assessment === "worse"
    ? "avoid"
    : entry.outcome.assessment === "mixed" || entry.outcome.assessment === "neutral"
      ? "consider"
      : "repeat";
  return {
    id: entry.id,
    effect,
    scope: entry.scope,
    principleIds: entry.source.principleIds,
    instruction: effect === "avoid" ? entry.guidance.avoid : entry.guidance.do,
    caution: effect === "consider" ? entry.guidance.avoid : undefined,
    evidenceCount: entry.outcome.evidence.length,
    outcome: entry.outcome.assessment,
  };
}

export function compileRevisionContext(memory: RevisionMemoryT, query: RevisionContextQuery = {}) {
  const maxChars = Math.max(512, Math.min(query.maxChars ?? 6000, 50000));
  const wanted = new Set(query.principleIds ?? []);
  const eligible = memory.entries.filter((entry) =>
    entry.decision.status !== "reverted" && scopeMatches(entry, query) &&
    (!query.register || entry.subject.register === query.register));
  const ranked = eligible.map((entry) => ({
    entry,
    score: entry.source.principleIds.filter((item) => wanted.has(item)).length * 10 +
      (entry.scope.kind === "project" ? 3 : entry.scope.kind === "brand" ? 2 : 1),
  })).sort((a, b) => b.score - a.score || b.entry.createdAt.localeCompare(a.entry.createdAt) || a.entry.id.localeCompare(b.entry.id));

  const normalizedQuery = { ...query, maxChars };
  const makeContext = (directives: ReturnType<typeof directiveFor>[]) => ({
    contextVersion: REVISION_CONTEXT_VERSION,
    query: normalizedQuery,
    directives,
    selected: directives.length,
    eligible: eligible.length,
    omittedByBudget: eligible.length - directives.length,
  });
  const directives: ReturnType<typeof directiveFor>[] = [];
  for (const { entry } of ranked) {
    const candidate = [...directives, directiveFor(entry)];
    if (JSON.stringify(makeContext(candidate)).length > maxChars) continue;
    directives.push(candidate.at(-1)!);
  }
  return makeContext(directives);
}
