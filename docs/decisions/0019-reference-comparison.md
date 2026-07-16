# ADR-0019 — Aligned reference comparison and evidence artifacts

**Status:** accepted · 2026-07-16

## Context

Chitra can decompose reference facts and author frame-addressed motion, but it
cannot measure whether a rendered candidate resembles the reference. Without an
aligned comparator, “exact reconstruction” is visual intuition and competitive
claims are unfalsifiable. Sparse hero-frame inspection can also hide defects
between selected instants.

No single pixel metric captures perceptual or creative similarity. Comparison
therefore needs transparent modes, per-frame evidence, aggregate metrics, and an
explicit semantic boundary rather than one opaque quality score.

## Decision

1. Add `chitra compare reference.mp4 candidate.mp4 -o comparison.json
   --evidence comparison-evidence` with a typed Comparison 0.1.0 report.
2. **Exact mode** requires equal display dimensions, FPS, and frame count, then
   compares every decoded frame by index. It refuses films above a configurable
   safety ceiling rather than silently sampling them.
3. **Normalized mode** aligns uniformly by normalized progress, letterboxes the
   candidate to reference dimensions, and reports the selected source indices
   and timestamps. It is useful for style/rhythm iteration but can never support
   an “exact” claim.
4. Compute transparent pixel metrics per aligned pair: normalized RGB mean
   absolute error, PSNR, and global-luma SSIM v1. Save an absolute-difference PNG
   for every compared pair and identify the worst frames in the report.
5. When both films contain audio, compare deterministic 20ms mono RMS envelopes
   using correlation and normalized RMSE, plus duration delta. This measures
   energy-shape alignment only—not speech, melody, mix quality, or licensing.
6. Record source hashes, media facts, analyzer versions/options, and evidence
   paths. Repeated comparison with the same bytes and toolchain must reproduce
   the report and diff images.

## Alternatives rejected

- **VLM “looks similar” score:** useful later as a calibrated semantic rubric,
  but nondeterministic and too opaque for frame-exact claims.
- **One aggregate SSIM number:** hides localized failures and alignment errors.
- **Always resize and time-stretch:** makes structurally different videos appear
  comparable and destroys the meaning of exact reconstruction.
- **Browser screenshots of both videos:** adds another timing/runtime layer when
  FFmpeg can decode the actual encoded frames directly.

## Consequences

- The 274-frame Card Vault reconstruction can have a falsifiable every-frame
  baseline and visible worst-frame evidence.
- Normalized comparison remains clearly labeled and cannot be promoted to exact.
- Global SSIM and RMS-envelope audio are deliberately limited metrics; local
  perceptual features, optical flow, semantic intent, and calibrated human/VLM
  judgment remain separate benchmark dimensions.
