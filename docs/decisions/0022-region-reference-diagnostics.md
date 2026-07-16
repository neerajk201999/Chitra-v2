# ADR-0022 — Region-of-interest reference diagnostics

**Status:** accepted · 2026-07-16

## Context

Card Vault 0.7's whole-frame worst pairs cluster around the card carousel, but
frame-by-frame inspection shows its timing is already within about one frame.
A manual crop of the phone/card area over pairs 111–140 measures only 17.27 dB
PSNR versus 23.64 dB for the whole film, proving the stable synthetic artwork is
the dominant residual. Comparison 0.1 cannot preserve that diagnosis: it reports
only whole-frame metrics.

## Decision

1. Comparison 0.2 accepts zero or more named regions in aligned-reference pixel
   coordinates, each with optional inclusive pair-index start/end bounds.
2. Every region records its validated bounds, compared pair range, the same
   transparent MAE/PSNR/global-luma-SSIM summary as the whole frame, worst pair
   indices, and an amplified cropped difference image per included pair.
3. Region bounds must fit the aligned reference canvas; ranges must fit the
   selected pair count. Empty, duplicate, inverted, or out-of-range regions fail
   loudly. Exact/normalized alignment semantics remain unchanged.
4. Whole-frame metrics remain authoritative for exact-film claims. Regional
   metrics are diagnostic evidence and may not be substituted for the global
   result.

## Consequences

- Reconstruction agents can distinguish timing/composition failures from a
  localized asset-fidelity ceiling without manual FFmpeg commands.
- Reports and evidence grow in direct proportion to requested regions and pair
  ranges; no regions preserves the prior runtime and artifact count.
- Semantic quality, optical flow, masks, and automatic object tracking remain
  unmeasured.
