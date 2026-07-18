import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BlindDirectionSelection,
  DirectorialSearchDraft,
  validateBlindDirectionSelection,
} from "../src/creative/search.js";

const sha = (char: string) => char.repeat(64);
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function candidate(id: string, role: "hero" | "opening" = "hero") {
  return {
    id,
    directionPath: `directions/${id}.json`,
    probeScorePath: `probes/${id}.json`,
    hypothesis: {
      narrativeMechanism: `A distinct narrative mechanism for ${id}.`,
      heroComposition: `A distinct hero composition for ${id}.`,
      motionPremise: `A distinct motion premise for ${id}.`,
      tradeoff: `The deliberate tradeoff carried by ${id}.`,
      failureMode: `The concrete way candidate ${id} could fail.`,
    },
    probes: [{ id: `${id}-probe`, role, sceneId: `${id}-scene`, directionBeatId: `${id}-beat`, offsetMs: 500, question: "Does this candidate create one unmistakable hero image?" }],
  };
}

function draft() {
  return {
    searchVersion: "0.1.0", id: "launch-search", intakeProjectId: "launch", register: "brand-film",
    decision: { question: "Which direction makes the product change instantly felt?", successDefinition: "One image communicates the premise before explanatory copy.", viewerMoment: "The viewer feels the product collapse complexity into clarity." },
    candidates: [candidate("alpha"), candidate("beta"), candidate("gamma")],
    comparisons: [
      { leftCandidateId: "alpha", rightCandidateId: "beta", ideaDifference: "Alpha externalizes change while beta reveals an internal system.", storyDifference: "Alpha is transformation-led while beta is discovery-led.", imageDifference: "Alpha uses one rupture while beta uses a controlled field.", whyBothSurvive: "Both can express the brief without becoming cosmetic variants." },
      { leftCandidateId: "alpha", rightCandidateId: "gamma", ideaDifference: "Alpha dramatizes removal while gamma dramatizes accumulation.", storyDifference: "Alpha resolves tension early while gamma delays the reveal.", imageDifference: "Alpha is asymmetric while gamma is axial and monumental.", whyBothSurvive: "Each offers a materially different emotional route to the promise." },
      { leftCandidateId: "beta", rightCandidateId: "gamma", ideaDifference: "Beta invites inspection while gamma creates a declarative event.", storyDifference: "Beta builds through evidence while gamma builds through anticipation.", imageDifference: "Beta is dense and close while gamma is sparse and distant.", whyBothSurvive: "Both remain specific enough to deserve visual proof." },
    ],
  };
}

function manifest() {
  const artifact = (id: string) => ({ id, path: `${id}.png`, sha256: sha("a"), bytes: 100 });
  const body = {
    searchVersion: "0.1.0", searchDigest: sha("b"),
    blindPacket: artifact("blind-packet"), contactSheet: artifact("blind-contact-sheet"),
    candidates: ["candidate-11111111", "candidate-22222222"].map((blindId, index) => ({
      candidateId: index ? "beta" : "alpha", blindId, directionId: index ? "beta-direction" : "alpha-direction",
      directionPath: `directions/${index ? "beta" : "alpha"}.json`, directionDigest: sha(index ? "c" : "d"),
      probeScorePath: `probes/${index ? "beta" : "alpha"}.json`, scoreDigest: sha(index ? "e" : "f"),
      probes: [{ ...artifact(`${blindId}-hero`), role: "hero", question: "Does this hero communicate one governing idea?", sceneId: `${index ? "beta" : "alpha"}-scene`, directionBeatId: `${index ? "beta" : "alpha"}-beat`, offsetMs: 500 }],
      findings: [],
    })),
    pairwise: [{ leftBlindId: "candidate-11111111", rightBlindId: "candidate-22222222", role: "hero", rgbMae: 0.25 }],
    nearDuplicatePairs: [],
  };
  return { ...body, manifestDigest: digest(body) };
}

function selection(manifestDigest: string) {
  const assessment = (blindId: string, score: number) => ({
    blindId, firstRead: `The first read of ${blindId} is immediate and specific.`, intendedFeeling: "clarity", achievedFeeling: "clarity",
    strongestQuality: `The strongest quality in ${blindId} is its single focal decision.`, concern: `The main concern in ${blindId} is whether the idea sustains motion.`,
    scores: { governingIdeaLegibility: score, emotionalCharge: score, visualHierarchy: score, brandSpecificity: score, narrativePotential: score, motionPotential: score },
    confidence: "high", evidenceIds: [`${blindId}-hero`],
  });
  return {
    selectionVersion: "0.1.0", probeManifestDigest: manifestDigest,
    reviewer: { id: "reviewer-one", kind: "human", expertise: ["creative-direction"], runId: "blind-run-one" },
    blindness: { candidateIdentitySeenBeforeDecision: false, directionFilesSeenBeforeDecision: false, privateMappingSeenBeforeDecision: false },
    candidates: [assessment("candidate-11111111", 5), assessment("candidate-22222222", 3)],
    ranking: ["candidate-11111111", "candidate-22222222"], winner: "candidate-11111111",
    rationale: "Candidate one creates the clearest and most ownable hero premise.", decisiveEvidenceIds: ["candidate-11111111-hero"],
    rejected: [{ blindId: "candidate-22222222", reason: "Its image is polished but the governing idea reads less distinctly." }], uncertainties: [],
  };
}

describe("still-first directorial search (ADR-0036)", () => {
  it("requires exhaustive pairwise distinctions and comparable probe roles", () => {
    expect(DirectorialSearchDraft.parse(draft()).candidates).toHaveLength(3);
    const missing = structuredClone(draft()); missing.comparisons.pop();
    expect(DirectorialSearchDraft.safeParse(missing).success).toBe(false);
    const mismatched = structuredClone(draft()); mismatched.candidates[2] = candidate("gamma", "opening");
    expect(DirectorialSearchDraft.safeParse(mismatched).success).toBe(false);
  });

  it("resolves a complete blind winner and rejects ranking or duplicate-search drift", () => {
    const evidence = manifest(), decision = BlindDirectionSelection.parse(selection(evidence.manifestDigest));
    const result = validateBlindDirectionSelection(evidence, decision);
    expect(result.selected).toEqual(expect.objectContaining({ candidateId: "alpha", directionId: "alpha-direction" }));
    const rankingDrift = structuredClone(decision); rankingDrift.ranking.reverse();
    expect(() => validateBlindDirectionSelection(evidence, rankingDrift)).toThrow(/rank first/);
    const duplicate = structuredClone(evidence); duplicate.nearDuplicatePairs = [{ leftBlindId: "candidate-11111111", rightBlindId: "candidate-22222222", roles: ["hero"], reason: "All comparable probe roles are near-identical." }];
    const { manifestDigest: _old, ...duplicateBody } = duplicate; duplicate.manifestDigest = digest(duplicateBody);
    const duplicateDecision = { ...decision, probeManifestDigest: duplicate.manifestDigest };
    expect(() => validateBlindDirectionSelection(duplicate, duplicateDecision)).toThrow(/near-duplicate/);
  });

  it("rejects incomplete, duplicate, or foreign private-manifest diagnostics", () => {
    const missing = structuredClone(manifest()); missing.pairwise = [];
    const { manifestDigest: _missingDigest, ...missingBody } = missing; missing.manifestDigest = digest(missingBody);
    expect(() => validateBlindDirectionSelection(missing, selection(missing.manifestDigest))).toThrow(/pairwise diagnostics/);

    const foreign = structuredClone(manifest()); foreign.pairwise[0].rightBlindId = "candidate-33333333";
    const { manifestDigest: _foreignDigest, ...foreignBody } = foreign; foreign.manifestDigest = digest(foreignBody);
    expect(() => validateBlindDirectionSelection(foreign, selection(foreign.manifestDigest))).toThrow(/known, different blind candidates/);

    const duplicateEvidence = structuredClone(manifest());
    duplicateEvidence.candidates[1].probes[0].id = duplicateEvidence.candidates[0].probes[0].id;
    const { manifestDigest: _duplicateDigest, ...duplicateBody } = duplicateEvidence; duplicateEvidence.manifestDigest = digest(duplicateBody);
    expect(() => validateBlindDirectionSelection(duplicateEvidence, selection(duplicateEvidence.manifestDigest))).toThrow(/duplicate blind evidence ID/);
  });
});
