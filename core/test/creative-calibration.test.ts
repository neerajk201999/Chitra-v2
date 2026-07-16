import { describe, expect, it } from "vitest";
import { IndependentCalibrationStudy, scoreIndependentCalibrationStudy } from "../src/creative/calibration.js";
import { CreativeReview, REVIEW_DOMAINS, type CraftPrincipleId, type CreativeReviewT } from "../src/creative/review.js";

const digest = "c".repeat(64);

function review(verdict: "ship" | "revise" | "redirect", principle?: CraftPrincipleId, severity: "P1" | "P2" | "P3" = "P2"): CreativeReviewT {
  const domain = principle === "CR-SLOP-1" ? "slop" : "motion";
  return CreativeReview.parse({
    reviewVersion: "0.1.0",
    subject: { id: "motion-case", digest, evidenceRoot: "evidence" },
    method: { visualAssessment: "isolated", deterministicFindingsSeenBeforeVisual: false, critic: { model: "human-review", runId: `${verdict}-${principle ?? "clean"}` } },
    firstWatch: { filmRead: "A restrained product argument moves through one clear idea.", buildsTo: "A deliberate product reveal.", intendedFeeling: "confidence", achievedFeeling: "confidence" },
    evidence: [{ id: "motion-clip", kind: "motion-clip", path: "evidence/film.mp4", note: "Full motion and audio review source" }],
    assessments: REVIEW_DOMAINS.map((item) => ({ domain: item, rating: principle && item === domain ? "weak" : "acceptable", confidence: "high", rationale: `${item} was assessed against the complete motion evidence.`, evidenceRefs: ["motion-clip"] })),
    verdict,
    summary: principle ? "One identified craft problem requires a directed correction." : "The complete film is coherent and ready to ship.",
    findings: principle ? [{
      id: "craft-finding", severity, domain, principleIds: [principle], evidenceRefs: ["motion-clip"],
      observation: "The repeated treatment weakens the intended progression.", consequence: "The payoff becomes predictable before it arrives.",
      fix: "Introduce a motivated contrast and protect the final hold.", expectedEffect: "A clearer build and stronger close.",
    }] : [],
    priorities: principle ? ["craft-finding"] : [], uncertainties: [],
  });
}

function annotation(id: string, item: CreativeReviewT, publicRelease = true) {
  return {
    reviewer: { id, expertise: ["motion-design" as const] },
    independence: { caseAuthor: false as const, authorLabelsSeenBeforeReview: false as const, candidateReviewSeenBeforeReview: false as const, otherAnnotationsSeenBeforeReview: false as const, conflicts: [] },
    consent: { storeForCalibration: true as const, useForEvaluation: true as const, publicRelease },
    review: item,
  };
}

describe("independent creative calibration (ADR-0030)", () => {
  it("derives transparent panel consensus and separate candidate metrics", () => {
    const study = IndependentCalibrationStudy.parse({
      studyVersion: "0.1.0", studyId: "panel-study",
      protocol: { minimumReviewersPerCase: 3, consensusThreshold: 2 / 3 },
      cases: [{ id: "motion-case", subjectDigest: digest, register: "brand-film", evidenceProfile: { motionReviewed: true, audioReviewed: true },
        annotations: [annotation("reviewer-one", review("revise", "CR-MOT-3")), annotation("reviewer-two", review("revise", "CR-MOT-3")), annotation("reviewer-three", review("ship"), false)],
        candidates: [{ id: "critic-a", blindness: { authorLabelsSeenBeforeReview: false, annotationsSeenBeforeReview: false }, review: review("revise", "CR-MOT-3") }],
      }],
    });
    expect(scoreIndependentCalibrationStudy(study)).toMatchObject({
      allReviewersConsentToPublicRelease: false,
      coverage: { registers: { "brand-film": 1, "product-demo": 0, "social-short": 0 }, motionCases: 1, audioCases: 1 },
      panel: { verdictPairAgreement: 0.333333, principleSetJaccard: 0.333333, sharedPrincipleSeverityAgreement: 1, verdictConsensusCases: 1 },
      candidates: [{ id: "critic-a", verdictAgreement: 1, meanPrinciplePrecision: 1, meanPrincipleRecall: 1, severityAgreement: 1 }],
      cases: [{ consensus: { verdicts: ["revise"], disputedVerdict: false, principles: [{ principleId: "CR-MOT-3", severityAtLeast: "P2", votes: 2 }] } }],
    });
  });

  it("rejects non-independent, duplicate, and mismatched annotations", () => {
    const base = {
      studyVersion: "0.1.0", studyId: "invalid-study", protocol: { minimumReviewersPerCase: 3, consensusThreshold: 2 / 3 },
      cases: [{ id: "motion-case", subjectDigest: digest, register: "brand-film", evidenceProfile: { motionReviewed: true, audioReviewed: false }, annotations: [annotation("same-reviewer", review("ship")), annotation("same-reviewer", review("ship")), annotation("reviewer-three", review("ship"))], candidates: [] }],
    };
    expect(IndependentCalibrationStudy.safeParse(base).success).toBe(false);
    const exposed = structuredClone(base);
    exposed.cases[0].annotations[1].reviewer.id = "reviewer-two";
    Object.assign(exposed.cases[0].annotations[0].independence, { candidateReviewSeenBeforeReview: true });
    expect(IndependentCalibrationStudy.safeParse(exposed).success).toBe(false);
    const mismatched = structuredClone(base);
    mismatched.cases[0].annotations[1].reviewer.id = "reviewer-two";
    mismatched.cases[0].annotations[0].review.subject.digest = "d".repeat(64);
    expect(IndependentCalibrationStudy.safeParse(mismatched).success).toBe(false);
  });

  it("keeps three-way verdict disagreement explicit", () => {
    const study = IndependentCalibrationStudy.parse({
      studyVersion: "0.1.0", studyId: "disputed-study", protocol: { minimumReviewersPerCase: 3, consensusThreshold: 2 / 3 },
      cases: [{ id: "motion-case", subjectDigest: digest, register: "brand-film", evidenceProfile: { motionReviewed: true, audioReviewed: true }, annotations: [
        annotation("reviewer-one", review("ship")),
        annotation("reviewer-two", review("revise", "CR-MOT-3")),
        annotation("reviewer-three", review("redirect", "CR-SLOP-1", "P1")),
      ], candidates: [] }],
    });
    expect(scoreIndependentCalibrationStudy(study).cases[0].consensus).toMatchObject({ verdicts: [], disputedVerdict: true, principles: [] });
  });
});
