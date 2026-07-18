#!/usr/bin/env node
/**
 * chitra — deterministic core CLI (ADR-0005: exceptional headless, machine-readable).
 * Commands include intake · plan · board · conform · validate · check · render · evidence · probe.
 */
import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { Command } from "commander";
import { validateScore, validateDirection, validateStoryboard, type ScoreT, type DirectionT, type StoryboardT } from "../ir/schema.js";
import { FRAME_GATE_INTERVAL_MS, frameGateSampleTimes, runStaticGates, runFrameGates, runConformance, runIntakeDirectionConformance, runDirectionStoryboardConformance, runStoryboardScoreConformance, runCreativeConformance, summarize, type Finding } from "../gates/index.js";
import { COMPILER_CACHE_VERSION, openSession, renderScore, type Quality } from "../render/index.js";
import { launchBrowser, resolveBrowserExecutable } from "../browser/index.js";
import { CAPABILITIES, CAPABILITY_MATRIX_VERSION } from "../capabilities/index.js";
import { generateEvidence } from "../evidence/index.js";
import { fetchAsset, snapPage, writeAssetLog } from "../assets/index.js";
import { analyzeAudio } from "../audio/analyze.js";
import { decomposeReference } from "../reference/decompose.js";
import { compareReference, type CompareMode, type CompareRegion } from "../reference/compare.js";
import { validateIntake, type IntakeT } from "../intake/schema.js";
import { materializeIntake } from "../intake/materialize.js";
import { assertReleaseTargets, makeReleaseReceipt, releaseFingerprint, verifyReleaseReceipt, type ReleaseArtifacts } from "../release/index.js";
import { CalibrationCaseLabel, validateCreativeReview, scoreCreativeReview } from "../creative/review.js";
import { validateIndependentCalibrationStudy, scoreIndependentCalibrationStudy } from "../creative/calibration.js";
import { compileRevisionContext, validateRevisionContextQuery, validateRevisionMemory } from "../creative/memory.js";
import { DirectorialProbeManifest, LockedDirectorialSearch, generateDirectorialProbes, lockDirectorialSearch, makeDirectionSelectionReceipt } from "../creative/search.js";
import { editDigest, lockTranscript, packTranscript, renderEdit, resolveEdit, resolveEditArtifactTarget, transcriptDigest, validateEditDecisionList, validateTranscript, verifyTranscriptSources, type EditDecisionListT, type LockedTranscriptT } from "../editing/index.js";
import { FOOTAGE_EVIDENCE_VERSION, generateFootageEvidence } from "../editing/evidence.js";

const program = new Command();
const packageVersion = (createRequire(import.meta.url)("../../package.json") as { version: string }).version;
program.name("chitra").description("Chitra deterministic core: validate, gate, render, and generate critic evidence for Motion IR scores").version(packageVersion);

function loadScore(file: string): { score: ScoreT; projectDir: string } {
  const abs = path.resolve(file);
  if (!existsSync(abs)) fail(`No such file: ${abs}`);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    fail(`Invalid JSON in ${file}: ${(e as Error).message}`);
  }
  const v = validateScore(data);
  if (!v.ok) {
    console.error(`✖ Schema validation failed (${v.issues.length} issue${v.issues.length > 1 ? "s" : ""}):`);
    for (const i of v.issues) console.error(`  [IR] ${i.path}: ${i.message}`);
    process.exit(2);
  }
  return { score: v.score, projectDir: path.dirname(abs) };
}

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(2);
}

function parseCompareRegion(spec: string): CompareRegion {
  const parts = spec.split(":");
  if (parts.length !== 5 && parts.length !== 7) fail(`--region must be id:x:y:width:height[:startPair:endPair], got "${spec}"`);
  const [id, ...raw] = parts;
  const values = raw.map((value) => Number(value));
  if (values.some((value) => !Number.isInteger(value))) fail(`--region coordinates and pair bounds must be integers, got "${spec}"`);
  return { id, x: values[0], y: values[1], width: values[2], height: values[3], ...(parts.length === 7 ? { startPair: values[4], endPair: values[5] } : {}) };
}

function printFindings(findings: Finding[], json: boolean) {
  const s = summarize(findings);
  if (json) {
    console.log(JSON.stringify({ findings, summary: s }, null, 2));
    return s;
  }
  for (const f of [...findings].sort((a, b) => a.severity.localeCompare(b.severity))) {
    const tc = f.timecodeMs != null ? ` @${(f.timecodeMs / 1000).toFixed(2)}s` : "";
    console.log(`  ${f.severity} [${f.ruleId}] ${f.path}${tc}\n     ${f.message}`);
  }
  console.log(`\n${s.releasable ? "✔" : "✖"} ${s.p1} P1 · ${s.p2} P2 · ${s.p3} P3 — ${s.releasable ? "gates green" : "P1 findings block release"}`);
  return s;
}

function loadDirection(file: string): DirectionT {
  const abs = path.resolve(file);
  if (!existsSync(abs)) fail(`No such file: ${abs}`);
  let data: unknown;
  try { data = JSON.parse(readFileSync(abs, "utf8")); } catch (e) { fail(`Invalid JSON in ${file}: ${(e as Error).message}`); }
  const v = validateDirection(data);
  if (!v.ok) {
    console.error(`✖ Direction schema validation failed (${v.issues.length}):`);
    for (const i of v.issues) console.error(`  [IR] ${i.path}: ${i.message}`);
    process.exit(2);
  }
  return v.direction;
}

function loadStoryboard(file: string): StoryboardT {
  const abs = path.resolve(file);
  if (!existsSync(abs)) fail(`No such file: ${abs}`);
  let data: unknown;
  try { data = JSON.parse(readFileSync(abs, "utf8")); } catch (e) { fail(`Invalid JSON in ${file}: ${(e as Error).message}`); }
  const validation = validateStoryboard(data);
  if (!validation.ok) {
    console.error(`✖ Storyboard schema validation failed (${validation.issues.length}):`);
    for (const issue of validation.issues) console.error(`  [IR] ${issue.path}: ${issue.message}`);
    process.exit(2);
  }
  return validation.storyboard;
}

function loadLockedTranscript(file: string): LockedTranscriptT {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
  const validation = validateTranscript(raw, true);
  if (!validation.ok) fail(`Invalid locked transcript: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  return validation.transcript as LockedTranscriptT;
}

function loadEdit(file: string): EditDecisionListT {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
  const validation = validateEditDecisionList(raw);
  if (!validation.ok) fail(`Invalid edit decision list: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  return validation.edit;
}

async function loadIntake(file: string): Promise<IntakeT> {
  const abs = path.resolve(file);
  if (!existsSync(abs)) fail(`No such file: ${abs}`);
  let data: unknown;
  try { data = JSON.parse(readFileSync(abs, "utf8")); } catch (e) { fail(`Invalid JSON in ${file}: ${(e as Error).message}`); }
  const validation = validateIntake(data);
  if (!validation.ok) {
    console.error(`✖ Intake schema validation failed (${validation.issues.length}):`);
    for (const issue of validation.issues) console.error(`  [INTAKE] ${issue.path}: ${issue.message}`);
    process.exit(2);
  }
  try {
    return await materializeIntake(validation.intake, path.dirname(abs));
  } catch (e) {
    fail((e as Error).message);
  }
}

program
  .command("intake")
  .argument("<intake>", "multimodal Intake IR JSON file")
  .option("-o, --out <file>", "write a deterministic locked intake with local content hashes")
  .option("--json", "print the locked intake as JSON")
  .description("Validate and lock prompt/reference/assets/preferences provenance without fetching remote content (ADR-0017)")
  .action(async (file: string, opts: { out?: string; json?: boolean }) => {
    try {
      const intake = await loadIntake(file);
      if (opts.out) {
        const out = path.resolve(opts.out);
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, JSON.stringify(intake, null, 2) + "\n");
      }
      if (opts.json) {
        console.log(JSON.stringify(intake, null, 2));
        return;
      }
      const unlocked = intake.sources.filter((source) => source.origin.type === "url" && !source.origin.capturedPath).length;
      const blockers = intake.openQuestions.filter((question) => question.blocksDirection).length;
      console.log(`✔ intake valid — "${intake.title}", ${intake.sources.length} source${intake.sources.length === 1 ? "" : "s"}, ${intake.preferences.length} preference${intake.preferences.length === 1 ? "" : "s"}`);
      if (opts.out) console.log(`  locked: ${opts.out}`);
      if (unlocked) console.log(`  ${unlocked} remote URL${unlocked === 1 ? " remains" : "s remain"} unlocked until captured locally`);
      if (blockers) console.log(`  ${blockers} open question${blockers === 1 ? " blocks" : "s block"} Direction`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command("plan")
  .argument("<direction>", "direction (creative brief) JSON file")
  .description("Validate a Direction/Creative-Brief (ADR-0012 tier 1: the WHY) — narrative arc, tone, audience, per-beat intent")
  .action((file: string) => {
    const d = loadDirection(file);
    console.log(`✔ direction valid — "${d.title}" (${d.register}), ${d.scenes.length} beats\n  arc: ${d.narrativeArc}`);
  });

program
  .command("direction-search-lock")
  .argument("<intake>", "locked Intake IR JSON")
  .argument("<search>", "Directorial Search draft JSON")
  .requiredOption("-o, --out <file>", "locked search output")
  .option("--project <dir>", "project root for candidate paths (default: search directory)")
  .description("Lock 2-4 materially distinct Directions and comparable still-probe Scores to one Intake (ADR-0036)")
  .action(async (intakeFile: string, searchFile: string, opts: { out: string; project?: string }) => {
    const intake = await loadIntake(intakeFile);
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(searchFile), "utf8")); } catch (e) { fail(`Cannot read ${searchFile}: ${(e as Error).message}`); }
    try {
      const locked = lockDirectorialSearch(intake, raw, path.resolve(opts.project ?? path.dirname(path.resolve(searchFile))));
      const out = path.resolve(opts.out); mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(locked, null, 2)}\n`);
      console.log(`✔ directorial search locked — ${locked.candidates.length} candidates, ${locked.candidates[0].probes.length} comparable probe role${locked.candidates[0].probes.length === 1 ? "" : "s"}\n  ${out}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("direction-probes")
  .argument("<intake>", "locked Intake IR JSON")
  .argument("<search>", "locked Directorial Search JSON")
  .requiredOption("-o, --out <dir>", "content-addressed probe evidence root")
  .option("--project <dir>", "project root for candidate paths (default: search directory)")
  .description("Render identity-blind comparable still probes and private mapping evidence (ADR-0036)")
  .action(async (intakeFile: string, searchFile: string, opts: { out: string; project?: string }) => {
    const intake = await loadIntake(intakeFile);
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(searchFile), "utf8")); } catch (e) { fail(`Cannot read ${searchFile}: ${(e as Error).message}`); }
    const parsed = LockedDirectorialSearch.safeParse(raw);
    if (!parsed.success) fail(`Invalid locked directorial search: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    try {
      const result = await generateDirectorialProbes(intake, parsed.data, path.resolve(opts.project ?? path.dirname(path.resolve(searchFile))), opts.out);
      console.log(`✔ directorial probes ${result.cached ? "reused" : "generated"} — ${result.manifest.candidates.length} blind candidates, ${result.manifest.pairwise.length} role comparisons, ${result.manifest.nearDuplicatePairs.length} near-duplicate pair${result.manifest.nearDuplicatePairs.length === 1 ? "" : "s"}\n  private manifest: ${result.manifestPath}\n  reviewer packet: ${path.join(result.directory, result.manifest.blindPacket.path)}\n  contact sheet: ${path.join(result.directory, result.manifest.contactSheet.path)}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("direction-select")
  .argument("<manifest>", "private Directorial Probe Manifest JSON")
  .argument("<selection>", "blind Direction Selection JSON")
  .requiredOption("-o, --out <file>", "selection receipt output")
  .description("Resolve a complete blinded decision to the exact winning Direction (ADR-0036)")
  .action((manifestFile: string, selectionFile: string, opts: { out: string }) => {
    let manifestRaw: unknown, selectionRaw: unknown;
    try { manifestRaw = JSON.parse(readFileSync(path.resolve(manifestFile), "utf8")); } catch (e) { fail(`Cannot read ${manifestFile}: ${(e as Error).message}`); }
    try { selectionRaw = JSON.parse(readFileSync(path.resolve(selectionFile), "utf8")); } catch (e) { fail(`Cannot read ${selectionFile}: ${(e as Error).message}`); }
    const manifest = DirectorialProbeManifest.safeParse(manifestRaw);
    if (!manifest.success) fail(`Invalid Directorial Probe Manifest: ${manifest.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    try {
      const receipt = makeDirectionSelectionReceipt(manifest.data, selectionRaw, path.dirname(path.resolve(manifestFile)));
      const out = path.resolve(opts.out); mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
      console.log(`✔ Direction selected — ${receipt.selected.directionId} (${receipt.selected.candidateId})\n  ${receipt.selected.directionPath}\n  receipt: ${out}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("board")
  .argument("<storyboard>", "Storyboard IR JSON file")
  .description("Validate a Storyboard (ADR-0018: shot intent between Direction and Score)")
  .action((file: string) => {
    const storyboard = loadStoryboard(file);
    console.log(`✔ storyboard valid — "${storyboard.title}" (${storyboard.register}), ${storyboard.shots.length} shots`);
  });

program
  .command("review-validate")
  .argument("<review>", "typed Creative Review JSON file")
  .option("--json", "print the normalized review")
  .description("Validate evidence-bound multidisciplinary creative judgment (ADR-0029)")
  .action((file: string, opts: { json?: boolean }) => {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
    const validation = validateCreativeReview(raw);
    if (!validation.ok) {
      console.error(`✖ Creative Review schema validation failed (${validation.issues.length}):`);
      for (const issue of validation.issues) console.error(`  [REVIEW] ${issue.path}: ${issue.message}`);
      process.exit(2);
    }
    if (opts.json) console.log(JSON.stringify(validation.review, null, 2));
    else {
      const p1 = validation.review.findings.filter((finding) => finding.severity === "P1").length;
      console.log(`✔ creative review valid — ${validation.review.verdict}, ${validation.review.findings.length} findings (${p1} P1), ${validation.review.assessments.length} domains assessed`);
    }
  });

program
  .command("review-score")
  .argument("<label>", "hidden calibration-case label JSON")
  .argument("<review>", "typed Creative Review JSON")
  .option("--case <id>", "case id when label is a labels-v2.json collection")
  .description("Score one Creative Review against principle-ID calibration labels (ADR-0029)")
  .action((labelFile: string, reviewFile: string, opts: { case?: string }) => {
    let labelRaw: unknown, reviewRaw: unknown;
    try { labelRaw = JSON.parse(readFileSync(path.resolve(labelFile), "utf8")); } catch (e) { fail(`Cannot read ${labelFile}: ${(e as Error).message}`); }
    try { reviewRaw = JSON.parse(readFileSync(path.resolve(reviewFile), "utf8")); } catch (e) { fail(`Cannot read ${reviewFile}: ${(e as Error).message}`); }
    let labelCandidate = labelRaw;
    if (opts.case) {
      const cases = labelRaw && typeof labelRaw === "object" && "cases" in labelRaw ? (labelRaw as { cases?: unknown }).cases : undefined;
      labelCandidate = cases && typeof cases === "object" ? (cases as Record<string, unknown>)[opts.case] : undefined;
      if (!labelCandidate) fail(`Calibration case not found: ${opts.case}`);
    }
    const label = CalibrationCaseLabel.safeParse(labelCandidate);
    if (!label.success) fail(`Invalid calibration label: ${label.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    const review = validateCreativeReview(reviewRaw);
    if (!review.ok) fail(`Invalid Creative Review: ${review.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    const result = scoreCreativeReview(label.data, review.review);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.pass ? 0 : 1);
  });

program
  .command("review-calibrate")
  .argument("<study>", "independent calibration study JSON")
  .option("-o, --out <file>", "write the complete deterministic result")
  .option("--json", "print the complete deterministic result")
  .description("Measure panel and candidate agreement without a composite taste score (ADR-0030)")
  .action((file: string, opts: { out?: string; json?: boolean }) => {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
    const validation = validateIndependentCalibrationStudy(raw);
    if (!validation.ok) fail(`Invalid calibration study: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    const result = scoreIndependentCalibrationStudy(validation.study);
    if (opts.out) {
      const out = path.resolve(opts.out);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
    }
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`✔ independent calibration valid — ${result.caseCount} cases, verdict pair agreement ${result.panel.verdictPairAgreement ?? "n/a"}, principle Jaccard ${result.panel.principleSetJaccard ?? "n/a"}, severity agreement ${result.panel.sharedPrincipleSeverityAgreement ?? "n/a"}`);
      if (opts.out) console.log(`  result: ${opts.out}`);
      if (!result.allReviewersConsentToPublicRelease) console.log("  private: at least one reviewer did not consent to public release");
    }
  });

program
  .command("memory-validate")
  .argument("<memory>", "accepted-revision memory JSON")
  .option("--json", "print normalized memory")
  .description("Validate scope-safe evidence-bound creative memory (ADR-0032)")
  .action((file: string, opts: { json?: boolean }) => {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
    const validation = validateRevisionMemory(raw);
    if (!validation.ok) fail(`Invalid revision memory: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    if (opts.json) console.log(JSON.stringify(validation.memory, null, 2));
    else {
      const accepted = validation.memory.entries.filter((entry) => entry.decision.status === "accepted").length;
      console.log(`✔ revision memory valid — ${validation.memory.entries.length} entries, ${accepted} accepted`);
    }
  });

program
  .command("memory-context")
  .argument("<memory>", "accepted-revision memory JSON")
  .option("--project <id>", "retrieve project-scoped revisions for this exact project")
  .option("--brand <id>", "retrieve brand-scoped revisions for this exact brand")
  .option("--register <register>", "filter by brand-film, product-demo, or social-short")
  .option("--principle <id...>", "prioritize matching CR-* principle IDs")
  .option("--max-chars <count>", "maximum serialized directive characters", "6000")
  .option("-o, --out <file>", "write deterministic context packet")
  .option("--json", "print the context packet")
  .description("Compile relevant revision evidence into bounded agent context (ADR-0032)")
  .action((file: string, opts: { project?: string; brand?: string; register?: string; principle?: string[]; maxChars: string; out?: string; json?: boolean }) => {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
    const validation = validateRevisionMemory(raw);
    if (!validation.ok) fail(`Invalid revision memory: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    const maxChars = Number(opts.maxChars);
    if (!Number.isInteger(maxChars) || maxChars < 512 || maxChars > 50000) fail("--max-chars must be an integer from 512 to 50000");
    const query = validateRevisionContextQuery({
      projectId: opts.project,
      brandId: opts.brand,
      register: opts.register,
      principleIds: opts.principle,
      maxChars,
    });
    if (!query.ok) fail(`Invalid memory query: ${query.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    const context = compileRevisionContext(validation.memory, query.query);
    if (opts.out) {
      const out = path.resolve(opts.out);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(context, null, 2)}\n`);
    }
    if (opts.json || !opts.out) console.log(JSON.stringify(context, null, 2));
    else console.log(`✔ revision context compiled — ${context.selected}/${context.eligible} relevant entries (${context.omittedByBudget} omitted by budget)`);
  });

program
  .command("transcript-lock")
  .argument("<transcript>", "provider-neutral Transcript IR draft JSON")
  .requiredOption("-o, --out <file>", "locked transcript output")
  .option("--project <dir>", "project root for source paths (default: transcript directory)")
  .description("Bind word-timed footage transcripts to exact local source bytes and media facts (ADR-0034)")
  .action((file: string, opts: { out: string; project?: string }) => {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path.resolve(file), "utf8")); } catch (e) { fail(`Cannot read ${file}: ${(e as Error).message}`); }
    try {
      const locked = lockTranscript(raw, path.resolve(opts.project ?? path.dirname(path.resolve(file))));
      const out = path.resolve(opts.out);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(locked, null, 2)}\n`);
      console.log(`✔ transcript locked — ${locked.sources.length} sources, ${locked.tokens.length} tokens\n  ${opts.out}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("transcript-pack")
  .argument("<transcript>", "locked Transcript IR JSON")
  .requiredOption("-o, --out <file>", "compact Markdown output")
  .option("--project <dir>", "project root for source verification (default: transcript directory)")
  .option("--source <ids...>", "include only these source IDs")
  .option("--max-chars <count>", "hard complete-pack character budget", "50000")
  .description("Compile word JSON into a compact phrase-addressed agent reading surface (ADR-0034)")
  .action((file: string, opts: { out: string; project?: string; source?: string[]; maxChars: string }) => {
    const transcript = loadLockedTranscript(file);
    const maxChars = Number(opts.maxChars);
    if (!Number.isInteger(maxChars) || maxChars < 1000 || maxChars > 200000) fail("--max-chars must be an integer from 1000 to 200000");
    try {
      verifyTranscriptSources(transcript, path.resolve(opts.project ?? path.dirname(path.resolve(file))));
      const packed = packTranscript(transcript, { sourceIds: opts.source, maxChars });
      const out = path.resolve(opts.out);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, packed);
      console.log(`✔ transcript packed — ${packed.length} characters, ${transcript.tokens.length} addressable tokens\n  ${opts.out}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("edit-check")
  .argument("<transcript>", "locked Transcript IR JSON")
  .argument("<edit>", "Edit Decision List JSON")
  .option("--project <dir>", "project root for source verification (default: transcript directory)")
  .option("--json", "print resolved edit ranges")
  .description("Conform an explainable word-addressed EDL to locked footage (ADR-0034)")
  .action((transcriptFile: string, editFile: string, opts: { project?: string; json?: boolean }) => {
    const transcript = loadLockedTranscript(transcriptFile), edit = loadEdit(editFile);
    try {
      verifyTranscriptSources(transcript, path.resolve(opts.project ?? path.dirname(path.resolve(transcriptFile))));
      const segments = resolveEdit(transcript, edit);
      if (opts.json) console.log(JSON.stringify({ segments, durationMs: segments.reduce((sum, segment) => sum + segment.durationMs, 0) }, null, 2));
      else console.log(`✔ edit valid — ${segments.length} segments, ${(segments.reduce((sum, segment) => sum + segment.durationMs, 0) / 1000).toFixed(2)}s`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("edit-render")
  .argument("<transcript>", "locked Transcript IR JSON")
  .argument("<edit>", "Edit Decision List JSON")
  .requiredOption("-o, --out <file>", "rendered edit output (.mp4)")
  .option("--receipt <file>", "hash-bound render receipt (default: <out>.edit.json)")
  .option("--project <dir>", "project root for source paths (default: transcript directory)")
  .option("-q, --quality <profile>", "draft | high", "high")
  .description("Render word-addressed footage with source audio, cut fades, and a receipt (ADR-0034)")
  .action((transcriptFile: string, editFile: string, opts: { out: string; receipt?: string; project?: string; quality: string }) => {
    if (!(["draft", "high"] as string[]).includes(opts.quality)) fail("--quality must be draft or high");
    const transcript = loadLockedTranscript(transcriptFile), edit = loadEdit(editFile);
    try {
      const projectDir = path.resolve(opts.project ?? path.dirname(path.resolve(transcriptFile)));
      const outputFile = resolveEditArtifactTarget(transcript, projectDir, opts.out);
      const receiptFile = resolveEditArtifactTarget(transcript, projectDir, opts.receipt ?? `${opts.out}.edit.json`);
      if (outputFile === receiptFile) fail("edit receipt cannot overwrite the rendered output");
      const receipt = renderEdit(transcript, edit, projectDir, outputFile, opts.quality as "draft" | "high");
      writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
      console.log(`✔ edit rendered — ${receipt.segments.length} segments, ${(receipt.output.durationMs / 1000).toFixed(2)}s, ${opts.quality}\n  ${opts.out}\n  receipt: ${receiptFile}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("edit-evidence")
  .argument("<transcript>", "locked Transcript IR JSON")
  .argument("<edit>", "Edit Decision List JSON")
  .requiredOption("-o, --out <dir>", "content-addressed evidence root")
  .requiredOption("--segment <ids...>", "one to twelve EDL segment IDs to inspect")
  .option("--project <dir>", "project root for source paths (default: transcript directory)")
  .option("--reason <text>", "why these editorial ranges need visual evidence", "Inspect picture and sound around candidate edit ranges")
  .option("--context-ms <count>", "source context before and after each segment", "500")
  .option("--samples <count>", "filmstrip frames per segment (3-9)", "5")
  .option("--thumbnail-width <pixels>", "filmstrip/cut frame width (240-640)", "400")
  .option("--waveform-width <pixels>", "waveform width (600-1600)", "1000")
  .option("--waveform-height <pixels>", "waveform height (80-300)", "160")
  .option("--skip-adjacent-cuts", "omit adjacent EDL cut strips and metrics")
  .description("Generate bounded word-aligned filmstrips, waveforms, and adjacent-cut evidence (ADR-0035)")
  .action(async (transcriptFile: string, editFile: string, opts: { out: string; segment: string[]; project?: string; reason: string; contextMs: string; samples: string; thumbnailWidth: string; waveformWidth: string; waveformHeight: string; skipAdjacentCuts?: boolean }) => {
    const transcript = loadLockedTranscript(transcriptFile), edit = loadEdit(editFile);
    const integer = (name: string, value: string, min: number, max: number) => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) fail(`${name} must be an integer from ${min} to ${max}`);
      return parsed;
    };
    try {
      const result = await generateFootageEvidence(transcript, edit, {
        evidenceVersion: FOOTAGE_EVIDENCE_VERSION,
        transcriptDigest: transcriptDigest(transcript),
        editDigest: editDigest(edit),
        segmentIds: opts.segment,
        reason: opts.reason,
        contextMs: integer("--context-ms", opts.contextMs, 0, 2_000),
        samplesPerSegment: integer("--samples", opts.samples, 3, 9),
        thumbnailWidth: integer("--thumbnail-width", opts.thumbnailWidth, 240, 640),
        waveform: {
          width: integer("--waveform-width", opts.waveformWidth, 600, 1_600),
          height: integer("--waveform-height", opts.waveformHeight, 80, 300),
        },
        includeAdjacentCuts: !opts.skipAdjacentCuts,
      }, path.resolve(opts.project ?? path.dirname(path.resolve(transcriptFile))), opts.out);
      console.log(`✔ edit evidence ${result.cached ? "reused" : "generated"} — ${result.manifest.segments.length} ranges, ${result.manifest.cuts.length} adjacent cuts\n  ${result.manifestPath}`);
    } catch (e) { fail((e as Error).message); }
  });

program
  .command("conform")
  .argument("<from>", "upstream Intake, Direction, or Storyboard JSON")
  .argument("<to>", "downstream Direction, Storyboard, or Score JSON")
  .option("--json", "machine-readable output")
  .description("Check one creative boundary: Intake→Direction, Direction→Storyboard/Score, or Storyboard→Score")
  .action(async (fromFile: string, toFile: string, opts: { json?: boolean }) => {
    let fromTier = "", toTier = "";
    try { fromTier = JSON.parse(readFileSync(path.resolve(fromFile), "utf8")).tier; } catch (e) { fail(`Cannot read ${fromFile}: ${(e as Error).message}`); }
    try { toTier = JSON.parse(readFileSync(path.resolve(toFile), "utf8")).tier; } catch (e) { fail(`Cannot read ${toFile}: ${(e as Error).message}`); }
    let findings: Finding[];
    if (fromTier === "intake" && toTier === "direction")
      findings = runIntakeDirectionConformance(await loadIntake(fromFile), loadDirection(toFile));
    else if (fromTier === "direction" && toTier === "storyboard")
      findings = runDirectionStoryboardConformance(loadDirection(fromFile), loadStoryboard(toFile));
    else if (fromTier === "storyboard" && toTier === "score") {
      const loaded = loadScore(toFile);
      findings = runStoryboardScoreConformance(loadStoryboard(fromFile), loaded.score, loaded.projectDir);
    }
    else if (fromTier === "direction" && toTier === "score")
      findings = runConformance(loadDirection(fromFile), loadScore(toFile).score);
    else fail(`Unsupported conformance boundary: ${fromTier || "unknown"} → ${toTier || "unknown"}`);
    const s = printFindings(findings, !!opts.json);
    process.exit(s.releasable ? 0 : 1);
  });

program
  .command("creative-check")
  .argument("<intake>", "locked or source Intake JSON")
  .argument("<direction>", "Direction JSON")
  .argument("<storyboard>", "Storyboard JSON")
  .argument("<score>", "Score JSON")
  .option("--json", "machine-readable output")
  .description("Validate the complete Intake→Direction→Storyboard→Score intent chain (ADR-0018)")
  .action(async (intakeFile: string, directionFile: string, storyboardFile: string, scoreFile: string, opts: { json?: boolean }) => {
    const loaded = loadScore(scoreFile);
    const findings = runCreativeConformance(
      await loadIntake(intakeFile),
      loadDirection(directionFile),
      loadStoryboard(storyboardFile),
      loaded.score,
      loaded.projectDir
    );
    const summary = printFindings(findings, !!opts.json);
    process.exit(summary.releasable ? 0 : 1);
  });

program
  .command("validate")
  .argument("<score>", "score JSON file")
  .option("--json", "machine-readable output")
  .description("Schema (layer 1) + static gates (layer 2, score-only)")
  .action((file: string, opts: { json?: boolean }) => {
    const { score } = loadScore(file);
    const findings = runStaticGates(score);
    const s = printFindings(findings, !!opts.json);
    process.exit(s.releasable ? 0 : 1);
  });

program
  .command("check")
  .argument("<score>", "score JSON file")
  .option("--json", "machine-readable output")
  .description("Full deterministic check: schema + static gates + frame gates (renders probe frames in a real browser)")
  .action(async (file: string, opts: { json?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    const findings = runStaticGates(score);
    const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
    try {
      findings.push(...(await runFrameGates(score, session)));
    } finally {
      await session.close();
    }
    const s = printFindings(findings, !!opts.json);
    process.exit(s.releasable ? 0 : 1);
  });

program
  .command("render")
  .argument("<score>", "score JSON file")
  .option("-o, --out <file>", "output mp4", "out.mp4")
  .option("-q, --quality <q>", "draft | standard | high", "standard")
  .option("--json", "machine-readable output")
  .option("--force", "render even with P1 static-gate findings")
  .description("Deterministic render to H.264 (per-scene cache; only dirty scenes re-render). Refuses P1 findings unless --force.")
  .action(async (file: string, opts: { out: string; quality: string; json?: boolean; force?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    if (!["draft", "standard", "high"].includes(opts.quality)) fail(`quality must be draft|standard|high`);
    const staticFindings = runStaticGates(score).filter((x) => x.severity === "P1");
    if (staticFindings.length && !opts.force) {
      printFindings(staticFindings, !!opts.json);
      fail("P1 findings block render — fix them or pass --force");
    }
    const r = await renderScore(score, projectDir, opts.out, {
      quality: opts.quality as Quality,
      onProgress: opts.json ? undefined : (d, t) => process.stdout.write(`\r  frame ${d}/${t}`),
    });
    if (!opts.json) process.stdout.write("\n");
    const out = {
      out: r.outFile,
      durationMs: r.durationMs,
      frames: r.totalFrames,
      rendered: r.renderedFrames,
      fromCache: r.cachedFrames,
      wallSeconds: +(r.wallMs / 1000).toFixed(1),
      phaseSeconds: Object.fromEntries(Object.entries(r.phaseMs).map(([name, ms]) => [name, +(ms / 1000).toFixed(2)])),
      width: r.outputWidth,
      height: r.outputHeight,
      captureFps: r.captureFps,
      cacheMiB: +(r.cacheBytes / 1024 / 1024).toFixed(1),
      audio: r.audio,
    };
    const phases = Object.entries(out.phaseSeconds).map(([name, seconds]) => `${name} ${seconds}s`).join(" · ");
    console.log(opts.json ? JSON.stringify(out, null, 2) : `✔ ${out.out} — ${out.width}×${out.height}, ${out.frames} frames @ ${out.captureFps}fps (${out.fromCache} cached, ${out.cacheMiB} MiB) in ${out.wallSeconds}s\n  ${phases}`);
  });

program
  .command("release")
  .argument("<intake>", "locked Intake JSON")
  .argument("<direction>", "approved Direction JSON")
  .argument("<storyboard>", "approved Storyboard JSON")
  .argument("<score>", "final Score JSON")
  .option("-o, --out <file>", "final output MP4", "out/final.mp4")
  .option("-e, --evidence <dir>", "final evidence directory", "out/evidence")
  .option("-r, --receipt <file>", "release receipt JSON", "out/release.json")
  .option("-q, --quality <q>", "standard | high", "high")
  .option("--json", "machine-readable output")
  .description("Verified release transaction: creative/static/rendered gates → final render/audio → evidence → hash-bound receipt (ADR-0027)")
  .action(async (intakeFile: string, directionFile: string, storyboardFile: string, scoreFile: string, opts: { out: string; evidence: string; receipt: string; quality: string; json?: boolean }) => {
    if (!['standard', 'high'].includes(opts.quality)) fail("release quality must be standard|high");
    const artifacts: ReleaseArtifacts = { intake: intakeFile, direction: directionFile, storyboard: storyboardFile, score: scoreFile };
    const intake = await loadIntake(intakeFile);
    const direction = loadDirection(directionFile);
    const storyboard = loadStoryboard(storyboardFile);
    const { score, projectDir } = loadScore(scoreFile);
    const tool = { packageVersion, compilerCacheVersion: COMPILER_CACHE_VERSION };
    const before = releaseFingerprint(artifacts, score, projectDir, tool);
    assertReleaseTargets(artifacts, score, projectDir, opts);
    const findings = [
      ...runCreativeConformance(intake, direction, storyboard, score, projectDir),
      ...runStaticGates(score),
    ];
    if (findings.some((finding) => finding.severity === "P1")) {
      printFindings(findings, !!opts.json);
      fail("P1 findings block release");
    }

    const tag = `${before.inputHash.slice(0, 12)}-${process.pid}`;
    const finalOut = path.resolve(opts.out);
    const finalEvidence = path.resolve(opts.evidence);
    const finalReceipt = path.resolve(opts.receipt);
    const stagedOut = path.join(path.dirname(finalOut), `.${path.basename(finalOut)}.${tag}.mp4`);
    const stagedEvidence = path.join(path.dirname(finalEvidence), `.${path.basename(finalEvidence)}.${tag}`);
    const stagedReceipt = path.join(path.dirname(finalReceipt), `.${path.basename(finalReceipt)}.${tag}`);
    try {
      const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
      let evidence: Awaited<ReturnType<typeof generateEvidence>>;
      try {
        findings.push(...await runFrameGates(score, session));
        if (findings.some((finding) => finding.severity === "P1")) {
          printFindings(findings, !!opts.json);
          throw new Error("rendered P1 findings block release");
        }
        evidence = await generateEvidence(score, session, stagedEvidence);
      } finally {
        await session.close();
      }

      const render = await renderScore(score, projectDir, stagedOut, {
        quality: opts.quality as Quality,
        onProgress: opts.json ? undefined : (done, total) => process.stdout.write(`\r  frame ${done}/${total}`),
      });
      if (!opts.json) process.stdout.write("\n");
      const after = releaseFingerprint(artifacts, score, projectDir, tool);
      if (after.inputHash !== before.inputHash) throw new Error("release inputs changed while gates/render/evidence were running; no receipt written");

      mkdirSync(path.dirname(finalOut), { recursive: true });
      mkdirSync(path.dirname(finalEvidence), { recursive: true });
      rmSync(finalOut, { force: true });
      renameSync(stagedOut, finalOut);
      rmSync(finalEvidence, { recursive: true, force: true });
      renameSync(stagedEvidence, finalEvidence);
      const evidenceFiles = [evidence.contactSheet, ...evidence.heroFrames, evidence.cutStrips]
        .map((file) => path.join(finalEvidence, path.relative(stagedEvidence, file)));

      const summary = summarize(findings);
      const receipt = makeReleaseReceipt({
        receiptFile: finalReceipt,
        fingerprint: before,
        tool,
        quality: opts.quality as Quality,
        findings,
        summary,
        sampledFrames: frameGateSampleTimes(score).length,
        maxIntervalMs: FRAME_GATE_INTERVAL_MS,
        render: {
          path: finalOut, durationMs: render.durationMs, frames: render.totalFrames,
          width: score.meta.width, height: score.meta.height, fps: score.meta.fps, audio: render.audio,
        },
        evidenceFiles,
      });
      mkdirSync(path.dirname(finalReceipt), { recursive: true });
      writeFileSync(stagedReceipt, JSON.stringify(receipt, null, 2) + "\n");
      const verification = verifyReleaseReceipt(stagedReceipt);
      if (!verification.ok) throw new Error(`release receipt self-verification failed: ${verification.issues.join("; ")}`);
      rmSync(finalReceipt, { force: true });
      renameSync(stagedReceipt, finalReceipt);
      const output = { releaseId: receipt.releaseId, out: finalOut, receipt: finalReceipt, evidence: finalEvidence, summary, audio: render.audio };
      console.log(opts.json ? JSON.stringify(output, null, 2) : `✔ release ${receipt.releaseId} → ${finalOut}\n  receipt: ${finalReceipt}\n  evidence: ${finalEvidence}`);
    } finally {
      rmSync(stagedOut, { force: true });
      rmSync(stagedEvidence, { recursive: true, force: true });
      rmSync(stagedReceipt, { force: true });
    }
  });

program
  .command("verify-release")
  .argument("<receipt>", "release receipt JSON")
  .option("--json", "machine-readable output")
  .description("Verify that release inputs, resolved assets, final video, and evidence still match their receipt")
  .action((receiptFile: string, opts: { json?: boolean }) => {
    const result = verifyReleaseReceipt(receiptFile);
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`✔ release ${result.receipt?.releaseId} receipt is current`);
    else console.error(`✖ stale or invalid release receipt\n${result.issues.map((issue) => `  - ${issue}`).join("\n")}`);
    process.exit(result.ok ? 0 : 1);
  });

program
  .command("evidence")
  .argument("<score>", "score JSON file")
  .option("-o, --out <dir>", "output directory", "evidence")
  .option("--json", "machine-readable output")
  .description("Generate critic evidence: contact sheet, per-scene hero frames, cut strips")
  .action(async (file: string, opts: { out: string; json?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
    try {
      const e = await generateEvidence(score, session, opts.out);
      console.log(
        opts.json
          ? JSON.stringify(e, null, 2)
          : `✔ evidence → ${opts.out}\n  contact sheet: ${e.contactSheet}\n  hero frames: ${e.heroFrames.length}\n  cut strips: ${e.cutStrips}`
      );
    } finally {
      await session.close();
    }
  });

program
  .command("frame")
  .argument("<score>", "score JSON file")
  .requiredOption("-t, --time <ms>", "timecode in milliseconds")
  .option("-o, --out <file>", "output PNG", "frame.png")
  .description("Capture one frame — the fast preview for iteration (seconds, not minutes)")
  .action(async (file: string, opts: { time: string; out: string }) => {
    const { score, projectDir } = loadScore(file);
    const ms = Number(opts.time);
    if (!Number.isFinite(ms) || ms < 0) fail("--time must be a non-negative number of milliseconds");
    const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
    try {
      writeFileSync(opts.out, await session.seekAndCapture(Math.min(ms, session.compiled.durationMs - 1)));
      console.log(`✔ ${opts.out} @ ${(ms / 1000).toFixed(2)}s`);
    } finally {
      await session.close();
    }
  });

program
  .command("init")
  .argument("[dir]", "project directory", ".")
  .option("--style <name>", "house style: night | paper", "night")
  .option("--register <r>", "brand-film | product-demo | social-short", "brand-film")
  .option("--title <t>", "video title", "Untitled")
  .description("Scaffold a gate-passing starter score.json to edit from — never start from a blank file")
  .action((dir: string, opts: { style: string; register: string; title: string }) => {
    const target = path.resolve(dir, "score.json");
    if (existsSync(target)) fail(`${target} already exists`);
    // Styles live at core/styles when installed from npm (copied at prepack),
    // and at the repo root during development.
    const cliDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(cliDir, "../../styles", `${opts.style}.json`),
      path.resolve(cliDir, "../../../styles", `${opts.style}.json`),
    ];
    const styleFile = candidates.find((f) => existsSync(f));
    if (!styleFile) fail(`Unknown style "${opts.style}" (looked in ${candidates.map((c) => path.dirname(c)).join(", ")})`);
    const style = JSON.parse(readFileSync(styleFile, "utf8"));
    delete style.$comment;
    const portrait = opts.register === "social-short";
    const starter = starterScore(opts.title, opts.register, style, portrait);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(starter, null, 2));
    const v = validateScore(starter);
    const gates = v.ok ? runStaticGates(v.score).filter((x) => x.severity !== "P3").length : -1;
    console.log(`✔ ${target} (${opts.register}, style: ${opts.style}${portrait ? ", 1080×1920" : ""})`);
    console.log(gates === 0 ? "✔ starter passes static gates — edit from here" : "✖ starter has gate findings — this is a bug, please report");
    console.log(`next: chitra check score.json && chitra render score.json -o out/draft.mp4 -q draft`);
  });

program
  .command("clean")
  .argument("[dir]", "project directory", ".")
  .description("Remove Chitra work artifacts (.chitra-cache/, .chitra-page.html) from a project directory")
  .action((dir: string) => {
    for (const f of [".chitra-cache", ".chitra-page.html"]) {
      const t = path.resolve(dir, f);
      if (existsSync(t)) {
        rmSync(t, { recursive: true, force: true });
        console.log(`✔ removed ${t}`);
      }
    }
  });

program
  .command("fetch")
  .argument("<url>", "http(s) URL of an image")
  .requiredOption("-o, --out <file>", "output path (extension picks format: .png/.jpg/.webp)")
  .option("--max-width <px>", "downscale to at most this width", (v) => parseInt(v, 10))
  .option("--json", "machine-readable output")
  .description("Download + normalize a web image into the project (ADR-0006; logs provenance to assets/sources.jsonl)")
  .action(async (url: string, o: { out: string; maxWidth?: number; json?: boolean }) => {
    try {
      const report = await fetchAsset(url, o.out, { maxWidth: o.maxWidth });
      writeAssetLog(process.cwd(), report);
      if (o.json) console.log(JSON.stringify(report, null, 2));
      else console.log(`✔ ${report.out} — ${report.width}×${report.height}, ${(report.bytes / 1024).toFixed(0)}KB, sha256 ${report.sha256.slice(0, 16)}…`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command("snap")
  .argument("<url>", "webpage URL to screenshot")
  .requiredOption("-o, --out <file>", "output path (.png/.jpg/.webp)")
  .option("--width <px>", "viewport width (default 1920)", (v) => parseInt(v, 10))
  .option("--height <px>", "viewport height (default 1080)", (v) => parseInt(v, 10))
  .option("--full-page", "capture the full scroll height")
  .option("--delay <ms>", "settle time before capture (default 1500)", (v) => parseInt(v, 10))
  .option("--hide <selector...>", "CSS selectors to hide before capture (cookie/consent overlays auto-hidden)")
  .option("--json", "machine-readable output")
  .description("Screenshot a webpage with the vendored Chrome for use as a score asset (ADR-0006)")
  .action(async (url: string, o: { out: string; width?: number; height?: number; fullPage?: boolean; delay?: number; hide?: string[]; json?: boolean }) => {
    try {
      const report = await snapPage(url, o.out, { width: o.width, height: o.height, fullPage: o.fullPage, delayMs: o.delay, hide: o.hide });
      writeAssetLog(process.cwd(), report);
      if (o.json) console.log(JSON.stringify(report, null, 2));
      else console.log(`✔ ${report.out} — ${report.width}×${report.height}, ${(report.bytes / 1024).toFixed(0)}KB, sha256 ${report.sha256.slice(0, 16)}…`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

const SFX_RECIPES: Record<string, string[]> = {
  // Deterministic signal-source synthesis (ADR-0007): zero licensing, byte-stable
  // for a given ffmpeg version. Tasteful defaults — short, soft, low-mid heavy.
  "tick.wav": ["-f", "lavfi", "-i", "sine=frequency=1400:duration=0.07",
    "-af", "highpass=f=600,afade=t=in:d=0.005,afade=t=out:st=0.02:d=0.05,volume=0.7"],
  "whoosh.wav": ["-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.7:amplitude=0.6:seed=42",
    "-af", "bandpass=f=500:w=400,afade=t=in:d=0.22,afade=t=out:st=0.3:d=0.4,volume=0.8"],
  "rise.wav": ["-f", "lavfi", "-i", "aevalsrc=0.35*sin(2*PI*(140+320*t*t)*t):s=48000:d=0.9",
    "-af", "lowpass=f=1400,afade=t=in:d=0.1,afade=t=out:st=0.55:d=0.35"],
  "boom.wav": ["-f", "lavfi", "-i", "sine=frequency=52:duration=1.0",
    "-af", "lowpass=f=140,afade=t=in:d=0.008,afade=t=out:st=0.08:d=0.9,volume=0.9"],
  // UI click: two-transient (sharp tap + body knock), the sound every cursor-click wants
  "click.wav": ["-f", "lavfi",
    "-i", "aevalsrc=0.5*sin(2*PI*2100*t)*exp(-t*260)+0.42*sin(2*PI*640*t)*exp(-t*130):s=48000:d=0.09",
    "-af", "highpass=f=300,volume=0.85"],
  // pop: pitched-down blip for toggles/dismissals
  "pop.wav": ["-f", "lavfi",
    "-i", "aevalsrc=0.5*sin(2*PI*(480-2600*t)*t)*exp(-t*70):s=48000:d=0.12",
    "-af", "lowpass=f=1200,volume=0.85"],
};

program
  .command("sfx-kit")
  .option("-o, --out <dir>", "output directory", "assets/sfx")
  .description("Generate the deterministic starter SFX kit: tick, whoosh, rise, boom (ADR-0007; no licensing)")
  .action((o: { out: string }) => {
    mkdirSync(path.resolve(o.out), { recursive: true });
    for (const [name, args] of Object.entries(SFX_RECIPES)) {
      const target = path.join(o.out, name);
      const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args, "-ar", "48000", target], { encoding: "utf8" });
      if (r.status !== 0) fail(`ffmpeg failed for ${name}: ${(r.stderr ?? "").slice(-300)}`);
      console.log(`✔ ${target}`);
    }
  });

program
  .command("decompose")
  .argument("<video>", "reference video file")
  .requiredOption("-o, --out <file>", "Style DNA JSON output")
  .option("--evidence <dir>", "shot evidence directory (default: <out>.evidence)")
  .option("--scene-threshold <n>", "ffmpeg scene-change threshold (default 0.3)", parseFloat)
  .option("--sample-fps <n>", "analysis samples per second (default 4)", parseFloat)
  .option("--sample-width <px>", "analysis frame width (default 160)", (v) => parseInt(v, 10))
  .option("--max-samples <n>", "bounded sample count (default 480)", (v) => parseInt(v, 10))
  .description("Decompose a reference into typed, evidence-backed Style DNA (ADR-0015)")
  .action(async (video: string, o: { out: string; evidence?: string; sceneThreshold?: number; sampleFps?: number; sampleWidth?: number; maxSamples?: number }) => {
    try {
      const out = path.resolve(o.out);
      const evidenceDir = path.resolve(o.evidence ?? out.replace(/\.json$/i, "") + ".evidence");
      const dna = await decomposeReference(video, { artifactDir: path.dirname(out), evidenceDir, sceneThreshold: o.sceneThreshold, sampleFps: o.sampleFps, sampleWidth: o.sampleWidth, maxSamples: o.maxSamples });
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(dna, null, 2) + "\n");
      console.log(`✔ ${o.out} — ${dna.shots.length} shots, ${dna.rhythm.cutsPerMinute} cuts/min, ${dna.palette.dominantColors.length} palette colors, ${dna.audio.present ? `${dna.audio.beats.length} audio landmarks` : "no audio"}`);
      console.log(`  evidence: ${dna.evidence.directory} · semantic review remains explicitly unmeasured`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command("compare")
  .argument("<reference>", "reference video file")
  .argument("<candidate>", "candidate render file")
  .requiredOption("-o, --out <file>", "typed comparison JSON output")
  .option("--evidence <dir>", "difference-image directory (default: <out>.evidence)")
  .option("--mode <mode>", "exact | normalized", "exact")
  .option("--max-frames <n>", "exact-mode safety ceiling", (value) => parseInt(value, 10), 1200)
  .option("--samples <n>", "normalized-mode uniform sample count", (value) => parseInt(value, 10), 120)
  .option("--region <spec>", "repeatable ROI id:x:y:width:height[:startPair:endPair]", (value, previous: string[]) => [...previous, value], [])
  .description("Compare aligned reference/candidate frames, optional regions, and audio energy with explicit exact/normalized semantics (ADR-0019/0022)")
  .action(async (reference: string, candidate: string, options: { out: string; evidence?: string; mode: string; maxFrames: number; samples: number; region: string[] }) => {
    if (!(["exact", "normalized"] as string[]).includes(options.mode)) fail("--mode must be exact or normalized");
    if (!Number.isInteger(options.maxFrames) || options.maxFrames < 1) fail("--max-frames must be a positive integer");
    if (!Number.isInteger(options.samples) || options.samples < 1 || options.samples > 2000) fail("--samples must be 1–2000");
    try {
      const out = path.resolve(options.out);
      const evidenceDir = path.resolve(options.evidence ?? out.replace(/\.json$/i, "") + ".evidence");
      const report = await compareReference(reference, candidate, { mode: options.mode as CompareMode, evidenceDir, artifactDir: path.dirname(out), maxFrames: options.maxFrames, samples: options.samples, regions: options.region.map(parseCompareRegion) });
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
      console.log(`✔ ${options.out} — ${report.alignment.mode} ${report.alignment.comparedFrames} frame pairs, MAE ${report.visual.meanAbsoluteError.toFixed(4)}, global SSIM ${report.visual.meanGlobalLumaSsim.toFixed(4)}`);
      if (report.regions.length) console.log(`  regions: ${report.regions.map((region) => `${region.id} MAE ${region.visual.meanAbsoluteError.toFixed(6)} / SSIM ${region.visual.meanGlobalLumaSsim.toFixed(6)} / PSNR ${region.visual.meanPsnrDb == null ? "∞" : `${region.visual.meanPsnrDb.toFixed(3)} dB`}`).join(" · ")}`);
      console.log(`  evidence: ${report.evidence.directory} · semantic similarity remains unmeasured`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command("analyze-audio")
  .argument("<file>", "audio or video file")
  .option("-o, --out <file>", "write analysis JSON sidecar")
  .description("Detect tempo + beat times (ADR-0011). Paste beats into audio.music.beats to enable at.onBeat (motion snapped to the track).")
  .action((file: string, o: { out?: string }) => {
    try {
      const a = analyzeAudio(file);
      const json = JSON.stringify(a, null, 2);
      if (o.out) {
        writeFileSync(path.resolve(o.out), json);
        console.log(`✔ ${o.out} — ${a.beats.length} beats, ~${a.bpm}bpm, first beat ${a.firstBeatMs}ms`);
      } else {
        console.log(json);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command("extract-audio")
  .argument("<video>", "source video file (a reference or recording you have rights to)")
  .requiredOption("-o, --out <file>", "output audio (.m4a/.wav/.mp3)")
  .option("--start <s>", "start offset seconds", parseFloat)
  .option("--duration <s>", "clip length seconds", parseFloat)
  .option("--json", "machine-readable output")
  .description("Extract an audio track from a video for use as a score's music (ffmpeg). You are responsible for having the rights to reuse it — extracting a track from someone else's film does not license it.")
  .action((video: string, o: { out: string; start?: number; duration?: number; json?: boolean }) => {
    const src = path.resolve(video);
    if (!existsSync(src)) fail(`No such video: ${src}`);
    mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
    const args = ["-y", "-v", "error"];
    if (o.start != null) args.push("-ss", o.start.toFixed(3));
    args.push("-i", src);
    if (o.duration != null) args.push("-t", o.duration.toFixed(3));
    const ext = path.extname(o.out).toLowerCase();
    if (ext === ".wav") args.push("-vn", "-c:a", "pcm_s16le");
    else if (ext === ".mp3") args.push("-vn", "-c:a", "libmp3lame", "-b:a", "192k");
    else args.push("-vn", "-c:a", "aac", "-b:a", "192k");
    args.push(path.resolve(o.out));
    const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
    if (r.status !== 0) fail(`audio extraction failed (does the video have an audio track?): ${(r.stderr ?? "").slice(-300)}`);
    const dur = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.resolve(o.out)], { encoding: "utf8" }).stdout?.trim();
    if (o.json) console.log(JSON.stringify({ out: o.out, source: video, durationS: dur ? +parseFloat(dur).toFixed(2) : null }, null, 2));
    else console.log(`✔ ${o.out} — extracted from ${path.basename(video)}${dur ? ` (${(+dur).toFixed(1)}s)` : ""}\n  ⚠ ensure you have the rights to reuse this audio.`);
  });

program
  .command("bed")
  .option("-o, --out <file>", "output wav", "assets/bed.wav")
  .requiredOption("-d, --duration <s>", "bed length in seconds", parseFloat)
  .option("--freq <hz>", "root frequency (default 110 = A2)", parseFloat)
  .option("--bpm <n>", "pulse tempo (default 84)", parseFloat)
  .option("--style <s>", "ambient | explainer (chords + plucked arpeggio + kick/hats)", "ambient")
  .description("Synthesize a deterministic music bed, loudness-normalized at mux (ADR-0007)")
  .action((o: { out: string; duration: number; freq?: number; bpm?: number; style?: string }) => {
    const f = o.freq ?? 110;
    const bpm = o.bpm ?? 84;
    const d = o.duration;
    if (!Number.isFinite(d) || d <= 0 || d > 600) fail("--duration must be 0–600 seconds");
    if (o.style === "explainer") {
      // Explainer-video bed: I–V–vi–IV pads, plucked arpeggio on 8ths, soft
      // kick on beats, offbeat hats. Pure signal math — deterministic, CC0-free.
      const beat = 60 / bpm;
      const bar = 4 * beat;
      const loop = 4 * bar;
      // chord roots for I V vi IV relative to f: 1, 3/2, 5/3 (minor 6th degree root), 4/3
      const chords = [
        [f, f * 1.25, f * 1.5], // I  (maj)
        [f * 1.5, f * 1.875, f * 2.25], // V (maj)
        [f * 1.667, f * 2.0, f * 2.5], // vi (min)
        [f * 1.333, f * 1.667, f * 2.0], // IV (maj)
      ];
      const barSel = `floor(mod(t,${loop.toFixed(4)})/${bar.toFixed(4)})`;
      const win = `pow(sin(PI*mod(t,${bar.toFixed(4)})/${bar.toFixed(4)}),0.6)`;
      const chordExpr = (c: number[]) => c.map((h) => `0.075*sin(2*PI*${h.toFixed(2)}*t)`).join("+");
      const pad = `(${win})*(if(eq(${barSel},0),${chordExpr(chords[0])},if(eq(${barSel},1),${chordExpr(chords[1])},if(eq(${barSel},2),${chordExpr(chords[2])},${chordExpr(chords[3])}))))`;
      // pluck: 8th-note arpeggio root→fifth→octave→third of the current chord
      const slot = `floor(mod(t,${(2 * beat).toFixed(4)})/${(beat / 2).toFixed(4)})`;
      const pluckFreq = (c: number[]) => `if(eq(${slot},0),${(c[0] * 2).toFixed(2)},if(eq(${slot},1),${(c[2] * 2).toFixed(2)},if(eq(${slot},2),${(c[1] * 2).toFixed(2)},${(c[2] * 2).toFixed(2)})))`;
      const pluckF = `if(eq(${barSel},0),${pluckFreq(chords[0])},if(eq(${barSel},1),${pluckFreq(chords[1])},if(eq(${barSel},2),${pluckFreq(chords[2])},${pluckFreq(chords[3])})))`;
      const pluck = `0.16*sin(2*PI*(${pluckF})*t)*exp(-9*mod(t,${(beat / 2).toFixed(4)}))`;
      const kick = `0.22*sin(2*PI*52*t)*exp(-22*mod(t,${beat.toFixed(4)}))`;
      // aevalsrc treats bare commas as channel separators — escape function commas
      const exprEsc = `${pad}+${pluck}+${kick}`.split(",").join("\\,");
      mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      const r = spawnSync("ffmpeg", ["-y", "-v", "error",
        "-f", "lavfi", "-i", `aevalsrc=${exprEsc}:s=48000:d=${d.toFixed(3)}`,
        "-f", "lavfi", "-i", `anoisesrc=color=white:amplitude=0.028:seed=11:duration=${d.toFixed(3)}`,
        "-filter_complex",
        `[1:a]highpass=f=6000,apulsator=mode=square:hz=${(1 / (2 * beat)).toFixed(4)}:offset_l=0.5:offset_r=0.5,volume=0.7[hat];` +
        `[0:a][hat]amix=inputs=2:duration=first:normalize=0,lowpass=f=3200,` +
        `aecho=0.6:0.35:${Math.round(beat * 500)}:0.18,` +
        `afade=t=in:d=0.8,afade=t=out:st=${Math.max(0, d - 2.2).toFixed(3)}:d=2.2[a]`,
        "-map", "[a]", "-ar", "48000", "-ac", "2", path.resolve(o.out)], { encoding: "utf8" });
      if (r.status !== 0) fail(`ffmpeg explainer bed failed: ${(r.stderr ?? "").slice(-400)}`);
      console.log(`✔ ${o.out} — ${d}s explainer bed @ ${f}Hz root, ${bpm}bpm (I–V–vi–IV, plucks, kick, hats)`);
      return;
    }
    const beatS = 60 / bpm;
    const morphS = 16 * beatS; // chord morphs over 8 bars — harmonic motion, not a static drone
    // Two detuned roots (warm beating), fifth, and a third that morphs smoothly
    // between major (5/4) and minor (6/5) via complementary sine weights; a
    // heartbeat sub thump decays each beat for pulse.
    const expr =
      `0.13*sin(2*PI*${f}*t)+0.13*sin(2*PI*${(f + 0.7).toFixed(2)}*t)` +
      `+0.09*sin(2*PI*${(f * 1.5).toFixed(2)}*t)` +
      `+0.07*sin(2*PI*${(f * 1.25).toFixed(3)}*t)*(0.5+0.5*sin(2*PI*t/${morphS.toFixed(3)}))` +
      `+0.07*sin(2*PI*${(f * 1.2).toFixed(3)}*t)*(0.5-0.5*sin(2*PI*t/${morphS.toFixed(3)}))` +
      `+0.15*sin(2*PI*${(f / 2).toFixed(2)}*t)*exp(-4.5*mod(t\\,${beatS.toFixed(4)}))`;
    mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
    const r = spawnSync("ffmpeg", ["-y", "-v", "error",
      "-f", "lavfi", "-i", `aevalsrc=${expr}:s=48000:d=${d.toFixed(3)}`,
      "-f", "lavfi", "-i", `anoisesrc=color=pink:amplitude=0.05:seed=7:duration=${d.toFixed(3)}`,
      "-filter_complex",
      `[1:a]highpass=f=2600,tremolo=f=${(1 / (4 * beatS)).toFixed(4)}:d=0.5,volume=0.5[air];` +
      `[0:a][air]amix=inputs=2:duration=first:normalize=0,lowpass=f=1500,` +
      `aecho=0.68:0.45:${Math.round(beatS * 750)}:0.2,` +
      `afade=t=in:d=1.6,afade=t=out:st=${Math.max(0, d - 2.4).toFixed(3)}:d=2.4[a]`,
      "-map", "[a]", "-ar", "48000", "-ac", "2", path.resolve(o.out)], { encoding: "utf8" });
    if (r.status !== 0) fail(`ffmpeg bed synthesis failed: ${(r.stderr ?? "").slice(-300)}`);
    console.log(`✔ ${o.out} — ${d}s ambient bed @ ${f}Hz root, pulse ${bpm}bpm`);
  });

program
  .command("capabilities")
  .option("--json", "machine-readable capability matrix")
  .description("Report native, asset-assisted, and unsupported production capabilities")
  .action((opts: { json?: boolean }) => {
    if (opts.json) {
      console.log(JSON.stringify({ version: CAPABILITY_MATRIX_VERSION, capabilities: CAPABILITIES }, null, 2));
      return;
    }
    console.log(`Chitra capability matrix ${CAPABILITY_MATRIX_VERSION}`);
    for (const capability of CAPABILITIES)
      console.log(`${capability.support.padEnd(15)} ${capability.id.padEnd(34)} ${capability.boundary}`);
  });

program
  .command("probe")
  .description("Verify ffmpeg and launch an installed system browser")
  .action(async () => {
    const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
    console.log(ff.status === 0 ? `✔ ffmpeg: ${ff.stdout.split("\n")[0]}` : "✖ ffmpeg not found on PATH — install ffmpeg");
    try {
      const executable = resolveBrowserExecutable();
      const browser = await launchBrowser({ headless: true });
      const version = await browser.version();
      await browser.close();
      console.log(`✔ browser: ${version} (${executable})`);
    } catch (error) {
      console.log(`✖ browser: ${(error as Error).message}`);
      process.exitCode = 1;
    }
    if (ff.status !== 0) process.exitCode = 1;
  });

/** A minimal three-scene score that passes every gate in every register. */
function starterScore(title: string, register: string, style: unknown, portrait: boolean) {
  const dims = portrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  const amb = (id: string, ms: number) => ({
    id: `${id}-drift`, target: id, preset: "drift", direction: "right", distance: 5,
    override: { reason: "ambient field travels the full scene length", durationMs: ms },
  });
  return {
    irVersion: "0.1.0",
    tier: "score",
    meta: { title, register, ...dims, fps: 30, seed: 1, safeZone: portrait ? "9x16-social" : "16x9-standard" },
    style,
    scenes: [
      {
        id: "hook", reason: "Open on the single message that must land", durationMs: 3000, background: "bg",
        elements: [
          { type: "shape", id: "glow-a", role: "ambient", shape: "gradient-field", color: "primary", opacity: 0.25, position: { anchor: "center", x: 35, y: 32 }, width: 95, height: 95 },
          { type: "text", id: "hook-line", role: "hero", textRole: "display", content: "Say it once.", position: { anchor: "center", x: 50, y: 46 }, maxWidth: 80 },
        ],
        choreography: [
          amb("glow-a", 3000),
          { id: "hook-in", target: "hook-line", preset: "fade-up", duration: "emphasis", at: { after: "scene-start", offsetMs: 250 } },
        ],
        transitionOut: { type: "fade", duration: "standard" },
      },
      {
        id: "proof", reason: "Back the claim with one concrete beat", durationMs: 3600, background: "surface",
        elements: [
          { type: "text", id: "proof-line", role: "hero", textRole: "headline", content: "Then prove it.", align: "left", position: { anchor: "left", x: 10, y: 46 }, maxWidth: 78 },
          { type: "shape", id: "underline", role: "ambient", shape: "line", color: "accent", position: { anchor: "left", x: 10, y: 54 }, width: 12 },
          { type: "shape", id: "glow-b", role: "ambient", shape: "gradient-field", color: "accent", opacity: 0.1, position: { anchor: "center", x: 75, y: 70 }, width: 90, height: 90 },
        ],
        choreography: [
          amb("glow-b", 3600),
          { id: "proof-in", target: "proof-line", preset: "line-reveal", duration: "emphasis", at: { after: "scene-start", offsetMs: 300 } },
          { id: "underline-in", target: "underline", preset: "draw-line", duration: "dramatic", at: { after: "proof-in", offsetMs: 0 } },
        ],
        transitionOut: { type: "cut", duration: "standard" },
      },
      {
        id: "close", reason: "Land the name and leave", durationMs: 3000, background: "bg",
        elements: [
          { type: "shape", id: "glow-c", role: "ambient", shape: "gradient-field", color: "primary", opacity: 0.2, position: { anchor: "center", x: 50, y: 55 }, width: 100, height: 100 },
          { type: "text", id: "brand", role: "hero", textRole: "title", content: title, position: { anchor: "center", x: 50, y: 50 }, maxWidth: 80 },
        ],
        choreography: [
          { id: "glow-c-in", target: "glow-c", preset: "scale-drift", override: { reason: "slow ambient swell under the closing card", durationMs: 3000 } },
          { id: "brand-in", target: "brand", preset: "scale-settle", duration: "emphasis", at: { after: "scene-start", offsetMs: 250 } },
          { id: "brand-out", target: "brand", preset: "fade-out", duration: "standard", at: { after: "brand-in", offsetMs: 1400 } },
        ],
        transitionOut: { type: "cut", duration: "standard" },
      },
    ],
  };
}

program.parseAsync().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(2);
});
