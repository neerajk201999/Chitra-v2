# Reference Comparator benchmark

**Verified:** 2026-07-16 · **Comparison:** 0.1.0

The generated-fixture benchmark proves:

- exact mode compares all 12/12 frames by index;
- identical videos produce MAE 0, global-luma SSIM 1, and audio-envelope
  correlation 1;
- repeated reports and difference PNGs are byte-identical;
- a same-structure colour drift produces non-zero visual error;
- exact mode rejects mismatched dimensions;
- normalized mode records five uniform progress samples, letterboxing, and
  `exhaustive:false`;
- the public `chitra compare` CLI writes the typed report and evidence.

These metrics measure decoded pixel and audio-energy alignment. They do not
measure semantic equivalence, local perceptual features, optical flow, music,
speech, camera meaning, or professional preference.
