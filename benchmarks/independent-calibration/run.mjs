#!/usr/bin/env node
/** ADR-0030 contract benchmark: blind reviewer/candidate provenance, consensus,
 * disagreement, consent, and separate agreement metrics must be deterministic. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const check = process.argv.includes("--check");
const { IndependentCalibrationStudy, scoreIndependentCalibrationStudy } = await import(path.join(root, "core/dist/creative/calibration.js"));
const { CreativeReview, REVIEW_DOMAINS } = await import(path.join(root, "core/dist/creative/review.js"));

const digest = "e".repeat(64);
const makeReview = (caseId, verdict, principle, severity = "P2") => {
  const domain = principle === "CR-SLOP-1" ? "slop" : "motion";
  return CreativeReview.parse({
    reviewVersion: "0.1.0",
    subject: { id: caseId, digest, evidenceRoot: "evidence" },
    method: { visualAssessment: "isolated", deterministicFindingsSeenBeforeVisual: false, critic: { model: "calibration-benchmark", runId: `${caseId}-${verdict}-${principle ?? "clean"}` } },
    firstWatch: { filmRead: "A restrained product argument moves through one clear idea.", buildsTo: "A deliberate product reveal.", intendedFeeling: "confidence", achievedFeeling: "confidence" },
    evidence: [{ id: "motion-clip", kind: "motion-clip", path: "evidence/film.mp4", note: "Complete motion and audio review source" }],
    assessments: REVIEW_DOMAINS.map((item) => ({ domain: item, rating: principle && item === domain ? "weak" : "acceptable", confidence: "high", rationale: `${item} was assessed against the complete motion evidence.`, evidenceRefs: ["motion-clip"] })),
    verdict,
    summary: principle ? "One identified craft problem requires a directed correction." : "The complete film is coherent and ready to ship.",
    findings: principle ? [{ id: "craft-finding", severity, domain, principleIds: [principle], evidenceRefs: ["motion-clip"], observation: "The repeated treatment weakens the intended progression.", consequence: "The payoff becomes predictable before it arrives.", fix: "Introduce a motivated contrast and protect the final hold.", expectedEffect: "A clearer build and stronger close." }] : [],
    priorities: principle ? ["craft-finding"] : [], uncertainties: [],
  });
};
const annotation = (reviewerId, review, publicRelease = true) => ({
  reviewer: { id: reviewerId, expertise: ["motion-design"] },
  independence: { caseAuthor: false, authorLabelsSeenBeforeReview: false, candidateReviewSeenBeforeReview: false, otherAnnotationsSeenBeforeReview: false, conflicts: [] },
  consent: { storeForCalibration: true, useForEvaluation: true, publicRelease },
  review,
});
const candidate = (id, review) => ({ id, blindness: { authorLabelsSeenBeforeReview: false, annotationsSeenBeforeReview: false }, review });

const rawStudy = {
  studyVersion: "0.1.0",
  studyId: "independent-panel-control",
  protocol: { minimumReviewersPerCase: 3, consensusThreshold: 2 / 3 },
  cases: [
    {
      id: "motion-case", subjectDigest: digest, register: "brand-film", evidenceProfile: { motionReviewed: true, audioReviewed: true },
      annotations: [
        annotation("reviewer-one", makeReview("motion-case", "revise", "CR-MOT-3")),
        annotation("reviewer-two", makeReview("motion-case", "revise", "CR-MOT-3")),
        annotation("reviewer-three", makeReview("motion-case", "ship"), false),
      ],
      candidates: [candidate("critic-a", makeReview("motion-case", "revise", "CR-MOT-3"))],
    },
    {
      id: "disputed-case", subjectDigest: digest, register: "social-short", evidenceProfile: { motionReviewed: true, audioReviewed: false },
      annotations: [
        annotation("reviewer-one", makeReview("disputed-case", "ship")),
        annotation("reviewer-two", makeReview("disputed-case", "revise", "CR-MOT-3")),
        annotation("reviewer-three", makeReview("disputed-case", "redirect", "CR-SLOP-1", "P1")),
      ],
      candidates: [candidate("critic-a", makeReview("disputed-case", "ship"))],
    },
  ],
};

const study = IndependentCalibrationStudy.parse(rawStudy);
const first = scoreIndependentCalibrationStudy(study);
const second = scoreIndependentCalibrationStudy(study);
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("repeated calibration result changed bytes");
if (first.panel.verdictPairAgreement !== 0.166667 || first.panel.principleSetJaccard !== 0.166667 || first.panel.sharedPrincipleSeverityAgreement !== 1)
  throw new Error(`panel metrics drifted: ${JSON.stringify(first.panel)}`);
if (first.panel.verdictConsensusCases !== 1 || !first.cases[1].consensus.disputedVerdict)
  throw new Error("three-way disagreement was hidden");
if (first.allReviewersConsentToPublicRelease || first.coverage.motionCases !== 2 || first.coverage.audioCases !== 1)
  throw new Error("consent or evidence coverage was misreported");
if (first.candidates[0].verdictAgreement !== 1 || first.candidates[0].verdictScorableCases !== 1 || first.candidates[0].meanPrinciplePrecision !== 1 || first.candidates[0].meanPrincipleRecall !== 1)
  throw new Error(`candidate dimensions drifted: ${JSON.stringify(first.candidates[0])}`);

const exposed = structuredClone(rawStudy);
exposed.cases[0].candidates[0].blindness.annotationsSeenBeforeReview = true;
if (IndependentCalibrationStudy.safeParse(exposed).success) throw new Error("label-exposed candidate was accepted");
const duplicate = structuredClone(rawStudy);
duplicate.cases[0].annotations[1].reviewer.id = "reviewer-one";
if (IndependentCalibrationStudy.safeParse(duplicate).success) throw new Error("duplicate reviewer was accepted");

const cliFixture = mkdtempSync(path.join(tmpdir(), "chitra-calibration-"));
try {
  const studyFile = path.join(cliFixture, "study.json");
  writeFileSync(studyFile, `${JSON.stringify(rawStudy, null, 2)}\n`);
  const cli = spawnSync(process.execPath, [path.join(root, "core/dist/cli/index.js"), "review-calibrate", studyFile, "--json"], { encoding: "utf8" });
  if (cli.status !== 0 || cli.stdout !== `${JSON.stringify(first, null, 2)}\n`)
    throw new Error(`review-calibrate CLI failed or changed bytes: ${cli.stderr || cli.stdout}`);
} finally { rmSync(cliFixture, { recursive: true, force: true }); }

const report = `# Independent calibration contract benchmark — 2026-07-17\n\n- Three-reviewer consensus at a declared threshold: **passed**\n- Verdict, principle-set, and shared-severity metrics remain separate: **passed**\n- Three-way disagreement remains explicit: **passed**\n- Motion/audio/register coverage and private consent: **reported**\n- Candidate exposed to panel annotations: **rejected**\n- Duplicate reviewer: **rejected**\n- Repeated result and documented CLI output: **byte-identical**\n\nThis proves study mechanics, not critic reliability. The required ≥20 real motion/audio cases and independent human annotations remain uncollected.\n`;
if (!check) writeFileSync(path.join(here, "results.md"), report);
console.log("✔ independent calibration provenance, consensus, disagreement, consent, and separate metrics verified");
