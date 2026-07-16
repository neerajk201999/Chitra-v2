import { z } from "zod";

export const STYLE_DNA_VERSION = "0.1.0";
const hex = z.string().regex(/^#[0-9a-f]{6}$/);

const Shot = z.object({
  index: z.number().int().min(0),
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  durationMs: z.number().int().positive(),
  evidenceFrame: z.string().min(1),
});

export const StyleDNA = z.object({
  styleDnaVersion: z.literal(STYLE_DNA_VERSION),
  tier: z.literal("style-dna"),
  source: z.object({
    filename: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    durationMs: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    frameCount: z.number().int().positive(),
    videoCodec: z.string().min(1),
    audioCodec: z.string().min(1).optional(),
  }),
  analyzer: z.object({
    ffmpeg: z.string().min(1),
    sceneDetector: z.literal("ffmpeg-scene-score"),
    paletteMethod: z.literal("rgb-5bit-frequency"),
    sceneThreshold: z.number().min(0.05).max(0.9),
    requestedSampleFps: z.number().min(0.25).max(8),
    effectiveSampleFps: z.number().positive().max(8),
    sampleWidth: z.number().int().min(64).max(640),
    sampleHeight: z.number().int().positive(),
    maxSamples: z.number().int().min(10).max(2000),
    sampleCount: z.number().int().positive(),
  }),
  shots: z.array(Shot).min(1),
  rhythm: z.object({
    cutCount: z.number().int().min(0),
    cutsPerMinute: z.number().min(0),
    meanShotMs: z.number().min(0),
    medianShotMs: z.number().min(0),
    shortestShotMs: z.number().min(0),
    longestShotMs: z.number().min(0),
  }),
  palette: z.object({
    dominantColors: z.array(hex).min(1).max(8),
    meanLuminance: z.number().min(0).max(1),
    meanSaturation: z.number().min(0).max(1),
    samples: z.array(z.object({
      timeMs: z.number().int().min(0),
      dominantColor: hex,
      meanLuminance: z.number().min(0).max(1),
      meanSaturation: z.number().min(0).max(1),
    })).min(1),
  }),
  motion: z.object({
    metric: z.literal("mean-absolute-luma-difference"),
    meanEnergy: z.number().min(0).max(1),
    p90Energy: z.number().min(0).max(1),
    peakEnergy: z.number().min(0).max(1),
    windows: z.array(z.object({
      startMs: z.number().int().min(0),
      endMs: z.number().int().positive(),
      energy: z.number().min(0).max(1),
      containsCut: z.boolean(),
    })),
  }),
  audio: z.discriminatedUnion("present", [
    z.object({ present: z.literal(false) }),
    z.object({
      present: z.literal(true),
      method: z.literal("energy-flux-v1"),
      bpm: z.number().min(0),
      firstBeatMs: z.number().int().min(0),
      beats: z.array(z.number().int().min(0)).max(5000),
      durationMs: z.number().int().positive(),
    }),
  ]),
  evidence: z.object({ directory: z.string().min(1), frameCount: z.number().int().positive() }),
  semanticReview: z.object({
    typography: z.literal("unmeasured"),
    cameraIntent: z.literal("unmeasured"),
    narrative: z.literal("unmeasured"),
    emotion: z.literal("unmeasured"),
    note: z.string().min(1),
  }),
});

export type StyleDNAT = z.infer<typeof StyleDNA>;
