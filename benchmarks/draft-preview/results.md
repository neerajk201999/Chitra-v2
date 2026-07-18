# Draft preview benchmark — 2026-07-18

- Fixture: **9.6s, 1080×1920, authored at 30fps**
- Preview: **115 frames at 12fps**
- Diagnostic output: **540×960** (full-resolution evidence and release renders are unchanged)
- JPEG frame cache: **1.3 MiB**
- Fresh-cache samples: **5**
- Wall p50 / nearest-rank p95: **6.02s / 6.07s**
- Median phases: **setup 0.69s · capture 5.03s · encode 0.14s · finalize 0.03s · close 0.12s**

| Sample | Wall s | Setup s | Capture s | Encode s | Finalize s | Close s |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 5.98 | 0.68 | 5.03 | 0.13 | 0.03 | 0.12 |
| 2 | 6.01 | 0.69 | 5.02 | 0.15 | 0.03 | 0.12 |
| 3 | 6.07 | 0.69 | 5.08 | 0.14 | 0.03 | 0.13 |
| 4 | 6.05 | 0.70 | 5.04 | 0.16 | 0.03 | 0.12 |
| 5 | 6.02 | 0.72 | 5.03 | 0.13 | 0.03 | 0.12 |

## Adversarial UI probe

- Content: 48px/24px/16px/12px type, one-pixel rules, status chips, and twelve compact rows
- Whole-frame full-vs-upscaled-half: **SSIM 0.8855 · MAE 0.0080**
- Product-UI region: **SSIM 0.8657 · MAE 0.0120**
- Regression floors: **whole SSIM ≥ 0.85 · UI SSIM ≥ 0.83 · UI MAE ≤ 0.02**
- Visual evidence: [full reference (left) vs half-resolution diagnostic (right)](quality-side-by-side.jpg)

The preview is diagnostic and cannot be released. Standard/high retain full
authored fps and lossless PNG capture. Small-copy OCR and final typography are
not proven by global pixel metrics; inspect standard/high output for those
decisions. Timings are local measurements, not a cross-machine service-level
claim. Reproduce with
`node benchmarks/draft-preview/run.mjs --samples 5`.
