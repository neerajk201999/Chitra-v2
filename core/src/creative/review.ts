import { z } from "zod";

export const CREATIVE_REVIEW_VERSION = "0.1.0";

export const CRAFT_PRINCIPLES = {
  "CR-BRIEF-1": "One audience, job, promise, and proof standard govern the film.",
  "CR-NARR-1": "The film advances one legible premise rather than listing features.",
  "CR-NARR-2": "Tension, change, and resolution form a causal progression.",
  "CR-NARR-3": "The emotional arc earns and protects its payoff.",
  "CR-DIR-1": "A governing idea and point of view decide what belongs.",
  "CR-DIR-2": "Every beat has an intentional attention target and emotional job.",
  "CR-DIR-3": "The direction is specific to this brand, product, audience, and moment.",
  "CR-COMP-1": "Hierarchy and eye trace make one focal priority immediately clear.",
  "CR-COMP-2": "Grid, balance, scale, and negative space feel composed rather than defaulted.",
  "CR-TYPE-1": "Typography carries a deliberate voice, hierarchy, and reading cadence.",
  "CR-COLOR-1": "Color, light, contrast, and material direct attention and model depth.",
  "CR-MOT-1": "Motion communicates meaning, state, causality, or emphasis.",
  "CR-MOT-2": "Timing and physics match property, distance, scale, and material.",
  "CR-MOT-3": "Choreography varies energy and includes deliberate rest.",
  "CR-MOT-4": "Movement preserves spatial continuity and a stable frame of reference.",
  "CR-EDIT-1": "Emotion and story outrank rhythm, eye trace, and spatial continuity when they conflict.",
  "CR-EDIT-2": "Every cut is motivated and hands attention to a composed next frame.",
  "CR-EDIT-3": "Shot scale, angle, duration, handles, and transition family create purposeful contrast.",
  "CR-SOUND-1": "Music, voice, ambience, and effects have a clear narrative hierarchy.",
  "CR-SOUND-2": "Sync, sonic perspective, and recurring motifs reinforce picture and story.",
  "CR-SOUND-3": "Dynamics, silence, intelligibility, and the final mix shape attention without fatigue.",
  "CR-BRAND-1": "Visual, verbal, motion, and sonic choices belong recognizably to the brand.",
  "CR-TRUTH-1": "Product behavior, data, claims, and demonstrations remain truthful and legible.",
  "CR-ACCESS-1": "Meaning survives reduced motion, limited hearing, and realistic viewing conditions.",
  "CR-HOL-1": "Narrative, image, motion, edit, and sound feel like one authored system.",
  "CR-HOL-2": "The film is distinct enough that changing only the logo would break it.",
  "CR-HOL-3": "The watched result creates the intended feeling, not merely correct frames.",
  "CR-SLOP-1": "Category defaults, fashionable evasions, and repeated AI tells are absent.",
} as const;

export type CraftPrincipleId = keyof typeof CRAFT_PRINCIPLES;

export const REVIEW_DOMAINS = [
  "brief", "narrative", "direction", "composition", "typography", "color-light",
  "motion", "edit", "sound", "brand", "product-truth", "accessibility", "holistic", "slop",
] as const;

const domain = z.enum(REVIEW_DOMAINS);
const severity = z.enum(["P1", "P2", "P3"]);
const evidenceRef = z.string().regex(/^[a-z][a-z0-9-]*$/, "evidence ids are kebab-case");
const principleId = z.enum(Object.keys(CRAFT_PRINCIPLES) as [CraftPrincipleId, ...CraftPrincipleId[]]);

const ReviewEvidence = z.object({
  id: evidenceRef,
  kind: z.enum(["artifact", "frame", "contact-sheet", "cut-strip", "motion-clip", "audio", "comparison"]),
  path: z.string().min(1),
  timecodeMs: z.number().int().min(0).optional(),
  note: z.string().min(8),
}).strict();

const ReviewAssessment = z.object({
  domain,
  rating: z.enum(["exceptional", "strong", "acceptable", "weak", "blocking", "not-assessed"]),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string().min(12),
  evidenceRefs: z.array(evidenceRef).max(8).default([]),
  notAssessedReason: z.string().min(8).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.rating === "not-assessed" && !value.notAssessedReason)
    ctx.addIssue({ code: "custom", path: ["notAssessedReason"], message: "not-assessed requires a concrete reason" });
  if (value.rating !== "not-assessed" && value.notAssessedReason)
    ctx.addIssue({ code: "custom", path: ["notAssessedReason"], message: "an assessed domain cannot include a not-assessed reason" });
  if (value.rating !== "not-assessed" && value.evidenceRefs.length === 0)
    ctx.addIssue({ code: "custom", path: ["evidenceRefs"], message: "an assessed domain must cite evidence" });
});

const ReviewFinding = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "finding ids are kebab-case"),
  severity,
  domain,
  principleIds: z.array(principleId).min(1).max(3).refine((ids) => new Set(ids).size === ids.length, "principle ids must be unique"),
  sceneId: z.string().optional(),
  irPath: z.string().optional(),
  timecodeMs: z.number().int().min(0).optional(),
  evidenceRefs: z.array(evidenceRef).min(1).max(8),
  observation: z.string().min(12),
  consequence: z.string().min(12),
  fix: z.string().min(12),
  expectedEffect: z.string().min(8),
}).strict();

export const CreativeReview = z.object({
  reviewVersion: z.literal(CREATIVE_REVIEW_VERSION),
  subject: z.object({
    id: z.string().min(1),
    digest: z.string().regex(/^[0-9a-f]{64}$/, "subject digest must be SHA-256"),
    evidenceRoot: z.string().min(1),
  }).strict(),
  method: z.object({
    visualAssessment: z.literal("isolated"),
    deterministicFindingsSeenBeforeVisual: z.literal(false),
    critic: z.object({ model: z.string().min(1), runId: z.string().min(1) }).strict(),
  }).strict(),
  firstWatch: z.object({
    filmRead: z.string().min(12),
    buildsTo: z.string().min(8),
    intendedFeeling: z.string().min(4),
    achievedFeeling: z.string().min(4),
  }).strict(),
  evidence: z.array(ReviewEvidence).min(1).max(80),
  assessments: z.array(ReviewAssessment).length(REVIEW_DOMAINS.length),
  verdict: z.enum(["ship", "revise", "redirect"]),
  summary: z.string().min(12),
  findings: z.array(ReviewFinding).max(12),
  priorities: z.array(z.string()).max(5),
  uncertainties: z.array(z.string().min(8)).max(8).default([]),
}).strict().superRefine((value, ctx) => {
  const unique = (values: string[], path: string, label: string) => {
    const seen = new Set<string>();
    values.forEach((entry, index) => {
      if (seen.has(entry)) ctx.addIssue({ code: "custom", path: [path, index], message: `duplicate ${label} ${entry}` });
      seen.add(entry);
    });
  };
  const evidenceIds = value.evidence.map((item) => item.id);
  const findingIds = value.findings.map((item) => item.id);
  unique(evidenceIds, "evidence", "evidence id");
  unique(findingIds, "findings", "finding id");
  unique(value.assessments.map((item) => item.domain), "assessments", "assessment domain");
  unique(value.priorities, "priorities", "priority");
  const evidence = new Set(evidenceIds);
  value.assessments.forEach((assessment, index) => assessment.evidenceRefs.forEach((ref) => {
    if (!evidence.has(ref)) ctx.addIssue({ code: "custom", path: ["assessments", index, "evidenceRefs"], message: `unknown evidence ref ${ref}` });
  }));
  value.findings.forEach((finding, index) => finding.evidenceRefs.forEach((ref) => {
    if (!evidence.has(ref)) ctx.addIssue({ code: "custom", path: ["findings", index, "evidenceRefs"], message: `unknown evidence ref ${ref}` });
  }));
  const findings = new Set(findingIds);
  value.priorities.forEach((id, index) => {
    if (!findings.has(id)) ctx.addIssue({ code: "custom", path: ["priorities", index], message: `priority cites unknown finding ${id}` });
  });
  if (value.verdict === "ship" && (value.findings.some((item) => item.severity === "P1") || value.assessments.some((item) => item.rating === "blocking")))
    ctx.addIssue({ code: "custom", path: ["verdict"], message: "ship cannot coexist with P1 findings or blocking assessments" });
  if (value.verdict !== "ship" && value.findings.length === 0)
    ctx.addIssue({ code: "custom", path: ["findings"], message: `${value.verdict} requires at least one actionable finding` });
  if (value.verdict !== "ship" && value.priorities.length === 0)
    ctx.addIssue({ code: "custom", path: ["priorities"], message: `${value.verdict} requires at least one prioritized finding` });
  if (value.verdict === "redirect" && !value.findings.some((item) => item.severity === "P1" && ["brief", "narrative", "direction", "brand", "holistic", "slop"].includes(item.domain)))
    ctx.addIssue({ code: "custom", path: ["verdict"], message: "redirect requires a P1 strategic or holistic finding" });
});

export type CreativeReviewT = z.infer<typeof CreativeReview>;

export function validateCreativeReview(data: unknown) {
  const result = CreativeReview.safeParse(data);
  if (result.success) return { ok: true as const, review: result.data };
  return { ok: false as const, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

export const CalibrationCaseLabel = z.object({
  expectedVerdicts: z.array(z.enum(["ship", "revise", "redirect"])).min(1),
  mustFind: z.array(z.object({ principleId, severityAtLeast: severity }).strict()).default([]),
  mustNotFind: z.array(z.object({ principleId, severityAtLeast: severity }).strict()).default([]),
  maxFindings: z.number().int().min(0).max(12),
  maxSeverity: severity.optional(),
}).strict();
export type CalibrationCaseLabelT = z.infer<typeof CalibrationCaseLabel>;

const severityRank = { P3: 1, P2: 2, P1: 3 } as const;

export function scoreCreativeReview(label: CalibrationCaseLabelT, review: CreativeReviewT) {
  const matches = (item: { principleId: CraftPrincipleId; severityAtLeast: "P1" | "P2" | "P3" }) =>
    review.findings.some((finding) => finding.principleIds.includes(item.principleId) && severityRank[finding.severity] >= severityRank[item.severityAtLeast]);
  const hits = label.mustFind.filter(matches).map((item) => item.principleId);
  const misses = label.mustFind.filter((item) => !matches(item)).map((item) => item.principleId);
  const forbidden = label.mustNotFind.filter(matches).map((item) => item.principleId);
  const verdictMatch = label.expectedVerdicts.includes(review.verdict);
  const withinFindingBudget = review.findings.length <= label.maxFindings;
  const withinSeverityBudget = !label.maxSeverity || review.findings.every((finding) => severityRank[finding.severity] <= severityRank[label.maxSeverity!]);
  return {
    pass: verdictMatch && misses.length === 0 && forbidden.length === 0 && withinFindingBudget && withinSeverityBudget,
    verdictMatch,
    hits,
    misses,
    forbidden,
    findingCount: review.findings.length,
    maxFindings: label.maxFindings,
    withinFindingBudget,
    maxSeverity: label.maxSeverity ?? null,
    withinSeverityBudget,
  };
}
