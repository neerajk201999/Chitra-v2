# Card Vault reconstruction benchmark — target registration and lower baseline

**Run:** 2026-07-16 · **Status:** target registered; reconstruction not yet
authored · **Input redistributed:** no

Target identity:

- SHA-256: `8211d15a9ccc90453f8babd914aebea612781febd41e70f2e59c00cc865060c4`
- 720×900 (4:5), 30fps, exactly 274 video frames
- H.264 video, AAC audio
- container duration 9195ms; video duration 9133ms

The lower baseline freezes decoded frame 0 for all 274 frames and reuses the
reference audio, isolating visual motion/content error. Exhaustive exact-mode
results:

| Metric | Freeze baseline |
|---|---:|
| Compared frames | 274/274 |
| Mean RGB MAE | 0.024120 |
| P95 RGB MAE | 0.035325 |
| Mean global-luma SSIM | 0.269554 |
| Minimum global-luma SSIM | 0.095306 |
| Mean PSNR | 25.013 dB |
| Worst frame indices | 38, 40, 36, 41, 37, 42, 39, 44, 43, 45 |
| Audio envelope correlation | 0.997872 |

Worst frames 36–45 show the first major product-card reveal: large 3D card
translation/rotation, specular light sweep, glow, bank/network marks, and two
lines of type. A later sampled frame shows a phone shell containing the card.
These are measured target requirements, not yet Chitra capabilities.

Reproduce locally with the exact target bytes:

```bash
node benchmarks/card-vault/run.mjs /path/to/nJY81Asb24doUFnW.mp4
```

The next benchmark candidate must be a Chitra-authored 274-frame Score. Feature
work is justified only by its per-frame diff evidence. This document makes no
reconstruction or competitive-quality claim.
