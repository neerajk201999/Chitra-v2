# Card Vault reconstruction benchmark — target and clean-room baseline

**Run:** 2026-07-16 · **Status:** first authored candidate measured; exact
reconstruction not achieved · **Input redistributed:** no

Target identity:

- SHA-256: `8211d15a9ccc90453f8babd914aebea612781febd41e70f2e59c00cc865060c4`
- 720×900 (4:5), 30fps, exactly 274 video frames
- H.264 video, AAC audio
- container duration 9195ms; video duration 9133ms

The lower baseline freezes decoded frame 0 for all 274 frames and reuses the
reference audio, isolating visual motion/content error. Exhaustive exact-mode
results:

| Metric | Freeze baseline | Clean-room 0.5 |
|---|---:|---:|
| Compared frames | 274/274 | 274/274 |
| Mean RGB MAE | 0.024120 | 0.027479 |
| P95 RGB MAE | 0.035325 | 0.036008 |
| Mean global-luma SSIM | 0.269554 | 0.353047 |
| Minimum global-luma SSIM | 0.095306 | 0.132334 |
| Mean PSNR | 25.013 dB | 23.663 dB |
| Worst frame indices | 38, 40, 36, 41, 37, 42, 39, 44, 43, 45 | 138, 137, 139, 112, 136, 111, 130, 128, 129, 131 |
| Audio | reference reused | missing, reported |

The clean-room candidate contains no decoded reference pixels, extracted visual
assets, or reference audio. It is a 720×900 Chitra figure driven by eight typed
frame tracks. Against the freeze, mean SSIM improves by 31% and minimum SSIM by
39%, while MAE and PSNR remain worse because imperfect bright reconstructed
content creates more pixel error than a nearly black freeze. No single metric
is promoted as the quality score.

The worst residual moved from frames 36–45 to the rapid phone-card carousel at
frames 128–139. Side-by-side inspection also shows three semantic compositor
gaps not captured well by the global metrics: the hero card lacks true internal
3D/light tracks, the phone collapse lacks motion blur, and the final circular
particle cloud cannot morph into the custom Card Vault dot mark because the
typed particle vocabulary supports only grid/ring/scatter.

Reproduce locally with the exact target bytes:

```bash
node benchmarks/card-vault/run.mjs /path/to/nJY81Asb24doUFnW.mp4
node benchmarks/card-vault/run-candidate.mjs /path/to/nJY81Asb24doUFnW.mp4
```

The candidate score and figure live in `candidate/`; the runner prints its
temporary evidence directory for local diff inspection. The next compositor
slice starts with the measured custom-particle trajectory rather than adding the
whole aspirational feature list. This document makes no exact-reconstruction or
competitive-quality claim.
