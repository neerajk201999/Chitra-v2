import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { validateScore, type ScoreT } from "../ir/schema.js";
import { renderInputFiles, scoreHash, type Quality } from "../render/index.js";

const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
export const sha256File = (file: string) => sha256(readFileSync(file));

export interface ReleaseArtifacts {
  intake: string;
  direction: string;
  storyboard: string;
  score: string;
}

export interface ReleaseFingerprint {
  files: Record<keyof ReleaseArtifacts, { path: string; sha256: string }>;
  renderHash: string;
  inputHash: string;
}

function canonicalPath(file: string): string {
  const suffix: string[] = [];
  let cursor = path.resolve(file);
  while (!existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(realpathSync(cursor), ...suffix);
}

export function assertReleaseTargets(
  artifacts: ReleaseArtifacts,
  score: ScoreT,
  projectDir: string,
  targets: { out: string; evidence: string; receipt: string }
): void {
  const protectedFiles = new Set([
    ...Object.values(artifacts).map(canonicalPath),
    ...renderInputFiles(score, projectDir).map(canonicalPath),
  ]);
  const out = canonicalPath(targets.out);
  const receipt = canonicalPath(targets.receipt);
  const evidence = canonicalPath(targets.evidence);
  const contains = (parent: string, child: string) => {
    const relative = path.relative(parent, child);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
  };
  for (const [label, target] of [["video", out], ["receipt", receipt]] as const)
    if (protectedFiles.has(target)) throw new Error(`release ${label} path would overwrite an input: ${target}`);
  for (const input of protectedFiles) {
    if (contains(evidence, input))
      throw new Error(`release evidence directory contains an input and could overwrite it: ${input}`);
  }
  const targetPaths = [["video", out], ["receipt", receipt], ["evidence", evidence]] as const;
  for (let index = 0; index < targetPaths.length; index++) {
    for (let other = index + 1; other < targetPaths.length; other++) {
      const [label, target] = targetPaths[index];
      const [otherLabel, otherTarget] = targetPaths[other];
      if (contains(target, otherTarget) || contains(otherTarget, target))
        throw new Error(`release ${label} and ${otherLabel} paths must be separate, not nested`);
    }
  }
}

export function releaseFingerprint(
  artifacts: ReleaseArtifacts,
  score: ScoreT,
  projectDir: string,
  tool: { packageVersion: string; compilerCacheVersion: string }
): ReleaseFingerprint {
  const files = Object.fromEntries(Object.entries(artifacts).map(([key, file]) => {
    const absolute = path.resolve(file);
    if (!existsSync(absolute)) throw new Error(`release input not found: ${absolute}`);
    return [key, { path: absolute, sha256: sha256File(absolute) }];
  })) as ReleaseFingerprint["files"];
  const renderHash = scoreHash(score, projectDir);
  const inputHash = sha256(JSON.stringify({
    tool,
    files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, value.sha256])),
    renderHash,
  }));
  return { files, renderHash, inputHash };
}

const audioMeasurement = z.discriminatedUnion("status", [
  z.object({ status: z.literal("missing") }),
  z.object({
    status: z.literal("present"),
    integratedLufs: z.number().nullable(),
    truePeakDbtp: z.number().nullable(),
    loudnessRangeLu: z.number().nullable(),
    thresholdLufs: z.number().nullable(),
    targetOffsetLu: z.number().nullable(),
  }),
]);

export const ReleaseReceiptSchema = z.object({
  receiptVersion: z.literal("0.1.0"),
  releaseId: z.string().regex(/^[a-f0-9]{16}$/),
  tool: z.object({ packageVersion: z.string().min(1), compilerCacheVersion: z.string().min(1) }),
  quality: z.enum(["draft", "standard", "high"]),
  inputs: z.object({
    files: z.object({
      intake: z.object({ path: z.string().min(1), sha256: z.string().length(64) }),
      direction: z.object({ path: z.string().min(1), sha256: z.string().length(64) }),
      storyboard: z.object({ path: z.string().min(1), sha256: z.string().length(64) }),
      score: z.object({ path: z.string().min(1), sha256: z.string().length(64) }),
    }),
    renderHash: z.string().length(64),
    inputHash: z.string().length(64),
  }),
  gates: z.object({
    findings: z.array(z.object({
      ruleId: z.string(), severity: z.enum(["P1", "P2", "P3"]), path: z.string(), message: z.string(), timecodeMs: z.number().optional(),
    })),
    summary: z.object({ p1: z.number().int(), p2: z.number().int(), p3: z.number().int(), releasable: z.boolean() }),
    sampledFrames: z.number().int().positive(),
    maxIntervalMs: z.number().positive(),
  }),
  render: z.object({
    path: z.string().min(1), sha256: z.string().length(64), durationMs: z.number().int().positive(), frames: z.number().int().positive(),
    width: z.number().int().positive(), height: z.number().int().positive(), fps: z.number().positive(), audio: audioMeasurement,
  }),
  evidence: z.array(z.object({ path: z.string().min(1), sha256: z.string().length(64) })).min(1),
});
export type ReleaseReceipt = z.infer<typeof ReleaseReceiptSchema>;

const relative = (base: string, file: string) => path.relative(base, path.resolve(file)) || ".";

export function makeReleaseReceipt(args: {
  receiptFile: string;
  fingerprint: ReleaseFingerprint;
  tool: ReleaseReceipt["tool"];
  quality: Quality;
  findings: ReleaseReceipt["gates"]["findings"];
  summary: ReleaseReceipt["gates"]["summary"];
  sampledFrames: number;
  maxIntervalMs: number;
  render: Omit<ReleaseReceipt["render"], "path" | "sha256"> & { path: string };
  evidenceFiles: string[];
}): ReleaseReceipt {
  const base = path.dirname(path.resolve(args.receiptFile));
  const receipt: ReleaseReceipt = {
    receiptVersion: "0.1.0",
    releaseId: args.fingerprint.inputHash.slice(0, 16),
    tool: args.tool,
    quality: args.quality,
    inputs: {
      files: Object.fromEntries(Object.entries(args.fingerprint.files).map(([key, value]) => [key, { path: relative(base, value.path), sha256: value.sha256 }])) as ReleaseReceipt["inputs"]["files"],
      renderHash: args.fingerprint.renderHash,
      inputHash: args.fingerprint.inputHash,
    },
    gates: { findings: args.findings, summary: args.summary, sampledFrames: args.sampledFrames, maxIntervalMs: args.maxIntervalMs },
    render: { ...args.render, path: relative(base, args.render.path), sha256: sha256File(args.render.path) },
    evidence: args.evidenceFiles.map((file) => ({ path: relative(base, file), sha256: sha256File(file) })),
  };
  return ReleaseReceiptSchema.parse(receipt);
}

export function verifyReleaseReceipt(receiptFile: string): { ok: boolean; issues: string[]; receipt?: ReleaseReceipt } {
  const absolute = path.resolve(receiptFile);
  if (!existsSync(absolute)) return { ok: false, issues: [`receipt not found: ${absolute}`] };
  let receipt: ReleaseReceipt;
  try { receipt = ReleaseReceiptSchema.parse(JSON.parse(readFileSync(absolute, "utf8"))); }
  catch (error) { return { ok: false, issues: [`invalid release receipt: ${(error as Error).message}`] }; }
  const base = path.dirname(absolute);
  const issues: string[] = [];
  const artifacts = {} as ReleaseArtifacts;
  for (const key of ["intake", "direction", "storyboard", "score"] as const) {
    const binding = receipt.inputs.files[key];
    const file = path.resolve(base, binding.path);
    artifacts[key] = file;
    if (!existsSync(file)) issues.push(`${key} input is missing: ${file}`);
    else if (sha256File(file) !== binding.sha256) issues.push(`${key} input hash changed`);
  }
  if (!issues.some((issue) => issue.includes("input is missing"))) {
    try {
      const raw = JSON.parse(readFileSync(artifacts.score, "utf8"));
      const parsed = validateScore(raw);
      if (!parsed.ok) issues.push("score no longer validates");
      else {
        const fingerprint = releaseFingerprint(artifacts, parsed.score, path.dirname(artifacts.score), receipt.tool);
        if (fingerprint.renderHash !== receipt.inputs.renderHash) issues.push("resolved render inputs changed");
        if (fingerprint.inputHash !== receipt.inputs.inputHash) issues.push("release input hash is stale");
      }
    } catch (error) { issues.push(`cannot re-evaluate release inputs: ${(error as Error).message}`); }
  }
  const boundFiles = [{ label: "render", ...receipt.render }, ...receipt.evidence.map((item, index) => ({ label: `evidence[${index}]`, ...item }))];
  for (const item of boundFiles) {
    const file = path.resolve(base, item.path);
    if (!existsSync(file)) issues.push(`${item.label} is missing: ${file}`);
    else if (sha256File(file) !== item.sha256) issues.push(`${item.label} hash changed`);
  }
  if (receipt.releaseId !== receipt.inputs.inputHash.slice(0, 16)) issues.push("release ID does not match its input hash");
  return { ok: issues.length === 0, issues, receipt };
}
