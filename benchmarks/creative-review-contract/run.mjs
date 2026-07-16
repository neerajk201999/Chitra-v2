#!/usr/bin/env node
/** ADR-0029 contract benchmark: evidence linkage, hidden principle labels,
 * verdict consistency, and anti-spam budgets must be deterministic. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const check = process.argv.includes("--check");
const { CalibrationCaseLabel, CreativeReview, REVIEW_DOMAINS, scoreCreativeReview } = await import(path.join(root, "core/dist/creative/review.js"));

const makeReview = () => CreativeReview.parse({
  reviewVersion: "0.1.0",
  subject: { id: "uniform-monotony", digest: "b".repeat(64), evidenceRoot: "evidence" },
  method: { visualAssessment: "isolated", deterministicFindingsSeenBeforeVisual: false, critic: { model: "contract-benchmark", runId: "run-001" } },
  firstWatch: { filmRead: "A product argument repeats one visual rhythm across every beat.", buildsTo: "A closing claim without enough contrast.", intendedFeeling: "confidence", achievedFeeling: "predictability" },
  evidence: [
    { id: "contact-sheet", kind: "contact-sheet", path: "evidence/contact-sheet.png", note: "Whole-film composition and cadence" },
    { id: "motion-clip", kind: "motion-clip", path: "evidence/motion.mp4", note: "Sequential entrance timing and settles" },
  ],
  assessments: REVIEW_DOMAINS.map((domain) => ({
    domain,
    rating: domain === "motion" ? "weak" : "acceptable",
    confidence: "high",
    rationale: domain === "motion" ? "Repeated entrances flatten the energy curve across the film." : `${domain} is coherent in the supplied review evidence.`,
    evidenceRefs: [domain === "motion" ? "motion-clip" : "contact-sheet"],
  })),
  verdict: "revise",
  summary: "The concept reads, but uniform choreography prevents a convincing build.",
  findings: [{
    id: "uniform-choreography", severity: "P2", domain: "motion", principleIds: ["CR-MOT-3"],
    sceneId: "whole-film", evidenceRefs: ["motion-clip", "contact-sheet"],
    observation: "Every scene uses the same centered fade and similar settle timing.",
    consequence: "The viewer predicts the cadence before the narrative reaches its peak.",
    fix: "Hold the setup, give the peak a directional reveal, and simplify the close.",
    expectedEffect: "A varied energy curve with an earned payoff.",
  }],
  priorities: ["uniform-choreography"], uncertainties: [],
});

const label = CalibrationCaseLabel.parse({ expectedVerdicts: ["revise"], mustFind: [{ principleId: "CR-MOT-3", severityAtLeast: "P2" }], mustNotFind: [{ principleId: "CR-SLOP-1", severityAtLeast: "P1" }], maxFindings: 2, maxSeverity: "P2" });
const review = makeReview();
const first = scoreCreativeReview(label, review);
const second = scoreCreativeReview(label, review);
if (!first.pass) throw new Error(`valid review did not pass hidden labels: ${JSON.stringify(first)}`);
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("repeated scoring changed bytes");

const spam = structuredClone(review);
spam.findings.push({ ...spam.findings[0], id: "speculative-slop", severity: "P1", principleIds: ["CR-SLOP-1"] });
spam.priorities.push("speculative-slop");
const spamResult = scoreCreativeReview(label, CreativeReview.parse(spam));
if (spamResult.pass || spamResult.withinSeverityBudget || spamResult.forbidden.length !== 1)
  throw new Error(`finding spam was not rejected: ${JSON.stringify(spamResult)}`);

const detached = structuredClone(review);
detached.findings[0].evidenceRefs = ["invented-frame"];
if (CreativeReview.safeParse(detached).success) throw new Error("detached evidence ref was accepted");
const falseShip = structuredClone(review);
falseShip.verdict = "ship"; falseShip.findings[0].severity = "P1";
if (CreativeReview.safeParse(falseShip).success) throw new Error("ship with P1 was accepted");

const cliFixture = mkdtempSync(path.join(tmpdir(), "chitra-review-"));
try {
  const labelsFile = path.join(cliFixture, "labels-v2.json");
  const reviewFile = path.join(cliFixture, "review.json");
  writeFileSync(labelsFile, `${JSON.stringify({ labelVersion: "0.2.0", cases: { "uniform-monotony": label } }, null, 2)}\n`);
  writeFileSync(reviewFile, `${JSON.stringify(review, null, 2)}\n`);
  const cli = spawnSync(process.execPath, [path.join(root, "core/dist/cli/index.js"), "review-score", labelsFile, reviewFile, "--case", "uniform-monotony"], { encoding: "utf8" });
  if (cli.status !== 0 || JSON.parse(cli.stdout).pass !== true)
    throw new Error(`documented review-score CLI failed: ${cli.stderr || cli.stdout}`);
} finally { rmSync(cliFixture, { recursive: true, force: true }); }

const report = `# Creative Review contract benchmark — 2026-07-16\n\n- Valid evidence-bound review: **passed**\n- Hidden principle/severity/verdict match: **passed**\n- Repeated score object: **byte-identical**\n- Documented collection + case CLI flow: **passed**\n- Finding spam + forbidden P1: **rejected**\n- Unknown evidence reference: **rejected**\n- Contradictory ship verdict: **rejected**\n\nThis proves contract/scorer mechanics, not critic taste. Independent labels and real critic runs remain required.\n`;
if (!check) writeFileSync(path.join(here, "results.md"), report);
console.log("✔ creative review contract, evidence refs, hidden labels, and anti-spam budgets verified");
