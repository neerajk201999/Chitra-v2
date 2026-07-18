import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { resolveProjectAsset } from "../assets/local.js";

export const TRANSCRIPT_VERSION = "0.1.0";
export const EDIT_VERSION = "0.1.0";
export const EDIT_RECEIPT_VERSION = "0.1.0";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case");
const digest = z.string().regex(/^[0-9a-f]{64}$/, "digest must be SHA-256");
const reason = z.string().min(8);
const projectAssetPath = z.string().min(1).refine((value) => {
  const parts = value.split("/");
  return !value.startsWith("/") && !value.includes("\\") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}, "source path must be a normalized project-relative POSIX path without traversal");

const MediaFacts = z.object({
  durationMs: z.number().int().min(1).max(86_400_000),
  hasAudio: z.boolean(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  fps: z.number().positive().max(240),
}).strict();

const TranscriptSourceBase = z.object({
  id,
  path: projectAssetPath,
  intakeSourceId: id,
  rights: z.enum(["owned", "licensed"]),
}).strict();
const TranscriptSourceInput = TranscriptSourceBase.extend({
  sha256: digest.optional(),
  bytes: z.number().int().positive().optional(),
  media: MediaFacts.optional(),
}).strict();
const LockedTranscriptSource = TranscriptSourceBase.extend({
  sha256: digest,
  bytes: z.number().int().positive(),
  media: MediaFacts,
}).strict();

const TranscriptToken = z.object({
  id,
  sourceId: id,
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  text: z.string().min(1).max(300).refine((value) => value.trim().length > 0, "token text cannot be whitespace"),
  speakerId: id.optional(),
  kind: z.enum(["speech", "filler", "event"]).default("speech"),
  confidence: z.number().min(0).max(1).optional(),
}).strict().refine((value) => value.endMs > value.startMs, "token endMs must be after startMs");

function transcriptSchema<T extends z.ZodTypeAny>(source: T, locked: boolean) {
  return z.object({
    transcriptVersion: z.literal(TRANSCRIPT_VERSION),
    projectId: id,
    language: z.string().min(2).max(35),
    provider: z.object({
      name: z.string().min(1),
      model: z.string().min(1),
      version: z.string().min(1).optional(),
    }).strict(),
    sources: z.array(source).min(1).max(100),
    tokens: z.array(TranscriptToken).min(1).max(200_000),
  }).strict().superRefine((value, ctx) => {
    const sourceIds = new Set<string>();
    value.sources.forEach((item: any, index) => {
      if (sourceIds.has(item.id)) ctx.addIssue({ code: "custom", path: ["sources", index, "id"], message: `duplicate source ${item.id}` });
      sourceIds.add(item.id);
    });
    const tokenIds = new Set<string>();
    const bySource = new Map<string, Array<{ token: any; index: number }>>();
    value.tokens.forEach((token, index) => {
      if (tokenIds.has(token.id)) ctx.addIssue({ code: "custom", path: ["tokens", index, "id"], message: `duplicate token ${token.id}` });
      tokenIds.add(token.id);
      if (!sourceIds.has(token.sourceId)) ctx.addIssue({ code: "custom", path: ["tokens", index, "sourceId"], message: `unknown source ${token.sourceId}` });
      const list = bySource.get(token.sourceId) ?? [];
      list.push({ token, index }); bySource.set(token.sourceId, list);
    });
    value.sources.forEach((sourceItem: any, sourceIndex) => {
      const items = bySource.get(sourceItem.id) ?? [];
      if (!items.length) ctx.addIssue({ code: "custom", path: ["sources", sourceIndex], message: `source ${sourceItem.id} has no addressable tokens` });
      let previousEnd = -1;
      for (const { token, index } of items) {
        if (token.startMs < previousEnd)
          ctx.addIssue({ code: "custom", path: ["tokens", index, "startMs"], message: `tokens for ${sourceItem.id} must be ordered and non-overlapping` });
        previousEnd = Math.max(previousEnd, token.endMs);
        if (locked && sourceItem.media && token.endMs > sourceItem.media.durationMs)
          ctx.addIssue({ code: "custom", path: ["tokens", index, "endMs"], message: `token exceeds source duration ${sourceItem.media.durationMs}ms` });
      }
    });
  });
}

export const TranscriptDraft = transcriptSchema(TranscriptSourceInput, false);
export const LockedTranscript = transcriptSchema(LockedTranscriptSource, true);
export type TranscriptDraftT = z.infer<typeof TranscriptDraft>;
export type LockedTranscriptT = z.infer<typeof LockedTranscript>;

const EditSegment = z.object({
  id,
  sourceId: id,
  startWordId: id,
  endWordId: id,
  preRollMs: z.number().int().min(0).max(250).default(30),
  postRollMs: z.number().int().min(0).max(250).default(80),
  beat: z.string().min(2),
  quote: z.string().min(1),
  reason,
}).strict();

export const EditDecisionList = z.object({
  editVersion: z.literal(EDIT_VERSION),
  title: z.string().min(1),
  transcriptDigest: digest,
  output: z.object({
    width: z.number().int().min(320).max(3840),
    height: z.number().int().min(320).max(3840),
    fps: z.number().int().min(12).max(60),
    audioFadeMs: z.number().int().min(10).max(100).default(30),
    audioTargetLufs: z.number().min(-24).max(-8).default(-14),
  }).strict(),
  segments: z.array(EditSegment).min(1).max(120),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.segments.forEach((segment, index) => {
    if (seen.has(segment.id)) ctx.addIssue({ code: "custom", path: ["segments", index, "id"], message: `duplicate segment ${segment.id}` });
    seen.add(segment.id);
  });
});
export type EditDecisionListT = z.infer<typeof EditDecisionList>;

export function validateTranscript(data: unknown, locked = false) {
  const result = (locked ? LockedTranscript : TranscriptDraft).safeParse(data);
  if (result.success) return { ok: true as const, transcript: result.data };
  return { ok: false as const, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

export function validateEditDecisionList(data: unknown) {
  const result = EditDecisionList.safeParse(data);
  if (result.success) return { ok: true as const, edit: result.data };
  return { ok: false as const, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

function mediaFacts(file: string) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" });
  if (probe.error) throw probe.error;
  if (probe.status !== 0) throw new Error(`ffprobe failed for ${file}: ${(probe.stderr ?? "").slice(-500)}`);
  const data = JSON.parse(probe.stdout) as { streams?: Array<Record<string, unknown>>; format?: Record<string, unknown> };
  const video = data.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`transcript source has no video stream: ${file}`);
  const durationSeconds = Number(data.format?.duration ?? video.duration);
  const [num, den] = String(video.avg_frame_rate ?? video.r_frame_rate ?? "0/1").split("/").map(Number);
  const fps = den ? num / den : 0;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(fps) || fps <= 0)
    throw new Error(`source duration/FPS is not measurable: ${file}`);
  return {
    durationMs: Math.round(durationSeconds * 1000),
    hasAudio: !!data.streams?.some((stream) => stream.codec_type === "audio"),
    width: Number(video.width), height: Number(video.height), fps: Number(fps.toFixed(6)),
  };
}

export function lockTranscript(data: unknown, projectDir: string): LockedTranscriptT {
  const parsed = TranscriptDraft.parse(data);
  const sources = parsed.sources.map((source) => {
    const file = resolveProjectAsset(projectDir, source.path);
    const bytes = readFileSync(file);
    return { ...source, sha256: sha256(bytes), bytes: bytes.length, media: mediaFacts(file) };
  });
  return LockedTranscript.parse({ ...parsed, sources });
}

export function transcriptDigest(transcript: LockedTranscriptT) {
  return sha256(JSON.stringify(LockedTranscript.parse(transcript)));
}

const cleanText = (tokens: Array<{ text: string }>) => tokens.map((token) => token.text.trim()).join(" ")
  .replace(/\s+([,.!?;:])/g, "$1").replace(/\s+/g, " ").trim();
const timecode = (ms: number) => `${String(Math.floor(ms / 60_000)).padStart(2, "0")}:${(ms % 60_000 / 1000).toFixed(3).padStart(6, "0")}`;

export function packTranscript(transcript: LockedTranscriptT, options: { sourceIds?: string[]; maxChars?: number; gapMs?: number } = {}) {
  const maxChars = Math.max(1000, Math.min(options.maxChars ?? 50_000, 200_000));
  const gapMs = Math.max(100, Math.min(options.gapMs ?? 500, 5000));
  const requested = new Set(options.sourceIds ?? transcript.sources.map((source) => source.id));
  for (const sourceId of requested)
    if (!transcript.sources.some((source) => source.id === sourceId)) throw new Error(`unknown transcript source ${sourceId}`);
  const lines = [`# Chitra transcript pack 0.1`, `transcript-digest: ${transcriptDigest(transcript)}`, ""];
  for (const source of transcript.sources.filter((item) => requested.has(item.id))) {
    lines.push(`## ${source.id} · ${source.path}`);
    const tokens = transcript.tokens.filter((token) => token.sourceId === source.id);
    let phrase: typeof tokens = [];
    const flush = () => {
      if (!phrase.length) return;
      const speaker = phrase[0].speakerId ? ` ${phrase[0].speakerId}` : "";
      lines.push(`[${phrase[0].id}..${phrase.at(-1)!.id} ${timecode(phrase[0].startMs)}-${timecode(phrase.at(-1)!.endMs)}]${speaker} ${cleanText(phrase)}`);
      phrase = [];
    };
    for (const token of tokens) {
      const previous = phrase.at(-1);
      if (previous && (token.startMs - previous.endMs >= gapMs || token.speakerId !== previous.speakerId)) flush();
      phrase.push(token);
    }
    flush(); lines.push("");
  }
  const packed = `${lines.join("\n").trimEnd()}\n`;
  if (packed.length > maxChars)
    throw new Error(`packed transcript is ${packed.length} characters, over the ${maxChars} budget; select fewer --source values`);
  return packed;
}

export interface ResolvedEditSegment {
  id: string; sourceId: string; sourcePath: string; startMs: number; endMs: number;
  durationMs: number; beat: string; quote: string; reason: string;
}

export function resolveEdit(transcript: LockedTranscriptT, edit: EditDecisionListT): ResolvedEditSegment[] {
  if (edit.transcriptDigest !== transcriptDigest(transcript)) throw new Error("EDL transcriptDigest does not match the locked transcript");
  const sources = new Map(transcript.sources.map((source) => [source.id, source]));
  const bySource = new Map<string, typeof transcript.tokens>();
  for (const source of transcript.sources) bySource.set(source.id, transcript.tokens.filter((token) => token.sourceId === source.id));
  return edit.segments.map((segment) => {
    const source = sources.get(segment.sourceId);
    if (!source) throw new Error(`segment ${segment.id} cites unknown source ${segment.sourceId}`);
    const tokens = bySource.get(segment.sourceId)!;
    const startIndex = tokens.findIndex((token) => token.id === segment.startWordId);
    const endIndex = tokens.findIndex((token) => token.id === segment.endWordId);
    if (startIndex < 0) throw new Error(`segment ${segment.id} startWordId ${segment.startWordId} is not in ${segment.sourceId}`);
    if (endIndex < 0) throw new Error(`segment ${segment.id} endWordId ${segment.endWordId} is not in ${segment.sourceId}`);
    if (endIndex < startIndex) throw new Error(`segment ${segment.id} ends before it starts`);
    const selected = tokens.slice(startIndex, endIndex + 1);
    const quote = cleanText(selected);
    if (cleanText([{ text: segment.quote }]) !== quote)
      throw new Error(`segment ${segment.id} quote drift: expected "${quote}", got "${segment.quote}"`);
    const startMs = Math.max(0, selected[0].startMs - segment.preRollMs);
    const endMs = Math.min(source.media.durationMs, selected.at(-1)!.endMs + segment.postRollMs);
    if (endMs - startMs < 250) throw new Error(`segment ${segment.id} is shorter than 250ms after handles`);
    return { id: segment.id, sourceId: segment.sourceId, sourcePath: source.path, startMs, endMs, durationMs: endMs - startMs, beat: segment.beat, quote, reason: segment.reason };
  });
}

export function verifyTranscriptSources(transcript: LockedTranscriptT, projectDir: string) {
  for (const source of transcript.sources) {
    const file = resolveProjectAsset(projectDir, source.path);
    const bytes = readFileSync(file);
    if (bytes.length !== source.bytes || sha256(bytes) !== source.sha256)
      throw new Error(`transcript source bytes changed after lock: ${source.path}`);
  }
}

/**
 * Canonicalize an edit artifact target and refuse aliases to locked footage.
 * Existing symlinks are rejected even when they currently point elsewhere: a
 * render must not inherit a mutable target indirection.
 */
export function resolveEditArtifactTarget(transcript: LockedTranscriptT, projectDir: string, outputFile: string) {
  const requested = path.resolve(outputFile);
  mkdirSync(path.dirname(requested), { recursive: true });
  if (existsSync(requested) && lstatSync(requested).isSymbolicLink())
    throw new Error(`edit artifact target cannot be a symlink: ${requested}`);
  const canonical = existsSync(requested)
    ? realpathSync(requested)
    : path.join(realpathSync(path.dirname(requested)), path.basename(requested));
  const sourceFiles = transcript.sources.map((source) => resolveProjectAsset(projectDir, source.path));
  const targetStat = existsSync(canonical) ? statSync(canonical) : undefined;
  if (sourceFiles.some((source) => {
    if (source === canonical) return true;
    if (!targetStat) return false;
    const sourceStat = statSync(source);
    return sourceStat.dev === targetStat.dev && sourceStat.ino === targetStat.ino;
  })) throw new Error("edit artifact cannot overwrite a transcript source");
  return canonical;
}

export interface EditRenderReceipt {
  receiptVersion: typeof EDIT_RECEIPT_VERSION;
  transcriptDigest: string;
  editDigest: string;
  quality: "draft" | "high";
  sources: Array<{ id: string; path: string; sha256: string }>;
  segments: ResolvedEditSegment[];
  output: { path: string; sha256: string; bytes: number; durationMs: number };
}

export function renderEdit(transcript: LockedTranscriptT, edit: EditDecisionListT, projectDir: string, outputFile: string, quality: "draft" | "high" = "high"): EditRenderReceipt {
  verifyTranscriptSources(transcript, projectDir);
  const segments = resolveEdit(transcript, edit);
  const totalDurationMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
  const out = resolveEditArtifactTarget(transcript, projectDir, outputFile);
  const inputFiles = segments.map((segment) => resolveProjectAsset(projectDir, segment.sourcePath));
  const args = ["-y", "-v", "error"];
  inputFiles.forEach((file) => args.push("-i", file));
  const filters: string[] = [];
  const hasAnyAudio = segments.some((segment) => transcript.sources.find((source) => source.id === segment.sourceId)!.media.hasAudio);
  segments.forEach((segment, index) => {
    const start = (segment.startMs / 1000).toFixed(3), end = (segment.endMs / 1000).toFixed(3);
    filters.push(`[${index}:v:0]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=${edit.output.width}:${edit.output.height}:force_original_aspect_ratio=decrease,pad=${edit.output.width}:${edit.output.height}:(ow-iw)/2:(oh-ih)/2,fps=${edit.output.fps},setsar=1,format=yuv420p[v${index}]`);
    if (hasAnyAudio) {
      const duration = segment.durationMs / 1000;
      const fade = Math.min(edit.output.audioFadeMs / 1000, duration / 2);
      const fadeOut = Math.max(0, duration - fade);
      const source = transcript.sources.find((item) => item.id === segment.sourceId)!;
      const audio = source.media.hasAudio
        ? `[${index}:a:0]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aresample=48000`
        : `anullsrc=r=48000:cl=stereo,atrim=duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS`;
      filters.push(`${audio},aformat=sample_fmts=fltp:channel_layouts=stereo,afade=t=in:st=0:d=${fade.toFixed(3)},afade=t=out:st=${fadeOut.toFixed(3)}:d=${fade.toFixed(3)}[a${index}]`);
    }
  });
  const concatInputs = segments.map((_, index) => `[v${index}]${hasAnyAudio ? `[a${index}]` : ""}`).join("");
  filters.push(`${concatInputs}concat=n=${segments.length}:v=1:a=${hasAnyAudio ? 1 : 0}[vout]${hasAnyAudio ? "[ajoin]" : ""}`);
  if (hasAnyAudio) filters.push(`[ajoin]loudnorm=I=${edit.output.audioTargetLufs}:TP=-1.5:LRA=11[aout]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[vout]");
  if (hasAnyAudio) args.push("-map", "[aout]", "-c:a", "aac", "-b:a", quality === "draft" ? "128k" : "192k");
  args.push("-c:v", "libx264", "-preset", quality === "draft" ? "ultrafast" : "medium", "-crf", quality === "draft" ? "28" : "18", "-pix_fmt", "yuv420p", "-threads", "1", "-map_metadata", "-1", "-t", (totalDurationMs / 1000).toFixed(3), "-movflags", "+faststart", out);
  const ffmpeg = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 1 << 25 });
  if (ffmpeg.error) throw ffmpeg.error;
  if (ffmpeg.status !== 0) throw new Error(`edit render failed: ${(ffmpeg.stderr ?? "").slice(-1200)}`);
  const durationProbe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { encoding: "utf8" });
  const durationSeconds = Number(durationProbe.stdout.trim());
  if (durationProbe.status !== 0 || !Number.isFinite(durationSeconds)) throw new Error("rendered edit duration is not measurable");
  const output = readFileSync(out);
  return {
    receiptVersion: EDIT_RECEIPT_VERSION,
    transcriptDigest: transcriptDigest(transcript),
    editDigest: sha256(JSON.stringify(EditDecisionList.parse(edit))),
    quality,
    sources: transcript.sources.map((source) => ({ id: source.id, path: source.path, sha256: source.sha256 })),
    segments,
    output: { path: out, sha256: sha256(output), bytes: statSync(out).size, durationMs: Math.round(durationSeconds * 1000) },
  };
}
