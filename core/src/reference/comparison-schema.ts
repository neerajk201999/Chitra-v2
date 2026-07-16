import { z } from "zod";

export const COMPARISON_VERSION = "0.1.0";
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const media = z.object({
  filename: z.string().min(1), sha256,
  durationMs: z.number().int().positive(), width: z.number().int().positive(), height: z.number().int().positive(),
  fps: z.number().positive(), frameCount: z.number().int().positive(), videoCodec: z.string().min(1),
  audioCodec: z.string().min(1).optional(),
});

const FrameMetric = z.object({
  pairIndex: z.number().int().nonnegative(), referenceFrame: z.number().int().nonnegative(), candidateFrame: z.number().int().nonnegative(),
  referenceTimeMs: z.number().int().nonnegative(), candidateTimeMs: z.number().int().nonnegative(),
  meanAbsoluteError: z.number().min(0).max(1), psnrDb: z.number().nonnegative().nullable(), globalLumaSsim: z.number().min(-1).max(1),
  differenceImage: z.string().min(1),
});

export const ReferenceComparison = z.object({
  comparisonVersion: z.literal(COMPARISON_VERSION), tier: z.literal("reference-comparison"),
  reference: media, candidate: media,
  analyzer: z.object({
    ffmpeg: z.string().min(1), pixelMetric: z.literal("rgb-mae-psnr+global-luma-ssim-v1"),
    audioMetric: z.literal("20ms-mono-rms-envelope-v1"), diffAmplification: z.literal(4),
  }),
  alignment: z.object({
    mode: z.enum(["exact", "normalized"]), spatial: z.enum(["strict", "contain-letterbox"]),
    temporal: z.enum(["frame-index", "normalized-progress"]), comparedFrames: z.number().int().positive(),
    exhaustive: z.boolean(),
  }),
  frames: z.array(FrameMetric).min(1),
  visual: z.object({
    meanAbsoluteError: z.number().min(0).max(1), p95AbsoluteError: z.number().min(0).max(1),
    meanGlobalLumaSsim: z.number().min(-1).max(1), minimumGlobalLumaSsim: z.number().min(-1).max(1),
    meanPsnrDb: z.number().nonnegative().nullable(), worstPairIndices: z.array(z.number().int().nonnegative()).max(10),
  }),
  audio: z.discriminatedUnion("status", [
    z.object({ status: z.literal("missing"), referencePresent: z.boolean(), candidatePresent: z.boolean() }),
    z.object({ status: z.literal("compared"), durationDeltaMs: z.number().int(), envelopeCorrelation: z.number().min(-1).max(1), normalizedRmse: z.number().min(0).max(1), comparedWindows: z.number().int().positive() }),
  ]),
  evidence: z.object({ directory: z.string().min(1), differenceImages: z.number().int().positive() }),
  semanticReview: z.object({ status: z.literal("unmeasured"), note: z.string().min(1) }),
});
export type ReferenceComparisonT = z.infer<typeof ReferenceComparison>;
