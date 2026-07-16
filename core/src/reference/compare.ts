import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { COMPARISON_VERSION, ReferenceComparison, type ReferenceComparisonT } from "./comparison-schema.js";
import { probeVideo } from "./decompose.js";

export type CompareMode = "exact" | "normalized";
export interface CompareOptions { mode?: CompareMode; evidenceDir: string; artifactDir?: string; maxFrames?: number; samples?: number }
const round = (value: number, places = 6) => Number(value.toFixed(places));
const posixRelative = (from: string, to: string) => path.relative(from, to).split(path.sep).join("/");

function command(name: string, args: string[], encoding: "utf8" | "buffer" = "utf8") {
  const result = spawnSync(name, args, { encoding, maxBuffer: 1 << 30 });
  if (result.status !== 0) throw new Error(`${name} failed: ${String(result.stderr ?? "").slice(-1000)}`);
  return result;
}

async function sha256(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

const indices = (count: number, samples: number) => Array.from({ length: samples }, (_, index) =>
  samples === 1 ? 0 : Math.round((index * (count - 1)) / (samples - 1))
);

function extract(file: string, outDir: string, selected?: number[], fit?: { width: number; height: number }) {
  mkdirSync(outDir, { recursive: true });
  const filters: string[] = [];
  if (selected) filters.push(`select=${selected.map((index) => `eq(n\\,${index})`).join("+")}`);
  if (fit) filters.push(`scale=${fit.width}:${fit.height}:force_original_aspect_ratio=decrease,pad=${fit.width}:${fit.height}:(ow-iw)/2:(oh-ih)/2:black`);
  const args = ["-y", "-v", "error", "-i", file, "-an"];
  if (filters.length) args.push("-vf", filters.join(","));
  args.push("-vsync", "0", path.join(outDir, "%06d.png"));
  command("ffmpeg", args);
  return readdirSync(outDir).filter((entry) => entry.endsWith(".png")).sort().map((entry) => path.join(outDir, entry));
}

async function comparePair(reference: string, candidate: string, difference: string) {
  const a = await sharp(reference).flatten({ background: "#000000" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(candidate).flatten({ background: "#000000" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height || a.info.channels !== b.info.channels)
    throw new Error("Aligned frames have different decoded dimensions or channels");
  const diff = Buffer.alloc(a.data.length);
  let absolute = 0, squared = 0, sumA = 0, sumB = 0;
  const pixels = a.info.width * a.info.height;
  const lumaA = new Float64Array(pixels), lumaB = new Float64Array(pixels);
  for (let offset = 0, pixel = 0; offset < a.data.length; offset += a.info.channels, pixel++) {
    for (let channel = 0; channel < a.info.channels; channel++) {
      const delta = Math.abs(a.data[offset + channel] - b.data[offset + channel]);
      absolute += delta; squared += delta * delta; diff[offset + channel] = Math.min(255, delta * 4);
    }
    lumaA[pixel] = (0.2126 * a.data[offset] + 0.7152 * a.data[offset + 1] + 0.0722 * a.data[offset + 2]) / 255;
    lumaB[pixel] = (0.2126 * b.data[offset] + 0.7152 * b.data[offset + 1] + 0.0722 * b.data[offset + 2]) / 255;
    sumA += lumaA[pixel]; sumB += lumaB[pixel];
  }
  const meanA = sumA / pixels, meanB = sumB / pixels;
  let varianceA = 0, varianceB = 0, covariance = 0;
  for (let pixel = 0; pixel < pixels; pixel++) {
    const da = lumaA[pixel] - meanA, db = lumaB[pixel] - meanB;
    varianceA += da * da; varianceB += db * db; covariance += da * db;
  }
  varianceA /= pixels; varianceB /= pixels; covariance /= pixels;
  const ssim = ((2 * meanA * meanB + 0.0001) * (2 * covariance + 0.0009)) /
    ((meanA * meanA + meanB * meanB + 0.0001) * (varianceA + varianceB + 0.0009));
  const mse = squared / a.data.length;
  await sharp(diff, { raw: a.info }).png().toFile(difference);
  return { mae: absolute / (a.data.length * 255), psnr: mse === 0 ? null : 10 * Math.log10((255 * 255) / mse), ssim };
}

function audioEnvelope(file: string) {
  const result = command("ffmpeg", ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "pipe:1"], "buffer");
  const data = result.stdout as Buffer, window = 160, envelope: number[] = [];
  for (let start = 0; start + 1 < data.length; start += window * 2) {
    let sum = 0, count = 0;
    for (let offset = start; offset + 1 < Math.min(data.length, start + window * 2); offset += 2) {
      const value = data.readInt16LE(offset) / 32768; sum += value * value; count++;
    }
    envelope.push(Math.sqrt(sum / Math.max(1, count)));
  }
  const peak = Math.max(...envelope, 1e-9);
  return envelope.map((value) => value / peak);
}

function compareAudio(reference: string, candidate: string, mode: CompareMode, durationDeltaMs: number) {
  const a = audioEnvelope(reference), b = audioEnvelope(candidate);
  const count = mode === "exact" ? Math.min(a.length, b.length) : Math.min(2000, Math.max(2, Math.min(a.length, b.length)));
  const sample = (values: number[], index: number) => values[Math.round((index * (values.length - 1)) / Math.max(1, count - 1))];
  const x = Array.from({ length: count }, (_, index) => mode === "exact" ? a[index] : sample(a, index));
  const y = Array.from({ length: count }, (_, index) => mode === "exact" ? b[index] : sample(b, index));
  const mx = x.reduce((sum, value) => sum + value, 0) / count, my = y.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0, vx = 0, vy = 0, squared = 0;
  for (let index = 0; index < count; index++) {
    const dx = x[index] - mx, dy = y[index] - my;
    covariance += dx * dy; vx += dx * dx; vy += dy * dy; squared += (x[index] - y[index]) ** 2;
  }
  const denominator = Math.sqrt(vx * vy);
  const correlation = denominator === 0 ? (squared === 0 ? 1 : 0) : covariance / denominator;
  return { status: "compared" as const, durationDeltaMs, envelopeCorrelation: round(correlation), normalizedRmse: round(Math.sqrt(squared / count)), comparedWindows: count };
}

export async function compareReference(referenceFile: string, candidateFile: string, options: CompareOptions): Promise<ReferenceComparisonT> {
  const reference = path.resolve(referenceFile), candidate = path.resolve(candidateFile);
  if (!existsSync(reference)) throw new Error(`No such reference video: ${reference}`);
  if (!existsSync(candidate)) throw new Error(`No such candidate video: ${candidate}`);
  const mode = options.mode ?? "exact", maxFrames = options.maxFrames ?? 1200, requestedSamples = options.samples ?? 120;
  const ref = probeVideo(reference), cand = probeVideo(candidate);
  if (mode === "exact") {
    if (ref.width !== cand.width || ref.height !== cand.height) throw new Error(`Exact comparison requires equal dimensions (${ref.width}x${ref.height} vs ${cand.width}x${cand.height})`);
    if (Math.abs(ref.fps - cand.fps) > 0.001) throw new Error(`Exact comparison requires equal FPS (${ref.fps} vs ${cand.fps})`);
    if (ref.frameCount !== cand.frameCount) throw new Error(`Exact comparison requires equal frame count (${ref.frameCount} vs ${cand.frameCount})`);
    if (ref.frameCount > maxFrames) throw new Error(`Exact comparison has ${ref.frameCount} frames; raise --max-frames above ${maxFrames} explicitly`);
  }
  const pairCount = mode === "exact" ? ref.frameCount : Math.max(1, Math.min(requestedSamples, ref.frameCount, cand.frameCount));
  const refIndices = mode === "exact" ? indices(ref.frameCount, ref.frameCount) : indices(ref.frameCount, pairCount);
  const candIndices = mode === "exact" ? indices(cand.frameCount, cand.frameCount) : indices(cand.frameCount, pairCount);
  const temp = mkdtempSync(path.join(os.tmpdir(), "chitra-compare-"));
  const evidenceDir = path.resolve(options.evidenceDir), artifactDir = path.resolve(options.artifactDir ?? process.cwd());
  mkdirSync(evidenceDir, { recursive: true });
  try {
    const refFrames = extract(reference, path.join(temp, "reference"), mode === "exact" ? undefined : refIndices);
    const candFrames = extract(candidate, path.join(temp, "candidate"), mode === "exact" ? undefined : candIndices, mode === "exact" ? undefined : { width: ref.width, height: ref.height });
    if (refFrames.length !== pairCount || candFrames.length !== pairCount) throw new Error(`Decoded frame count mismatch: expected ${pairCount}, got ${refFrames.length}/${candFrames.length}`);
    const frames: ReferenceComparisonT["frames"] = [];
    for (let index = 0; index < pairCount; index++) {
      const diff = path.join(evidenceDir, `diff-${String(index).padStart(6, "0")}.png`);
      const metric = await comparePair(refFrames[index], candFrames[index], diff);
      frames.push({ pairIndex: index, referenceFrame: refIndices[index], candidateFrame: candIndices[index], referenceTimeMs: Math.round(refIndices[index] / ref.fps * 1000), candidateTimeMs: Math.round(candIndices[index] / cand.fps * 1000), meanAbsoluteError: round(metric.mae), psnrDb: metric.psnr == null ? null : round(metric.psnr, 3), globalLumaSsim: round(metric.ssim), differenceImage: posixRelative(artifactDir, diff) });
    }
    const maes = frames.map((frame) => frame.meanAbsoluteError).sort((a, b) => a - b);
    const ssims = frames.map((frame) => frame.globalLumaSsim), psnr = frames.map((frame) => frame.psnrDb).filter((value): value is number => value != null);
    const worstPairIndices = [...frames].sort((a, b) => b.meanAbsoluteError - a.meanAbsoluteError || a.pairIndex - b.pairIndex).slice(0, 10).map((frame) => frame.pairIndex);
    const ffmpeg = String(command("ffmpeg", ["-version"]).stdout).split("\n")[0];
    const source = async (file: string, media: ReturnType<typeof probeVideo>) => ({ filename: path.basename(file), sha256: await sha256(file), durationMs: media.durationMs, width: media.width, height: media.height, fps: round(media.fps), frameCount: media.frameCount, videoCodec: media.videoCodec, ...(media.audioCodec ? { audioCodec: media.audioCodec } : {}) });
    const report = {
      comparisonVersion: COMPARISON_VERSION, tier: "reference-comparison" as const,
      reference: await source(reference, ref), candidate: await source(candidate, cand),
      analyzer: { ffmpeg, pixelMetric: "rgb-mae-psnr+global-luma-ssim-v1" as const, audioMetric: "20ms-mono-rms-envelope-v1" as const, diffAmplification: 4 as const },
      alignment: { mode, spatial: mode === "exact" ? "strict" as const : "contain-letterbox" as const, temporal: mode === "exact" ? "frame-index" as const : "normalized-progress" as const, comparedFrames: pairCount, exhaustive: mode === "exact" },
      frames,
      visual: { meanAbsoluteError: round(frames.reduce((sum, frame) => sum + frame.meanAbsoluteError, 0) / pairCount), p95AbsoluteError: maes[Math.floor((maes.length - 1) * 0.95)], meanGlobalLumaSsim: round(ssims.reduce((sum, value) => sum + value, 0) / pairCount), minimumGlobalLumaSsim: Math.min(...ssims), meanPsnrDb: psnr.length ? round(psnr.reduce((sum, value) => sum + value, 0) / psnr.length, 3) : null, worstPairIndices },
      audio: ref.hasAudio && cand.hasAudio ? compareAudio(reference, candidate, mode, cand.durationMs - ref.durationMs) : { status: "missing" as const, referencePresent: ref.hasAudio, candidatePresent: cand.hasAudio },
      evidence: { directory: posixRelative(artifactDir, evidenceDir), differenceImages: frames.length },
      semanticReview: { status: "unmeasured" as const, note: "Pixel and energy-envelope metrics do not measure narrative, intent, typography semantics, camera meaning, music, speech, or professional preference." },
    };
    return ReferenceComparison.parse(report);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
