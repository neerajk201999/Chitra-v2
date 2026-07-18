import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { resolveProjectAsset } from "../assets/local.js";
import { runFrameGates, runIntakeDirectionConformance, runStaticGates, type Finding } from "../gates/index.js";
import { Direction, Score, type DirectionT, type ScoreT } from "../ir/schema.js";
import { Intake, type IntakeT } from "../intake/schema.js";
import { REGISTERS } from "../motion/tokens.js";
import { openSession, renderInputFiles } from "../render/index.js";

export const DIRECTORIAL_SEARCH_VERSION = "0.1.0";
export const DIRECTION_SELECTION_VERSION = "0.1.0";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case");
const blindId = z.string().regex(/^candidate-[0-9a-f]{8}$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/, "digest must be SHA-256");
const reason = z.string().min(8);
const register = z.enum(Object.keys(REGISTERS) as [keyof typeof REGISTERS, ...Array<keyof typeof REGISTERS>]);
const projectPath = z.string().min(1).refine((value) => {
  const parts = value.split("/");
  return !value.startsWith("/") && !value.includes("\\") && !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}, "path must be a normalized project-relative POSIX path without traversal");
const probeRole = z.enum(["opening", "hero", "resolution"]);

const ProbePlan = z.object({
  id,
  role: probeRole,
  sceneId: id,
  directionBeatId: id,
  offsetMs: z.number().int().min(0).max(20_000),
  question: reason,
}).strict();

const CandidateDraft = z.object({
  id,
  directionPath: projectPath,
  probeScorePath: projectPath,
  hypothesis: z.object({
    narrativeMechanism: reason,
    heroComposition: reason,
    motionPremise: reason,
    tradeoff: reason,
    failureMode: reason,
  }).strict(),
  probes: z.array(ProbePlan).min(1).max(3),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>(), roles = new Set<string>();
  value.probes.forEach((probe, index) => {
    if (ids.has(probe.id)) ctx.addIssue({ code: "custom", path: ["probes", index, "id"], message: `duplicate probe ${probe.id}` });
    if (roles.has(probe.role)) ctx.addIssue({ code: "custom", path: ["probes", index, "role"], message: `duplicate probe role ${probe.role}` });
    ids.add(probe.id); roles.add(probe.role);
  });
});

const PairwiseDistinction = z.object({
  leftCandidateId: id,
  rightCandidateId: id,
  ideaDifference: reason,
  storyDifference: reason,
  imageDifference: reason,
  whyBothSurvive: reason,
}).strict().refine((value) => value.leftCandidateId !== value.rightCandidateId, "a candidate cannot be compared with itself");

const DirectorialSearchBase = z.object({
  searchVersion: z.literal(DIRECTORIAL_SEARCH_VERSION),
  id,
  intakeProjectId: id,
  register,
  decision: z.object({ question: reason, successDefinition: reason, viewerMoment: reason }).strict(),
  candidates: z.array(CandidateDraft).min(2).max(4),
  comparisons: z.array(PairwiseDistinction).min(1).max(6),
}).strict();

function refineSearchShape(value: z.infer<typeof DirectorialSearchBase>, ctx: z.RefinementCtx) {
  const candidateIds = value.candidates.map((candidate) => candidate.id);
  if (new Set(candidateIds).size !== candidateIds.length)
    ctx.addIssue({ code: "custom", path: ["candidates"], message: "candidate IDs must be unique" });
  for (const [field, label] of [["directionPath", "Direction paths"], ["probeScorePath", "probe Score paths"]] as const) {
    const paths = value.candidates.map((candidate) => candidate[field]);
    if (new Set(paths).size !== paths.length) ctx.addIssue({ code: "custom", path: ["candidates"], message: `${label} must be unique` });
  }
  const candidateSet = new Set(candidateIds);
  const pairKeys = new Set<string>();
  value.comparisons.forEach((comparison, index) => {
    if (!candidateSet.has(comparison.leftCandidateId) || !candidateSet.has(comparison.rightCandidateId))
      ctx.addIssue({ code: "custom", path: ["comparisons", index], message: "comparison cites an unknown candidate" });
    const key = [comparison.leftCandidateId, comparison.rightCandidateId].sort().join("|");
    if (pairKeys.has(key)) ctx.addIssue({ code: "custom", path: ["comparisons", index], message: `duplicate candidate comparison ${key}` });
    pairKeys.add(key);
  });
  const expectedPairs = candidateIds.length * (candidateIds.length - 1) / 2;
  if (pairKeys.size !== expectedPairs)
    ctx.addIssue({ code: "custom", path: ["comparisons"], message: `all ${expectedPairs} candidate pairs require an explicit distinction` });
  const expectedRoles = value.candidates[0]?.probes.map((probe) => probe.role).join("|");
  const expectedQuestions = new Map(value.candidates[0]?.probes.map((probe) => [probe.role, probe.question]));
  value.candidates.forEach((candidate, index) => {
    if (candidate.probes.map((probe) => probe.role).join("|") !== expectedRoles)
      ctx.addIssue({ code: "custom", path: ["candidates", index, "probes"], message: "all candidates must use the same ordered probe roles" });
    candidate.probes.forEach((probe, probeIndex) => {
      if (probe.question !== expectedQuestions.get(probe.role))
        ctx.addIssue({ code: "custom", path: ["candidates", index, "probes", probeIndex, "question"], message: `probe question for role ${probe.role} must be identical across candidates` });
    });
  });
}
export const DirectorialSearchDraft = DirectorialSearchBase.superRefine(refineSearchShape);
export type DirectorialSearchDraftT = z.infer<typeof DirectorialSearchDraft>;

const LockedCandidate = CandidateDraft.extend({
  directionId: id,
  directionDigest: digest,
  scoreDigest: digest,
  assets: z.array(z.object({ path: projectPath, sha256: digest, bytes: z.number().int().positive() }).strict()).max(128),
}).strict();

export const LockedDirectorialSearch = DirectorialSearchBase.extend({
  intakeDigest: digest,
  candidates: z.array(LockedCandidate).min(2).max(4),
}).strict().superRefine(refineSearchShape);
export type LockedDirectorialSearchT = z.infer<typeof LockedDirectorialSearch>;

const Artifact = z.object({ id, path: projectPath, sha256: digest, bytes: z.number().int().positive() }).strict();
const ProbeArtifact = Artifact.extend({ role: probeRole, question: reason, sceneId: id, directionBeatId: id, offsetMs: z.number().int().min(0) }).strict();
const BlindProbeArtifact = Artifact.extend({ role: probeRole, question: reason }).strict();
const CompactFinding = z.object({ ruleId: z.string().min(2), severity: z.enum(["P1", "P2", "P3"]), path: z.string(), message: z.string().min(1) }).strict();

const BlindProbePacketBody = z.object({
  searchVersion: z.literal(DIRECTORIAL_SEARCH_VERSION),
  searchDigest: digest,
  decision: z.object({ question: reason, successDefinition: reason, viewerMoment: reason }).strict(),
  register,
  candidateCount: z.number().int().min(2).max(4),
  candidates: z.array(z.object({ blindId, probes: z.array(BlindProbeArtifact).min(1).max(3) }).strict()).min(2).max(4),
  reviewContract: z.object({
    firstReadBeforeScoring: z.literal(true),
    candidateIdentityHidden: z.literal(true),
    directionsHidden: z.literal(true),
    mappingHidden: z.literal(true),
    dimensions: z.tuple([
      z.literal("governing-idea-legibility"), z.literal("emotional-charge"), z.literal("visual-hierarchy"),
      z.literal("brand-specificity"), z.literal("narrative-potential"), z.literal("motion-potential"),
    ]),
  }).strict(),
}).strict();
export const BlindProbePacket = BlindProbePacketBody.extend({ packetDigest: digest }).strict();
export type BlindProbePacketT = z.infer<typeof BlindProbePacket>;

const ProbeManifestBody = z.object({
  searchVersion: z.literal(DIRECTORIAL_SEARCH_VERSION),
  searchDigest: digest,
  blindPacket: Artifact,
  contactSheet: Artifact,
  candidates: z.array(z.object({
    candidateId: id, blindId, directionId: id, directionPath: projectPath, directionDigest: digest,
    probeScorePath: projectPath, scoreDigest: digest, probes: z.array(ProbeArtifact).min(1).max(3), findings: z.array(CompactFinding).max(200),
  }).strict()).min(2).max(4),
  pairwise: z.array(z.object({ leftBlindId: blindId, rightBlindId: blindId, role: probeRole, rgbMae: z.number().min(0).max(1) }).strict()).max(18),
  nearDuplicatePairs: z.array(z.object({ leftBlindId: blindId, rightBlindId: blindId, roles: z.array(probeRole).min(1).max(3), reason }).strict()).max(6),
}).strict();
function refineProbeManifest(value: z.infer<typeof ProbeManifestBody> & { manifestDigest: string }, ctx: z.RefinementCtx) {
  const candidateIds = value.candidates.map((candidate) => candidate.candidateId);
  const blindIds = value.candidates.map((candidate) => candidate.blindId);
  const blindSet = new Set(blindIds);
  if (new Set(candidateIds).size !== candidateIds.length)
    ctx.addIssue({ code: "custom", path: ["candidates"], message: "private candidate IDs must be unique" });
  if (blindSet.size !== blindIds.length)
    ctx.addIssue({ code: "custom", path: ["candidates"], message: "blind candidate IDs must be unique" });
  const roles = value.candidates[0]?.probes.map((probe) => probe.role) ?? [];
  const questions = new Map(value.candidates[0]?.probes.map((probe) => [probe.role, probe.question]));
  const evidenceIds = new Set<string>();
  value.candidates.forEach((candidate, candidateIndex) => {
    if (candidate.probes.map((probe) => probe.role).join("|") !== roles.join("|"))
      ctx.addIssue({ code: "custom", path: ["candidates", candidateIndex, "probes"], message: "manifest candidates must expose the same ordered probe roles" });
    candidate.probes.forEach((probe, probeIndex) => {
      if (questions.get(probe.role) !== probe.question)
        ctx.addIssue({ code: "custom", path: ["candidates", candidateIndex, "probes", probeIndex, "question"], message: `manifest probe question for role ${probe.role} must match across candidates` });
      if (evidenceIds.has(probe.id))
        ctx.addIssue({ code: "custom", path: ["candidates", candidateIndex, "probes", probeIndex, "id"], message: `duplicate blind evidence ID ${probe.id}` });
      evidenceIds.add(probe.id);
    });
  });
  const expectedPairs = new Set<string>();
  for (let left = 0; left < blindIds.length; left++) for (let right = left + 1; right < blindIds.length; right++)
    for (const role of roles) expectedPairs.add(`${[blindIds[left], blindIds[right]].sort().join("|")}|${role}`);
  const actualPairs = new Set<string>();
  value.pairwise.forEach((pair, index) => {
    if (!blindSet.has(pair.leftBlindId) || !blindSet.has(pair.rightBlindId) || pair.leftBlindId === pair.rightBlindId)
      ctx.addIssue({ code: "custom", path: ["pairwise", index], message: "pairwise diagnostic must cite two known, different blind candidates" });
    const key = `${[pair.leftBlindId, pair.rightBlindId].sort().join("|")}|${pair.role}`;
    if (actualPairs.has(key)) ctx.addIssue({ code: "custom", path: ["pairwise", index], message: `duplicate pairwise diagnostic ${key}` });
    actualPairs.add(key);
  });
  if ([...expectedPairs].some((key) => !actualPairs.has(key)) || [...actualPairs].some((key) => !expectedPairs.has(key)))
    ctx.addIssue({ code: "custom", path: ["pairwise"], message: "pairwise diagnostics must cover every blind candidate pair and comparable role exactly once" });
  value.nearDuplicatePairs.forEach((pair, index) => {
    if (!blindSet.has(pair.leftBlindId) || !blindSet.has(pair.rightBlindId) || pair.leftBlindId === pair.rightBlindId)
      ctx.addIssue({ code: "custom", path: ["nearDuplicatePairs", index], message: "near-duplicate diagnostic must cite two known, different blind candidates" });
    const roleSet = new Set(pair.roles);
    if (roleSet.size !== pair.roles.length || pair.roles.some((role) => !roles.includes(role)))
      ctx.addIssue({ code: "custom", path: ["nearDuplicatePairs", index, "roles"], message: "near-duplicate roles must be unique comparable roles" });
  });
}
export const DirectorialProbeManifest = ProbeManifestBody.extend({ manifestDigest: digest }).strict().superRefine(refineProbeManifest);
export type DirectorialProbeManifestT = z.infer<typeof DirectorialProbeManifest>;

const DimensionScores = z.object({
  governingIdeaLegibility: z.number().int().min(1).max(5),
  emotionalCharge: z.number().int().min(1).max(5),
  visualHierarchy: z.number().int().min(1).max(5),
  brandSpecificity: z.number().int().min(1).max(5),
  narrativePotential: z.number().int().min(1).max(5),
  motionPotential: z.number().int().min(1).max(5),
}).strict();

export const BlindDirectionSelection = z.object({
  selectionVersion: z.literal(DIRECTION_SELECTION_VERSION),
  probeManifestDigest: digest,
  reviewer: z.object({
    id,
    kind: z.enum(["human", "model", "team"]),
    expertise: z.array(z.enum(["creative-direction", "narrative", "visual-design", "motion-design", "brand", "generalist"])).min(1).max(4)
      .refine((items) => new Set(items).size === items.length, "expertise must be unique"),
    model: z.string().min(1).optional(),
    runId: z.string().min(1),
  }).strict().superRefine((value, ctx) => {
    if (value.kind === "model" && !value.model) ctx.addIssue({ code: "custom", path: ["model"], message: "model reviewer requires model identity" });
    if (value.kind !== "model" && value.model) ctx.addIssue({ code: "custom", path: ["model"], message: "model identity is only valid for model reviewers" });
  }),
  blindness: z.object({
    candidateIdentitySeenBeforeDecision: z.literal(false),
    directionFilesSeenBeforeDecision: z.literal(false),
    privateMappingSeenBeforeDecision: z.literal(false),
  }).strict(),
  candidates: z.array(z.object({
    blindId,
    firstRead: reason,
    intendedFeeling: z.string().min(4),
    achievedFeeling: z.string().min(4),
    strongestQuality: reason,
    concern: reason,
    scores: DimensionScores,
    confidence: z.enum(["low", "medium", "high"]),
    evidenceIds: z.array(id).min(1).max(3),
  }).strict()).min(2).max(4),
  ranking: z.array(blindId).min(2).max(4),
  winner: blindId,
  rationale: reason,
  decisiveEvidenceIds: z.array(id).min(1).max(6),
  rejected: z.array(z.object({ blindId, reason, salvage: z.string().min(8).optional() }).strict()).min(1).max(3),
  uncertainties: z.array(reason).max(6).default([]),
}).strict();
export type BlindDirectionSelectionT = z.infer<typeof BlindDirectionSelection>;

const SelectionReceiptBody = z.object({
  selectionVersion: z.literal(DIRECTION_SELECTION_VERSION),
  searchDigest: digest,
  probeManifestDigest: digest,
  selectionDigest: digest,
  selected: z.object({ candidateId: id, blindId, directionId: id, directionPath: projectPath, directionDigest: digest }).strict(),
  selection: BlindDirectionSelection,
}).strict();
export const DirectionSelectionReceipt = SelectionReceiptBody.extend({ receiptDigest: digest }).strict();
export type DirectionSelectionReceiptT = z.infer<typeof DirectionSelectionReceipt>;

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const intakeDigest = (intake: IntakeT) => sha256(JSON.stringify(Intake.parse(intake)));
export const directionDigest = (direction: DirectionT) => sha256(JSON.stringify(Direction.parse(direction)));
export const scoreDigest = (score: ScoreT) => sha256(JSON.stringify(Score.parse(score)));
export const directorialSearchDigest = (search: LockedDirectorialSearchT) => sha256(JSON.stringify(LockedDirectorialSearch.parse(search)));

function parseProjectJson<T>(projectDir: string, relative: string, schema: z.ZodType<T>, label: string): T {
  const file = resolveProjectAsset(projectDir, relative);
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(file, "utf8")); } catch (error) { throw new Error(`${label} ${relative} is not valid JSON: ${(error as Error).message}`); }
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(`${label} ${relative} is invalid: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return result.data;
}

function assertNoP1(findings: Finding[], label: string) {
  const blockers = findings.filter((finding) => finding.severity === "P1");
  if (blockers.length) throw new Error(`${label} has P1 findings: ${blockers.map((finding) => `${finding.ruleId} ${finding.path}: ${finding.message}`).join("; ")}`);
}

export function lockDirectorialSearch(intakeData: unknown, draftData: unknown, projectDir: string): LockedDirectorialSearchT {
  const intake = Intake.parse(intakeData), draft = DirectorialSearchDraft.parse(draftData);
  if (draft.intakeProjectId !== intake.projectId) throw new Error(`search intakeProjectId ${draft.intakeProjectId} does not match Intake ${intake.projectId}`);
  if (draft.register !== intake.deliverable.register) throw new Error(`search register ${draft.register} does not match Intake ${intake.deliverable.register}`);
  const directions: DirectionT[] = [], governingIdeas = new Set<string>(), visualTheses = new Set<string>(), mechanisms = new Set<string>(), compositions = new Set<string>();
  const candidates = draft.candidates.map((candidate) => {
    const direction = parseProjectJson(projectDir, candidate.directionPath, Direction, "Direction");
    const score = parseProjectJson(projectDir, candidate.probeScorePath, Score, "probe Score");
    directions.push(direction);
    if (direction.trace.intakeProjectId !== intake.projectId) throw new Error(`candidate ${candidate.id} Direction traces to Intake ${direction.trace.intakeProjectId}`);
    if (direction.register !== draft.register || score.meta.register !== draft.register) throw new Error(`candidate ${candidate.id} register does not match search ${draft.register}`);
    assertNoP1(runIntakeDirectionConformance(intake, direction), `candidate ${candidate.id} Intake→Direction`);
    assertNoP1(runStaticGates(score), `candidate ${candidate.id} probe Score`);
    if (direction.deliverable.width != null && direction.deliverable.width !== score.meta.width) throw new Error(`candidate ${candidate.id} probe width does not match Direction`);
    if (direction.deliverable.height != null && direction.deliverable.height !== score.meta.height) throw new Error(`candidate ${candidate.id} probe height does not match Direction`);
    const beats = new Set(direction.scenes.map((beat) => beat.id)), scenes = new Map(score.scenes.map((scene) => [scene.id, scene]));
    for (const probe of candidate.probes) {
      if (!beats.has(probe.directionBeatId)) throw new Error(`candidate ${candidate.id} probe ${probe.id} cites unknown Direction beat ${probe.directionBeatId}`);
      const scene = scenes.get(probe.sceneId);
      if (!scene) throw new Error(`candidate ${candidate.id} probe ${probe.id} cites unknown Score scene ${probe.sceneId}`);
      const lastFrameMs = Math.max(0, scene.durationMs - 1_000 / score.meta.fps);
      if (probe.offsetMs > lastFrameMs) throw new Error(`candidate ${candidate.id} probe ${probe.id} offset ${probe.offsetMs}ms exceeds last decodable scene frame ${Math.floor(lastFrameMs)}ms`);
      const question = normalized(probe.question);
      for (const identity of [candidate.id, direction.id]) {
        const identityText = normalized(identity);
        if (identityText.length >= 4 && question.includes(identityText)) throw new Error(`candidate ${candidate.id} probe ${probe.id} question leaks candidate identity`);
      }
    }
    for (const [set, value, label] of [
      [governingIdeas, direction.creativeConcept.governingIdea, "governing idea"],
      [visualTheses, direction.creativeConcept.visualThesis, "visual thesis"],
      [mechanisms, candidate.hypothesis.narrativeMechanism, "narrative mechanism"],
      [compositions, candidate.hypothesis.heroComposition, "hero composition"],
    ] as Array<[Set<string>, string, string]>) {
      const key = normalized(value);
      if (set.has(key)) throw new Error(`candidate ${candidate.id} repeats another candidate's ${label}`);
      set.add(key);
    }
    const assets = renderInputFiles(score, projectDir).map((file) => {
      const bytes = readFileSync(file);
      return { path: path.relative(realpathSync(projectDir), file).split(path.sep).join("/"), sha256: sha256(bytes), bytes: bytes.length };
    });
    return { ...candidate, directionId: direction.id, directionDigest: directionDigest(direction), scoreDigest: scoreDigest(score), assets };
  });
  if (new Set(directions.map((direction) => direction.id)).size !== directions.length) throw new Error("candidate Direction IDs must be unique");
  return LockedDirectorialSearch.parse({ ...draft, intakeDigest: intakeDigest(intake), candidates });
}

export function verifyLockedDirectorialSearch(intakeData: unknown, searchData: unknown, projectDir: string) {
  const intake = Intake.parse(intakeData), search = LockedDirectorialSearch.parse(searchData);
  if (intakeDigest(intake) !== search.intakeDigest) throw new Error("locked directorial search Intake digest drifted");
  for (const candidate of search.candidates) {
    const direction = parseProjectJson(projectDir, candidate.directionPath, Direction, "Direction");
    const score = parseProjectJson(projectDir, candidate.probeScorePath, Score, "probe Score");
    if (directionDigest(direction) !== candidate.directionDigest) throw new Error(`candidate ${candidate.id} Direction changed after search lock`);
    if (scoreDigest(score) !== candidate.scoreDigest) throw new Error(`candidate ${candidate.id} probe Score changed after search lock`);
    for (const asset of candidate.assets) {
      const file = resolveProjectAsset(projectDir, asset.path), bytes = readFileSync(file);
      if (bytes.length !== asset.bytes || sha256(bytes) !== asset.sha256) throw new Error(`candidate ${candidate.id} probe asset changed after search lock: ${asset.path}`);
    }
  }
  return search;
}

function xml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function label(text: string, width: number, height = 28) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101114"/><text x="10" y="19" font-family="monospace" font-size="12" fill="#f2f2f2">${xml(text)}</text></svg>`);
}
function fileArtifact(root: string, file: string, idValue: string) {
  const bytes = readFileSync(file);
  return { id: idValue, path: path.relative(root, file).split(path.sep).join("/"), sha256: sha256(bytes), bytes: bytes.length };
}
async function rawNormalized(buffer: Buffer) { return sharp(buffer).resize(320, 180, { fit: "contain", background: "#000000" }).removeAlpha().raw().toBuffer(); }
function rgbMae(left: Buffer, right: Buffer) {
  let total = 0;
  for (let index = 0; index < left.length; index++) total += Math.abs(left[index] - right[index]);
  return Number((total / (left.length * 255)).toFixed(6));
}

function verifyManifestBody(manifest: DirectorialProbeManifestT) {
  const { manifestDigest, ...body } = manifest;
  if (sha256(JSON.stringify(ProbeManifestBody.parse(body))) !== manifestDigest) throw new Error("directorial probe manifest digest drifted");
}

function verifyProbeCache(directory: string, manifest: DirectorialProbeManifestT) {
  verifyManifestBody(manifest);
  const artifacts = [manifest.blindPacket, manifest.contactSheet, ...manifest.candidates.flatMap((candidate) => candidate.probes)];
  for (const artifact of artifacts) {
    const file = resolveProjectAsset(directory, artifact.path), bytes = readFileSync(file);
    if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) throw new Error(`directorial probe artifact changed: ${artifact.path}`);
  }
  const packet = BlindProbePacket.parse(JSON.parse(readFileSync(resolveProjectAsset(directory, manifest.blindPacket.path), "utf8")));
  const { packetDigest, ...body } = packet;
  if (sha256(JSON.stringify(BlindProbePacketBody.parse(body))) !== packetDigest) throw new Error("blind probe packet digest drifted");
  if (packet.searchDigest !== manifest.searchDigest || packet.candidateCount !== manifest.candidates.length)
    throw new Error("blind probe packet does not describe the private manifest search");
  const publicCandidates = [...packet.candidates].sort((a, b) => a.blindId.localeCompare(b.blindId));
  const privateCandidates = [...manifest.candidates].sort((a, b) => a.blindId.localeCompare(b.blindId));
  for (let index = 0; index < privateCandidates.length; index++) {
    const privateCandidate = privateCandidates[index], publicCandidate = publicCandidates[index];
    if (!publicCandidate || publicCandidate.blindId !== privateCandidate.blindId)
      throw new Error("blind probe packet candidate inventory drifted from the private manifest");
    const expected = privateCandidate.probes.map(({ id, path, sha256, bytes, role, question }) => ({ id, path, sha256, bytes, role, question }));
    if (JSON.stringify(publicCandidate.probes) !== JSON.stringify(expected))
      throw new Error(`blind probe packet evidence drifted for ${privateCandidate.blindId}`);
  }
}

export async function generateDirectorialProbes(intakeData: unknown, searchData: unknown, projectDir: string, outputRoot: string) {
  const search = verifyLockedDirectorialSearch(intakeData, searchData, projectDir);
  const searchHash = directorialSearchDigest(search);
  const root = path.resolve(outputRoot);
  mkdirSync(root, { recursive: true });
  if (lstatSync(root).isSymbolicLink() || !statSync(root).isDirectory()) throw new Error(`directorial probe root must be a real directory: ${root}`);
  const canonicalRoot = realpathSync(root), directory = path.join(canonicalRoot, searchHash.slice(0, 16)), manifestPath = path.join(directory, "manifest.json");
  if (existsSync(directory)) {
    if (lstatSync(directory).isSymbolicLink() || !statSync(directory).isDirectory()) throw new Error(`directorial probe cache path must be a real directory: ${directory}`);
    if (!existsSync(manifestPath)) throw new Error(`directorial probe directory is incomplete: ${directory}`);
    const manifest = DirectorialProbeManifest.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
    if (manifest.searchDigest !== searchHash) throw new Error("directorial probe cache search digest drifted");
    verifyProbeCache(directory, manifest);
    return { directory, manifestPath, manifest, cached: true };
  }
  const temporary = `${directory}.tmp-${process.pid}`;
  rmSync(temporary, { recursive: true, force: true }); mkdirSync(temporary, { recursive: true });
  try {
    const mappings = search.candidates.map((candidate) => ({ candidate, blindId: `candidate-${sha256(`${searchHash}:${candidate.id}`).slice(0, 8)}` }))
      .sort((left, right) => left.blindId.localeCompare(right.blindId));
    if (new Set(mappings.map((item) => item.blindId)).size !== mappings.length) throw new Error("blind candidate ID collision");
    const candidateResults: DirectorialProbeManifestT["candidates"] = [];
    const rawByBlindRole = new Map<string, Buffer>();
    for (const { candidate, blindId: candidateBlindId } of mappings) {
      const score = parseProjectJson(projectDir, candidate.probeScorePath, Score, "probe Score");
      const staticFindings = runStaticGates(score);
      const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
      const probeArtifacts: z.infer<typeof ProbeArtifact>[] = [];
      let frameFindings: Finding[] = [];
      try {
        frameFindings = await runFrameGates(score, session);
        assertNoP1([...staticFindings, ...frameFindings], `candidate ${candidate.id} rendered probe`);
        for (const probe of candidate.probes) {
          const sceneIndex = score.scenes.findIndex((scene) => scene.id === probe.sceneId);
          const bounds = session.compiled.sceneBoundsMs[sceneIndex];
          const frame = await session.seekAndCapture(bounds.startMs + probe.offsetMs);
          const frameFile = path.join(temporary, `${candidateBlindId}-${probe.role}.png`);
          const width = score.meta.width, height = score.meta.height, labelHeight = 28;
          const labelled = await sharp({ create: { width, height: height + labelHeight, channels: 3, background: "#101114" } })
            .composite([{ input: frame, left: 0, top: 0 }, { input: label(`${candidateBlindId} · ${probe.role}`, width, labelHeight), left: 0, top: height }]).png().toBuffer();
          writeFileSync(frameFile, labelled);
          const artifact = { ...fileArtifact(temporary, frameFile, `${candidateBlindId}-${probe.role}`), role: probe.role, question: probe.question, sceneId: probe.sceneId, directionBeatId: probe.directionBeatId, offsetMs: probe.offsetMs };
          probeArtifacts.push(ProbeArtifact.parse(artifact));
          rawByBlindRole.set(`${candidateBlindId}|${probe.role}`, await rawNormalized(frame));
        }
      } finally { await session.close(); }
      candidateResults.push({ candidateId: candidate.id, blindId: candidateBlindId, directionId: candidate.directionId, directionPath: candidate.directionPath, directionDigest: candidate.directionDigest, probeScorePath: candidate.probeScorePath, scoreDigest: candidate.scoreDigest, probes: probeArtifacts, findings: [...staticFindings, ...frameFindings].map(({ ruleId, severity, path, message }) => ({ ruleId, severity, path, message })) });
    }
    const roles = search.candidates[0].probes.map((probe) => probe.role);
    const pairwise: DirectorialProbeManifestT["pairwise"] = [], nearDuplicatePairs: DirectorialProbeManifestT["nearDuplicatePairs"] = [];
    for (let left = 0; left < candidateResults.length; left++) for (let right = left + 1; right < candidateResults.length; right++) {
      const lowRoles: Array<z.infer<typeof probeRole>> = [];
      for (const role of roles) {
        const value = rgbMae(rawByBlindRole.get(`${candidateResults[left].blindId}|${role}`)!, rawByBlindRole.get(`${candidateResults[right].blindId}|${role}`)!);
        pairwise.push({ leftBlindId: candidateResults[left].blindId, rightBlindId: candidateResults[right].blindId, role, rgbMae: value });
        if (value <= 0.01) lowRoles.push(role);
      }
      if (lowRoles.length === roles.length) nearDuplicatePairs.push({ leftBlindId: candidateResults[left].blindId, rightBlindId: candidateResults[right].blindId, roles: lowRoles, reason: "All comparable probe roles have normalized RGB MAE ≤ 0.01; the rendered search does not establish material visual difference." });
    }
    const cellWidth = 480, labelHeight = 28, cellHeight = Math.round(cellWidth * 9 / 16) + labelHeight, gap = 8;
    const ordered = [...candidateResults].sort((a, b) => a.blindId.localeCompare(b.blindId));
    const contactCells: Buffer[] = [];
    for (const candidate of ordered) for (const role of roles) {
      const artifact = candidate.probes.find((probe) => probe.role === role)!;
      contactCells.push(await sharp(resolveProjectAsset(temporary, artifact.path)).resize(cellWidth, cellHeight, { fit: "contain", background: "#000000" }).png().toBuffer());
    }
    const sheetWidth = roles.length * cellWidth + (roles.length - 1) * gap, sheetHeight = ordered.length * cellHeight + (ordered.length - 1) * gap;
    const contactSheetFile = path.join(temporary, "blind-contact-sheet.png");
    writeFileSync(contactSheetFile, await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: "#000000" } }).composite(contactCells.map((input, index) => ({ input, left: (index % roles.length) * (cellWidth + gap), top: Math.floor(index / roles.length) * (cellHeight + gap) }))).png().toBuffer());
    const packetBody = BlindProbePacketBody.parse({ searchVersion: DIRECTORIAL_SEARCH_VERSION, searchDigest: searchHash, decision: search.decision, register: search.register, candidateCount: ordered.length, candidates: ordered.map((candidate) => ({ blindId: candidate.blindId, probes: candidate.probes.map(({ id, path, sha256, bytes, role, question }) => ({ id, path, sha256, bytes, role, question })) })), reviewContract: { firstReadBeforeScoring: true, candidateIdentityHidden: true, directionsHidden: true, mappingHidden: true, dimensions: ["governing-idea-legibility", "emotional-charge", "visual-hierarchy", "brand-specificity", "narrative-potential", "motion-potential"] } });
    const packet = BlindProbePacket.parse({ ...packetBody, packetDigest: sha256(JSON.stringify(packetBody)) });
    const packetFile = path.join(temporary, "blind-packet.json"); writeFileSync(packetFile, `${JSON.stringify(packet, null, 2)}\n`);
    const body = ProbeManifestBody.parse({ searchVersion: DIRECTORIAL_SEARCH_VERSION, searchDigest: searchHash, blindPacket: fileArtifact(temporary, packetFile, "blind-packet"), contactSheet: fileArtifact(temporary, contactSheetFile, "blind-contact-sheet"), candidates: candidateResults, pairwise, nearDuplicatePairs });
    const manifest = DirectorialProbeManifest.parse({ ...body, manifestDigest: sha256(JSON.stringify(body)) });
    writeFileSync(path.join(temporary, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    renameSync(temporary, directory);
    return { directory, manifestPath, manifest, cached: false };
  } catch (error) { rmSync(temporary, { recursive: true, force: true }); throw error; }
}

export function validateBlindDirectionSelection(manifestData: unknown, selectionData: unknown) {
  const manifest = DirectorialProbeManifest.parse(manifestData), selection = BlindDirectionSelection.parse(selectionData);
  verifyManifestBody(manifest);
  if (selection.probeManifestDigest !== manifest.manifestDigest) throw new Error("selection probeManifestDigest does not match the private probe manifest");
  if (manifest.nearDuplicatePairs.length) throw new Error("blind selection is blocked because the rendered search contains near-duplicate candidate pairs");
  const candidates = new Map(manifest.candidates.map((candidate) => [candidate.blindId, candidate]));
  const expected = [...candidates.keys()].sort(), assessed = selection.candidates.map((candidate) => candidate.blindId).sort(), ranked = [...selection.ranking].sort();
  if (new Set(selection.candidates.map((candidate) => candidate.blindId)).size !== selection.candidates.length || assessed.join("|") !== expected.join("|")) throw new Error("selection must assess every blind candidate exactly once");
  if (new Set(selection.ranking).size !== selection.ranking.length || ranked.join("|") !== expected.join("|")) throw new Error("selection ranking must include every blind candidate exactly once");
  if (selection.ranking[0] !== selection.winner) throw new Error("selection winner must rank first");
  const loserIds = expected.filter((candidateId) => candidateId !== selection.winner);
  if (new Set(selection.rejected.map((item) => item.blindId)).size !== selection.rejected.length || selection.rejected.map((item) => item.blindId).sort().join("|") !== loserIds.join("|")) throw new Error("selection must record one rejection reason for every losing candidate");
  const evidenceIds = new Set(manifest.candidates.flatMap((candidate) => candidate.probes.map((probe) => probe.id)));
  const candidateEvidence = new Map(manifest.candidates.map((candidate) => [candidate.blindId, new Set(candidate.probes.map((probe) => probe.id))]));
  for (const candidate of selection.candidates) for (const evidenceId of candidate.evidenceIds) if (!candidateEvidence.get(candidate.blindId)?.has(evidenceId)) throw new Error(`candidate ${candidate.blindId} cites evidence ${evidenceId} belonging to another candidate`);
  for (const evidenceId of selection.decisiveEvidenceIds) if (!evidenceIds.has(evidenceId)) throw new Error(`selection cites unknown decisive evidence ${evidenceId}`);
  const selected = candidates.get(selection.winner);
  if (!selected) throw new Error(`selection winner ${selection.winner} is unknown`);
  return { manifest, selection, selected };
}

export function makeDirectionSelectionReceipt(manifestData: unknown, selectionData: unknown, evidenceDirectory: string): DirectionSelectionReceiptT {
  const { manifest, selection, selected } = validateBlindDirectionSelection(manifestData, selectionData);
  verifyProbeCache(path.resolve(evidenceDirectory), manifest);
  const selectionHash = sha256(JSON.stringify(selection));
  const body = SelectionReceiptBody.parse({ selectionVersion: DIRECTION_SELECTION_VERSION, searchDigest: manifest.searchDigest, probeManifestDigest: manifest.manifestDigest, selectionDigest: selectionHash, selected: { candidateId: selected.candidateId, blindId: selected.blindId, directionId: selected.directionId, directionPath: selected.directionPath, directionDigest: selected.directionDigest }, selection });
  return DirectionSelectionReceipt.parse({ ...body, receiptDigest: sha256(JSON.stringify(body)) });
}
