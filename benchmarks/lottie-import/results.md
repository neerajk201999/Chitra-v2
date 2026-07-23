# Seekable Lottie import benchmark — 2026-07-23

- Offline vector JSON + pinned SVG runtime: **pass**
- Random seek order: **30 → 0 → 15 → 15**
- Painted centroid: **75.5 → 159.5 → 243.5 px**
- Nested local geometry: **240 × 320 px**
- Imported animation + typed compositing: **pass**
- Reverse + two-iteration alternate playback: **pass**
- Traversal/symlink escape, conditional-runtime, and failed-runtime checks: **pass**
- Source-byte cache invalidation: **pass**
- Source-byte release-identity invalidation: **pass**
- Repeated source frame: **byte-identical** (76b6e435330e57f8…)
- Expression/text/external-asset/range/time defects: **rejected**

This proves Chitra's bounded vector-only Lottie JSON contract. It does not prove
dotLottie, Rive, expressions, external image/font assets, or all After Effects
features.
