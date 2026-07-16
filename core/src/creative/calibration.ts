import { z } from "zod";
import {
  CRAFT_PRINCIPLES,
  CreativeReview,
  type CraftPrincipleId,
  type CreativeReviewT,
} from "./review.js";
import { REGISTERS } from "../motion/tokens.js";

export const INDEPENDENT_CALIBRATION_VERSION = "0.1.0";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case");
const digest = z.string().regex(/^[0-9a-f]{64}$/, "digest must be SHA-256");
const expertise = z.enum([
  "creative-direction", "narrative", "visual-design", "motion-design",
  "editing", "sound-design", "product-design", "accessibility", "generalist",
]);
const register = z.enum(Object.keys(REGISTERS) as [keyof typeof REGISTERS, ...Array<keyof typeof REGISTERS>]);

const IndependentAnnotation = z.object({
  reviewer: z.object({
    id,
    expertise: z.array(expertise).min(1).max(4)
      .refine((items) => new Set(items).size === items.length, "expertise must be unique"),
  }).strict(),
  independence: z.object({
    caseAuthor: z.literal(false),
    authorLabelsSeenBeforeReview: z.literal(false),
    candidateReviewSeenBeforeReview: z.literal(false),
    otherAnnotationsSeenBeforeReview: z.literal(false),
    conflicts: z.array(z.string().min(8)).max(5).default([]),
  }).strict(),
  consent: z.object({
    storeForCalibration: z.literal(true),
    useForEvaluation: z.literal(true),
    publicRelease: z.boolean(),
  }).strict(),
  review: CreativeReview,
}).strict();

const CalibrationStudyCase = z.object({
  id,
  subjectDigest: digest,
  register,
  evidenceProfile: z.object({ motionReviewed: z.boolean(), audioReviewed: z.boolean() }).strict(),
  annotations: z.array(IndependentAnnotation).min(3).max(20),
  candidates: z.array(z.object({
    id,
    blindness: z.object({ authorLabelsSeenBeforeReview: z.literal(false), annotationsSeenBeforeReview: z.literal(false) }).strict(),
    review: CreativeReview,
  }).strict()).max(20).default([]),
}).strict().superRefine((value, ctx) => {
  const unique = (items: string[], path: "annotations" | "candidates", label: string) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item)) ctx.addIssue({ code: "custom", path: [path, index], message: `duplicate ${label} ${item}` });
      seen.add(item);
    });
  };
  unique(value.annotations.map((item) => item.reviewer.id), "annotations", "reviewer");
  unique(value.candidates.map((item) => item.id), "candidates", "candidate");
  [...value.annotations.map((item) => item.review), ...value.candidates.map((item) => item.review)]
    .forEach((review, index) => {
      const collection = index < value.annotations.length ? "annotations" : "candidates";
      const itemIndex = index < value.annotations.length ? index : index - value.annotations.length;
      if (review.subject.id !== value.id)
        ctx.addIssue({ code: "custom", path: [collection, itemIndex, "review", "subject", "id"], message: `subject id must match case ${value.id}` });
      if (review.subject.digest !== value.subjectDigest)
        ctx.addIssue({ code: "custom", path: [collection, itemIndex, "review", "subject", "digest"], message: "subject digest must match the case digest" });
    });
});

export const IndependentCalibrationStudy = z.object({
  studyVersion: z.literal(INDEPENDENT_CALIBRATION_VERSION),
  studyId: id,
  protocol: z.object({
    minimumReviewersPerCase: z.number().int().min(3).max(20).default(3),
    consensusThreshold: z.number().gt(0.5).max(1).default(2 / 3),
  }).strict(),
  cases: z.array(CalibrationStudyCase).min(1).max(200),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.cases.forEach((item, index) => {
    if (seen.has(item.id)) ctx.addIssue({ code: "custom", path: ["cases", index, "id"], message: `duplicate case ${item.id}` });
    seen.add(item.id);
    if (item.annotations.length < value.protocol.minimumReviewersPerCase)
      ctx.addIssue({ code: "custom", path: ["cases", index, "annotations"], message: `requires at least ${value.protocol.minimumReviewersPerCase} reviewers` });
  });
});

export type IndependentCalibrationStudyT = z.infer<typeof IndependentCalibrationStudy>;

const severityRank = { P3: 1, P2: 2, P1: 3 } as const;
const severityByRank = [undefined, "P3", "P2", "P1"] as const;
const principleOrder = Object.keys(CRAFT_PRINCIPLES) as CraftPrincipleId[];

function principles(review: CreativeReviewT) {
  const result = new Map<CraftPrincipleId, number>();
  for (const finding of review.findings)
    for (const principleId of finding.principleIds)
      result.set(principleId, Math.max(result.get(principleId) ?? 0, severityRank[finding.severity]));
  return result;
}

function rounded(value: number) { return Number(value.toFixed(6)); }
function ratio(numerator: number, denominator: number) { return denominator ? rounded(numerator / denominator) : null; }

export function validateIndependentCalibrationStudy(data: unknown) {
  const result = IndependentCalibrationStudy.safeParse(data);
  if (result.success) return { ok: true as const, study: result.data };
  return { ok: false as const, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

export function scoreIndependentCalibrationStudy(study: IndependentCalibrationStudyT) {
  let verdictPairMatches = 0, verdictPairs = 0, jaccardTotal = 0;
  let sharedSeverityMatches = 0, sharedSeverityComparisons = 0;
  const candidateTotals = new Map<string, {
    cases: number; verdictMatches: number; verdictCases: number;
    precisionTotal: number; recallTotal: number;
    severityMatches: number; severityComparisons: number;
  }>();

  const cases = study.cases.map((item) => {
    const requiredVotes = Math.ceil(item.annotations.length * study.protocol.consensusThreshold);
    const verdictVotes = new Map<string, number>();
    const panelPrinciples = item.annotations.map((annotation) => {
      verdictVotes.set(annotation.review.verdict, (verdictVotes.get(annotation.review.verdict) ?? 0) + 1);
      return principles(annotation.review);
    });

    let caseVerdictMatches = 0, caseJaccard = 0, casePairs = 0;
    let caseSeverityMatches = 0, caseSeverityComparisons = 0;
    for (let left = 0; left < item.annotations.length; left++) {
      for (let right = left + 1; right < item.annotations.length; right++) {
        const a = panelPrinciples[left], b = panelPrinciples[right];
        verdictPairs++;
        if (item.annotations[left].review.verdict === item.annotations[right].review.verdict) {
          verdictPairMatches++; caseVerdictMatches++;
        }
        const union = new Set([...a.keys(), ...b.keys()]);
        const intersection = [...a.keys()].filter((principleId) => b.has(principleId));
        const jaccard = union.size ? intersection.length / union.size : 1;
        jaccardTotal += jaccard; caseJaccard += jaccard; casePairs++;
        for (const principleId of intersection) {
          sharedSeverityComparisons++; caseSeverityComparisons++;
          if (a.get(principleId) === b.get(principleId)) { sharedSeverityMatches++; caseSeverityMatches++; }
        }
      }
    }

    const consensusVerdicts = (["ship", "revise", "redirect"] as const)
      .filter((verdict) => (verdictVotes.get(verdict) ?? 0) >= requiredVotes);
    const consensusPrinciples = principleOrder.flatMap((principleId) => {
      const ranks = panelPrinciples.map((found) => found.get(principleId) ?? 0);
      let rank = 0;
      for (let candidate = 3; candidate >= 1; candidate--)
        if (ranks.filter((value) => value >= candidate).length >= requiredVotes) { rank = candidate; break; }
      return rank ? [{ principleId, severityAtLeast: severityByRank[rank]!, votes: ranks.filter((value) => value >= rank).length }] : [];
    });
    const principleVotes = principleOrder.flatMap((principleId) => {
      const ranks = panelPrinciples.map((found) => found.get(principleId) ?? 0);
      const votes = ranks.filter(Boolean).length;
      return votes ? [{
        principleId,
        votes,
        severities: {
          P1: ranks.filter((rank) => rank === 3).length,
          P2: ranks.filter((rank) => rank === 2).length,
          P3: ranks.filter((rank) => rank === 1).length,
        },
      }] : [];
    });
    const consensusMap = new Map(consensusPrinciples.map((entry) => [entry.principleId, severityRank[entry.severityAtLeast]]));

    const candidates = item.candidates.map((candidate) => {
      const found = principles(candidate.review);
      const intersection = [...found.keys()].filter((principleId) => consensusMap.has(principleId));
      const precision = found.size ? intersection.length / found.size : consensusMap.size ? 0 : 1;
      const recall = consensusMap.size ? intersection.length / consensusMap.size : 1;
      let severityMatches = 0;
      for (const principleId of intersection)
        if (found.get(principleId) === consensusMap.get(principleId)) severityMatches++;
      const verdictScorable = consensusVerdicts.length > 0;
      const verdictMatch = verdictScorable ? consensusVerdicts.includes(candidate.review.verdict) : null;
      const total = candidateTotals.get(candidate.id) ?? {
        cases: 0, verdictMatches: 0, verdictCases: 0, precisionTotal: 0,
        recallTotal: 0, severityMatches: 0, severityComparisons: 0,
      };
      total.cases++;
      if (verdictScorable) { total.verdictCases++; if (verdictMatch) total.verdictMatches++; }
      total.precisionTotal += precision; total.recallTotal += recall;
      total.severityMatches += severityMatches; total.severityComparisons += intersection.length;
      candidateTotals.set(candidate.id, total);
      return {
        id: candidate.id,
        verdictMatch,
        principlePrecision: rounded(precision),
        principleRecall: rounded(recall),
        severityAgreement: ratio(severityMatches, intersection.length),
      };
    });

    return {
      id: item.id,
      register: item.register,
      evidenceProfile: item.evidenceProfile,
      reviewers: item.annotations.length,
      requiredVotes,
      allReviewersConsentToPublicRelease: item.annotations.every((annotation) => annotation.consent.publicRelease),
      declaredConflicts: item.annotations.flatMap((annotation) => annotation.independence.conflicts.map((conflict) => ({ reviewerId: annotation.reviewer.id, conflict }))),
      panel: {
        verdictPairAgreement: ratio(caseVerdictMatches, casePairs),
        principleSetJaccard: ratio(caseJaccard, casePairs),
        sharedPrincipleSeverityAgreement: ratio(caseSeverityMatches, caseSeverityComparisons),
      },
      consensus: {
        verdictVotes: Object.fromEntries((["ship", "revise", "redirect"] as const).map((verdict) => [verdict, verdictVotes.get(verdict) ?? 0])),
        verdicts: consensusVerdicts,
        disputedVerdict: consensusVerdicts.length === 0,
        principleVotes,
        principles: consensusPrinciples,
      },
      candidates,
    };
  });

  return {
    studyVersion: study.studyVersion,
    studyId: study.studyId,
    caseCount: study.cases.length,
    allReviewersConsentToPublicRelease: study.cases.every((item) => item.annotations.every((annotation) => annotation.consent.publicRelease)),
    declaredConflictAnnotations: study.cases.reduce((total, item) => total + item.annotations.filter((annotation) => annotation.independence.conflicts.length > 0).length, 0),
    coverage: {
      registers: Object.fromEntries(Object.keys(REGISTERS).map((register) => [register, study.cases.filter((item) => item.register === register).length])),
      motionCases: study.cases.filter((item) => item.evidenceProfile.motionReviewed).length,
      audioCases: study.cases.filter((item) => item.evidenceProfile.audioReviewed).length,
    },
    panel: {
      verdictPairAgreement: ratio(verdictPairMatches, verdictPairs),
      principleSetJaccard: ratio(jaccardTotal, verdictPairs),
      sharedPrincipleSeverityAgreement: ratio(sharedSeverityMatches, sharedSeverityComparisons),
      verdictConsensusCases: cases.filter((item) => !item.consensus.disputedVerdict).length,
    },
    candidates: [...candidateTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, total]) => ({
      id,
      cases: total.cases,
      verdictAgreement: ratio(total.verdictMatches, total.verdictCases),
      verdictScorableCases: total.verdictCases,
      meanPrinciplePrecision: rounded(total.precisionTotal / total.cases),
      meanPrincipleRecall: rounded(total.recallTotal / total.cases),
      severityAgreement: ratio(total.severityMatches, total.severityComparisons),
    })),
    cases,
  };
}
