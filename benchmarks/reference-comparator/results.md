# Reference Comparator benchmark

**Verified:** 2026-07-16 · **Comparison:** 0.2.0

The generated-fixture benchmark proves:

- exact mode compares all 12/12 frames by index;
- identical videos produce MAE 0, global-luma SSIM 1, and audio-envelope
  correlation 1;
- repeated reports and difference PNGs are byte-identical;
- a same-structure colour drift produces non-zero visual error;
- exact mode rejects mismatched dimensions;
- normalized mode records five uniform progress samples, letterboxing,
  aligned-canvas ROI extraction, and `exhaustive:false`;
- a blue defect confined to the left side is detected by the left ROI while an
  untouched right ROI remains at MAE 0;
- regional pair ranges, report paths, and cropped difference PNGs repeat
  deterministically;
- duplicate IDs, invalid bounds, and inverted ranges fail loudly;
- the public `chitra compare` CLI accepts repeatable `--region` options and
  writes the typed report and evidence.

These metrics measure decoded pixel and audio-energy alignment. They do not
measure semantic equivalence, local-window perceptual features, optical flow,
music, speech, camera meaning, or professional preference. ROI metrics diagnose
where error is concentrated; they never replace whole-frame exactness metrics.
