import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { resolveProjectAsset } from "../assets/local.js";
import {
  editDigest,
  resolveEdit,
  transcriptDigest,
  verifyTranscriptSources,
  type EditDecisionListT,
  type LockedTranscriptT,
  type ResolvedEditSegment,
} from "./index.js";

export const FOOTAGE_EVIDENCE_VERSION = "0.1.0";

const digest = z.string().regex(/^[0-9a-f]{64}$/, "digest must be SHA-256");
const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case");

export const FootageEvidenceRequest = z.object({
  evidenceVersion: z.literal(FOOTAGE_EVIDENCE_VERSION),
  transcriptDigest: digest,
  editDigest: digest,
  segmentIds: z.array(id).min(1).max(12).refine((items) => new Set(items).size === items.length, "segment IDs must be unique"),
  reason: z.string().min(8),
  contextMs: z.number().int().min(0).max(2_000).default(500),
  samplesPerSegment: z.number().int().min(3).max(9).default(5),
  thumbnailWidth: z.number().int().min(240).max(640).default(400),
  waveform: z.object({
    width: z.number().int().min(600).max(1_600).default(1_000),
    height: z.number().int().min(80).max(300).default(160),
  }).strict().default({ width: 1_000, height: 160 }),
  includeAdjacentCuts: z.boolean().default(true),
}).strict();
export type FootageEvidenceRequestT = z.infer<typeof FootageEvidenceRequest>;

const Artifact = z.object({ path: z.string().min(1), sha256: digest, bytes: z.number().int().positive() }).strict();
const Sample = z.object({ sourceTimeMs: z.number().int().min(0), nearestWordId: id }).strict();
const Metric = z.number().min(0).max(1);

const FootageEvidenceManifestBody = z.object({
  evidenceVersion: z.literal(FOOTAGE_EVIDENCE_VERSION),
  requestDigest: digest,
  transcriptDigest: digest,
  editDigest: digest,
  request: FootageEvidenceRequest,
  sources: z.array(z.object({ id, path: z.string().min(1), sha256: digest }).strict()).min(1),
  segments: z.array(z.object({
    id, sourceId: id, quote: z.string().min(1), startMs: z.number().int().min(0), endMs: z.number().int().positive(),
    samples: z.array(Sample).min(3).max(9), filmstrip: Artifact, waveform: Artifact, hasAudio: z.boolean(),
  }).strict()).min(1).max(12),
  cuts: z.array(z.object({
    id, leftSegmentId: id, rightSegmentId: id, outputTimeMs: z.number().int().positive(),
    leftSourceTimeMs: z.number().int().min(0), rightSourceTimeMs: z.number().int().min(0), strip: Artifact,
    metrics: z.object({ rgbMae: Metric, lumaDelta: Metric, leftRms: Metric.nullable(), rightRms: Metric.nullable(), rmsDelta: Metric.nullable() }).strict(),
  }).strict()).max(23),
}).strict();
export const FootageEvidenceManifest = FootageEvidenceManifestBody.extend({ manifestDigest: digest }).strict();
export type FootageEvidenceManifestT = z.infer<typeof FootageEvidenceManifest>;

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const requestDigest = (request: FootageEvidenceRequestT) => sha256(JSON.stringify(FootageEvidenceRequest.parse(request)));
const seconds = (ms: number) => (ms / 1_000).toFixed(3);
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runBuffer(bin: string, args: string[], label: string): Buffer {
  const result = spawnSync(bin, args, { encoding: "buffer", maxBuffer: 1 << 27 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed: ${result.stderr.toString("utf8").slice(-800)}`);
  return result.stdout;
}

function sourceFrame(file: string, timeMs: number) {
  return runBuffer("ffmpeg", ["-v", "error", "-ss", seconds(timeMs), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], `frame extraction at ${timeMs}ms`);
}

function label(text: string, width: number, height = 28) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101114"/><text x="10" y="19" font-family="monospace" font-size="12" fill="#f2f2f2">${escapeXml(text)}</text></svg>`);
}

function nearestWordId(transcript: LockedTranscriptT, sourceId: string, timeMs: number) {
  const tokens = transcript.tokens.filter((token) => token.sourceId === sourceId);
  let nearest = tokens[0];
  let distance = Number.POSITIVE_INFINITY;
  for (const token of tokens) {
    const center = (token.startMs + token.endMs) / 2;
    const candidate = Math.abs(center - timeMs);
    if (candidate < distance) { nearest = token; distance = candidate; }
  }
  return nearest.id;
}

function evenlySpaced(startMs: number, endMs: number, count: number) {
  if (count === 1) return [Math.round((startMs + endMs) / 2)];
  return Array.from({ length: count }, (_, index) => Math.round(startMs + (endMs - startMs) * index / (count - 1)));
}

async function filmstrip(transcript: LockedTranscriptT, segment: ResolvedEditSegment, file: string, startMs: number, endMs: number, count: number, width: number) {
  const source = transcript.sources.find((item) => item.id === segment.sourceId)!;
  const height = Math.max(120, Math.min(360, Math.round(width * source.media.height / source.media.width)));
  const gap = 6, labelHeight = 28;
  const lastFrameMs = Math.max(0, source.media.durationMs - 1_000 / source.media.fps);
  const sampleStartMs = Math.min(startMs, lastFrameMs), sampleEndMs = Math.max(sampleStartMs, Math.min(endMs, lastFrameMs));
  const times = evenlySpaced(sampleStartMs, sampleEndMs, count);
  const cells: Buffer[] = [];
  const samples: Array<{ sourceTimeMs: number; nearestWordId: string }> = [];
  for (const timeMs of times) {
    const wordId = nearestWordId(transcript, segment.sourceId, timeMs);
    const frame = await sharp(sourceFrame(file, timeMs)).resize(width, height, { fit: "contain", background: "#000000" }).png().toBuffer();
    cells.push(await sharp({ create: { width, height: height + labelHeight, channels: 3, background: "#101114" } })
      .composite([{ input: frame, left: 0, top: 0 }, { input: label(`${segment.sourceId} · ${wordId} · ${seconds(timeMs)}s`, width, labelHeight), left: 0, top: height }]).png().toBuffer());
    samples.push({ sourceTimeMs: timeMs, nearestWordId: wordId });
  }
  const canvasWidth = width * cells.length + gap * (cells.length - 1);
  const output = await sharp({ create: { width: canvasWidth, height: height + labelHeight, channels: 3, background: "#000000" } })
    .composite(cells.map((input, index) => ({ input, left: index * (width + gap), top: 0 }))).png().toBuffer();
  return { output, samples };
}

async function waveform(file: string, hasAudio: boolean, startMs: number, endMs: number, width: number, height: number, sourceId: string) {
  const labelHeight = 28;
  let picture: Buffer;
  if (hasAudio) {
    picture = runBuffer("ffmpeg", ["-v", "error", "-ss", seconds(startMs), "-i", file, "-t", seconds(endMs - startMs), "-filter_complex", `showwavespic=s=${width}x${height}:split_channels=0:colors=0x8b5cf6`, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], `waveform extraction for ${sourceId}`);
  } else {
    picture = await sharp({ create: { width, height, channels: 3, background: "#15161a" } })
      .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="#50535c" stroke-width="2"/><text x="${width / 2}" y="${height / 2 - 10}" text-anchor="middle" font-family="monospace" font-size="14" fill="#a8abb5">SILENT SOURCE</text></svg>`), left: 0, top: 0 }]).png().toBuffer();
  }
  return sharp({ create: { width, height: height + labelHeight, channels: 3, background: "#101114" } })
    .composite([{ input: await sharp(picture).resize(width, height, { fit: "fill" }).png().toBuffer(), left: 0, top: 0 }, { input: label(`${sourceId} · ${seconds(startMs)}-${seconds(endMs)}s`, width, labelHeight), left: 0, top: height }]).png().toBuffer();
}

async function normalizedFrame(file: string, timeMs: number, width: number, height: number) {
  return sharp(sourceFrame(file, timeMs)).resize(width, height, { fit: "contain", background: "#000000" }).removeAlpha().raw().toBuffer();
}

function visualMetrics(left: Buffer, right: Buffer) {
  let mae = 0, leftLuma = 0, rightLuma = 0;
  const pixels = left.length / 3;
  for (let index = 0; index < left.length; index += 3) {
    mae += Math.abs(left[index] - right[index]) + Math.abs(left[index + 1] - right[index + 1]) + Math.abs(left[index + 2] - right[index + 2]);
    leftLuma += 0.2126 * left[index] + 0.7152 * left[index + 1] + 0.0722 * left[index + 2];
    rightLuma += 0.2126 * right[index] + 0.7152 * right[index + 1] + 0.0722 * right[index + 2];
  }
  return { rgbMae: Number((mae / (left.length * 255)).toFixed(6)), lumaDelta: Number((Math.abs(leftLuma - rightLuma) / (pixels * 255)).toFixed(6)) };
}

function audioRms(file: string, hasAudio: boolean, startMs: number, endMs: number): number | null {
  if (!hasAudio || endMs <= startMs) return null;
  const pcm = runBuffer("ffmpeg", ["-v", "error", "-ss", seconds(startMs), "-i", file, "-t", seconds(endMs - startMs), "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1"], "audio evidence extraction");
  const count = Math.floor(pcm.length / 4);
  if (!count) return 0;
  let sum = 0;
  for (let offset = 0; offset < count * 4; offset += 4) { const value = pcm.readFloatLE(offset); sum += value * value; }
  return Number(Math.min(1, Math.sqrt(sum / count)).toFixed(6));
}

function artifact(root: string, file: string) {
  const bytes = readFileSync(file);
  return { path: path.relative(root, file).split(path.sep).join("/"), sha256: sha256(bytes), bytes: bytes.length };
}

function verifyCached(root: string, manifest: FootageEvidenceManifestT, expectedRequestDigest: string) {
  if (manifest.requestDigest !== expectedRequestDigest) throw new Error("cached footage evidence request digest drifted");
  const { manifestDigest, ...body } = manifest;
  if (sha256(JSON.stringify(FootageEvidenceManifestBody.parse(body))) !== manifestDigest)
    throw new Error("cached footage evidence manifest digest drifted");
  const artifacts = [...manifest.segments.flatMap((item) => [item.filmstrip, item.waveform]), ...manifest.cuts.map((item) => item.strip)];
  for (const item of artifacts) {
    const file = resolveProjectAsset(root, item.path);
    const bytes = readFileSync(file);
    if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256) throw new Error(`cached footage evidence artifact changed: ${item.path}`);
  }
}

export async function generateFootageEvidence(transcript: LockedTranscriptT, edit: EditDecisionListT, requestData: unknown, projectDir: string, outputRoot: string): Promise<{ directory: string; manifestPath: string; manifest: FootageEvidenceManifestT; cached: boolean }> {
  const request = FootageEvidenceRequest.parse(requestData);
  if (request.transcriptDigest !== transcriptDigest(transcript)) throw new Error("footage evidence transcriptDigest does not match the locked transcript");
  if (request.editDigest !== editDigest(edit)) throw new Error("footage evidence editDigest does not match the EDL");
  verifyTranscriptSources(transcript, projectDir);
  const resolved = resolveEdit(transcript, edit);
  const segmentMap = new Map(resolved.map((segment) => [segment.id, segment]));
  for (const segmentId of request.segmentIds) if (!segmentMap.has(segmentId)) throw new Error(`footage evidence cites unknown segment ${segmentId}`);
  const selected = new Set(request.segmentIds);
  const selectedSegments = request.segmentIds.map((segmentId) => segmentMap.get(segmentId)!);
  for (const segment of selectedSegments) {
    const source = transcript.sources.find((item) => item.id === segment.sourceId)!;
    const startMs = Math.max(0, segment.startMs - request.contextMs), endMs = Math.min(source.media.durationMs, segment.endMs + request.contextMs);
    if (endMs - startMs > 60_000) throw new Error(`footage evidence range ${segment.id} exceeds 60000ms; choose a narrower EDL segment`);
  }

  const normalizedDigest = requestDigest(request);
  const root = path.resolve(outputRoot);
  mkdirSync(root, { recursive: true });
  if (lstatSync(root).isSymbolicLink()) throw new Error(`footage evidence root cannot be a symlink: ${root}`);
  if (!statSync(root).isDirectory()) throw new Error(`footage evidence root is not a directory: ${root}`);
  const canonicalRoot = realpathSync(root);
  const directory = path.join(canonicalRoot, normalizedDigest.slice(0, 16));
  const manifestPath = path.join(directory, "manifest.json");
  if (existsSync(directory)) {
    if (lstatSync(directory).isSymbolicLink()) throw new Error(`footage evidence directory cannot be a symlink: ${directory}`);
    if (!statSync(directory).isDirectory()) throw new Error(`footage evidence cache path is not a directory: ${directory}`);
    if (!existsSync(manifestPath)) throw new Error(`footage evidence directory is incomplete: ${directory}`);
    const manifest = FootageEvidenceManifest.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
    verifyCached(directory, manifest, normalizedDigest);
    return { directory, manifestPath, manifest, cached: true };
  }

  const temporary = `${directory}.tmp-${process.pid}`;
  rmSync(temporary, { recursive: true, force: true });
  mkdirSync(temporary, { recursive: true });
  try {
    const segmentEvidence: FootageEvidenceManifestT["segments"] = [];
    for (const segment of selectedSegments) {
      const source = transcript.sources.find((item) => item.id === segment.sourceId)!;
      const sourceFile = resolveProjectAsset(projectDir, source.path);
      const startMs = Math.max(0, segment.startMs - request.contextMs), endMs = Math.min(source.media.durationMs, segment.endMs + request.contextMs);
      const strip = await filmstrip(transcript, segment, sourceFile, startMs, endMs, request.samplesPerSegment, request.thumbnailWidth);
      const stripFile = path.join(temporary, `segment-${segment.id}-filmstrip.png`);
      writeFileSync(stripFile, strip.output);
      const waveformFile = path.join(temporary, `segment-${segment.id}-waveform.png`);
      writeFileSync(waveformFile, await waveform(sourceFile, source.media.hasAudio, startMs, endMs, request.waveform.width, request.waveform.height, source.id));
      segmentEvidence.push({ id: segment.id, sourceId: segment.sourceId, quote: segment.quote, startMs, endMs, samples: strip.samples, filmstrip: artifact(temporary, stripFile), waveform: artifact(temporary, waveformFile), hasAudio: source.media.hasAudio });
    }

    const cuts: FootageEvidenceManifestT["cuts"] = [];
    if (request.includeAdjacentCuts) {
      let outputTimeMs = 0;
      for (let index = 0; index < resolved.length - 1; index++) {
        const left = resolved[index], right = resolved[index + 1];
        outputTimeMs += left.durationMs;
        if (!selected.has(left.id) && !selected.has(right.id)) continue;
        const leftSource = transcript.sources.find((item) => item.id === left.sourceId)!;
        const rightSource = transcript.sources.find((item) => item.id === right.sourceId)!;
        const leftFile = resolveProjectAsset(projectDir, leftSource.path), rightFile = resolveProjectAsset(projectDir, rightSource.path);
        const leftFrameMs = 1_000 / leftSource.media.fps, rightFrameMs = 1_000 / rightSource.media.fps;
        const leftTimes = [Math.max(left.startMs, left.endMs - 100), Math.max(left.startMs, left.endMs - leftFrameMs)].map(Math.round);
        const rightTimes = [Math.min(right.endMs, right.startMs + rightFrameMs), Math.min(right.endMs, right.startMs + 100)].map(Math.round);
        const frameWidth = request.thumbnailWidth, frameHeight = Math.round(frameWidth * 9 / 16), labelHeight = 28, gap = 6;
        const cells: Buffer[] = [];
        for (const [side, sourceFile, times] of [[left.id, leftFile, leftTimes], [right.id, rightFile, rightTimes]] as const) for (const timeMs of times) {
          const picture = await sharp(sourceFrame(sourceFile, timeMs)).resize(frameWidth, frameHeight, { fit: "contain", background: "#000000" }).png().toBuffer();
          cells.push(await sharp({ create: { width: frameWidth, height: frameHeight + labelHeight, channels: 3, background: "#101114" } }).composite([{ input: picture, left: 0, top: 0 }, { input: label(`${side} · ${seconds(timeMs)}s`, frameWidth, labelHeight), left: 0, top: frameHeight }]).png().toBuffer());
        }
        const stripWidth = frameWidth * 4 + gap * 3;
        const strip = await sharp({ create: { width: stripWidth, height: frameHeight + labelHeight, channels: 3, background: "#000000" } }).composite(cells.map((input, cellIndex) => ({ input, left: cellIndex * (frameWidth + gap), top: 0 }))).png().toBuffer();
        const cutId = `${left.id}-to-${right.id}`;
        const stripFile = path.join(temporary, `cut-${cutId}.png`);
        writeFileSync(stripFile, strip);
        const metricWidth = 320, metricHeight = 180;
        const leftRaw = await normalizedFrame(leftFile, leftTimes[1], metricWidth, metricHeight), rightRaw = await normalizedFrame(rightFile, rightTimes[0], metricWidth, metricHeight);
        const visual = visualMetrics(leftRaw, rightRaw);
        const leftRms = audioRms(leftFile, leftSource.media.hasAudio, Math.max(left.startMs, left.endMs - 100), left.endMs);
        const rightRms = audioRms(rightFile, rightSource.media.hasAudio, right.startMs, Math.min(right.endMs, right.startMs + 100));
        cuts.push({ id: cutId, leftSegmentId: left.id, rightSegmentId: right.id, outputTimeMs, leftSourceTimeMs: leftTimes[1], rightSourceTimeMs: rightTimes[0], strip: artifact(temporary, stripFile), metrics: { ...visual, leftRms, rightRms, rmsDelta: leftRms === null || rightRms === null ? null : Number(Math.abs(leftRms - rightRms).toFixed(6)) } });
      }
    }
    const body = FootageEvidenceManifestBody.parse({ evidenceVersion: FOOTAGE_EVIDENCE_VERSION, requestDigest: normalizedDigest, transcriptDigest: request.transcriptDigest, editDigest: request.editDigest, request, sources: transcript.sources.map((source) => ({ id: source.id, path: source.path, sha256: source.sha256 })), segments: segmentEvidence, cuts });
    const manifest = FootageEvidenceManifest.parse({ ...body, manifestDigest: sha256(JSON.stringify(body)) });
    writeFileSync(path.join(temporary, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    renameSync(temporary, directory);
    return { directory, manifestPath, manifest, cached: false };
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}
