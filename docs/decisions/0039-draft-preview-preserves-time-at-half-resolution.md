# ADR-0039 — Draft preview preserves time at half resolution

**Status:** accepted · 2026-07-18

## Context

ADR-0038 measured five fresh-cache full-resolution draft renders of the fixed
9.6-second vertical fixture. Median wall time was 8.76 seconds; frame capture
accounted for 7.66 seconds while setup, encoding, finalization, and shutdown
were comparatively small. Changing FFmpeg settings cannot materially improve
the dominant phase. A Puppeteer `optimizeForSpeed` JPEG experiment confirmed
that boundary: median wall time remained 8.75 seconds.

A half-resolution capture experiment retained all 115 temporal samples at 12fps
and reduced median wall time to 6.10 seconds, capture to 5.09 seconds, and the
frame cache from 3.0 MiB to 1.3 MiB. Exhaustive comparison after upscaling the
candidate measured RGB MAE 0.0022 and global-luma SSIM 0.9919. Visual inspection
of the lowest-SSIM frame and thin-line frames found no material loss for motion
diagnosis, but the original fixture contains little small product UI. A generated
micro-type/UI probe is therefore part of the regression contract.

Draft output is evidence for timing, choreography, hierarchy, and gross layout;
it is not release evidence for final typography, texture, edge quality, or
pixel-accurate comparison. Standard and high renders already retain full
geometry, authored FPS, and lossless PNG capture.

## Decision

1. Draft capture keeps the complete 12fps temporal sample set but captures at
   50% spatial scale. Standard and high remain unchanged.
2. The CLI and `RenderResult` expose actual encoded width and height so no caller
   can mistake a reduced diagnostic preview for release geometry.
3. H.264 output is padded only when necessary to even dimensions. The recorded
   output dimensions come from the encoded file, not an assumed rounding rule.
4. Draft disk estimates include the squared capture scale, and the scale remains
   part of the frame-cache namespace. The superseded full-resolution draft
   namespace and unshipped prototype namespace are pruned by exact name so the
   optimization does not strand old frame caches. Full-resolution evidence
   stills and all release gates remain full resolution.
5. The executable benchmark preserves 115 temporal frames, verifies the reduced
   dimensions and cache bound, records repeated p50/p95 phase timings, and runs
   an adversarial one-frame probe containing 48px, 24px, 16px, and 12px type,
   one-pixel rules, and compact product UI. Its full/half comparison is explicit
   diagnostic evidence, with regression floors of 0.85 whole-frame SSIM, 0.83
   UI-region SSIM, and 0.02 UI-region MAE. Those baseline-derived floors catch
   material drift; they are not proof of OCR accuracy or professional preference.

## Alternatives rejected

- **Lower preview FPS:** saves round trips but weakens timing and easing evidence,
  the primary purpose of a motion preview.
- **Ship `optimizeForSpeed`:** the five-sample experiment produced no meaningful
  improvement.
- **Make every quality tier half resolution:** release pixels and typography
  would be degraded for an iteration-only speed target.
- **Describe half resolution only in documentation:** machine callers would
  still receive ambiguous render metadata.
- **Claim the simple-fixture SSIM proves quality:** global metrics can hide small
  text and local edge damage; the adversarial fixture and honest boundary are
  required.

## Consequences

Local draft iteration is about 30% faster on the measured fixture and uses about
57% less frame-cache storage without reducing temporal sampling. A 1080×1920
Score produces a 540×960 draft, so reviewers must use standard/high output for
final type, texture, and pixel decisions. Cross-machine latency and VLM/OCR
utility remain outside-user measurements, not local claims. The optimization is
reversible by changing one quality profile and cache namespace.
