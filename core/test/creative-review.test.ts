import { describe, expect, it } from "vitest";
import {
  CalibrationCaseLabel,
  CreativeReview,
  REVIEW_DOMAINS,
  scoreCreativeReview,
  type CreativeReviewT,
} from "../src/creative/review.js";

function fixture(): CreativeReviewT {
  return CreativeReview.parse({
    reviewVersion: "0.1.0",
    subject: { id: "calibration-control", digest: "a".repeat(64), evidenceRoot: "evidence" },
    method: { visualAssessment: "isolated", deterministicFindingsSeenBeforeVisual: false, critic: { model: "test-critic", runId: "run-001" } },
    firstWatch: { filmRead: "A restrained product argument builds through contrast.", buildsTo: "A clear closing claim.", intendedFeeling: "confidence", achievedFeeling: "confidence" },
    evidence: [{ id: "contact-sheet", kind: "contact-sheet", path: "evidence/contact-sheet.png", note: "Whole-film visual progression" }],
    assessments: REVIEW_DOMAINS.map((domain) => ({ domain, rating: "acceptable", confidence: "high", rationale: `${domain} remains coherent in the supplied evidence.`, evidenceRefs: ["contact-sheet"] })),
    verdict: "revise",
    summary: "The film is coherent but one motion pattern needs a directed revision.",
    findings: [{
      id: "uniform-motion", severity: "P2", domain: "motion", principleIds: ["CR-MOT-3"],
      evidenceRefs: ["contact-sheet"], observation: "Every scene enters with the same centered fade.",
      consequence: "The rhythm becomes predictable before the argument peaks.", fix: "Give the peak a contrasting directional reveal and protect one hold.",
      expectedEffect: "A legible build and stronger payoff.",
    }],
    priorities: ["uniform-motion"], uncertainties: [],
  });
}

describe("typed creative review (ADR-0029)", () => {
  it("binds multidisciplinary judgment to evidence and craft principles", () => {
    expect(CreativeReview.safeParse(fixture()).success).toBe(true);
  });

  it("rejects detached evidence and contradictory ship verdicts", () => {
    const detached = structuredClone(fixture());
    detached.findings[0].evidenceRefs = ["missing"];
    expect(CreativeReview.safeParse(detached).success).toBe(false);
    const falseShip = structuredClone(fixture());
    falseShip.verdict = "ship";
    falseShip.findings[0].severity = "P1";
    expect(CreativeReview.safeParse(falseShip).success).toBe(false);
  });

  it("rejects contradictory assessments, duplicate references, and unactionable revisions", () => {
    const reasonOnAssessed = structuredClone(fixture());
    reasonOnAssessed.assessments[0].notAssessedReason = "Evidence was unavailable.";
    expect(CreativeReview.safeParse(reasonOnAssessed).success).toBe(false);
    const duplicatePrinciple = structuredClone(fixture());
    duplicatePrinciple.findings[0].principleIds = ["CR-MOT-3", "CR-MOT-3"];
    expect(CreativeReview.safeParse(duplicatePrinciple).success).toBe(false);
    const noAction = structuredClone(fixture());
    noAction.findings = []; noAction.priorities = [];
    expect(CreativeReview.safeParse(noAction).success).toBe(false);
  });

  it("scores hidden principle labels and penalizes finding spam", () => {
    const label = CalibrationCaseLabel.parse({ expectedVerdicts: ["revise"], mustFind: [{ principleId: "CR-MOT-3", severityAtLeast: "P2" }], mustNotFind: [{ principleId: "CR-SLOP-1", severityAtLeast: "P1" }], maxFindings: 2 });
    expect(scoreCreativeReview(label, fixture()).pass).toBe(true);
    const spam = structuredClone(fixture());
    for (let i = 0; i < 2; i++) spam.findings.push({ ...spam.findings[0], id: `extra-${i}` });
    expect(scoreCreativeReview(label, CreativeReview.parse(spam))).toMatchObject({ pass: false, withinFindingBudget: false });
    const severityBound = CalibrationCaseLabel.parse({ expectedVerdicts: ["revise"], mustFind: [], mustNotFind: [], maxFindings: 3, maxSeverity: "P2" });
    const over = structuredClone(fixture()); over.findings[0].severity = "P1";
    expect(scoreCreativeReview(severityBound, CreativeReview.parse(over))).toMatchObject({ pass: false, withinSeverityBudget: false });
  });
});
