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

| Metric | Freeze | Clean-room 0.5 | Clean-room 0.6 | Clean-room 0.7 |
|---|---:|---:|---:|---:|
| Compared frames | 274/274 | 274/274 | 274/274 | 274/274 |
| Mean RGB MAE | 0.024120 | 0.027479 | 0.027408 | 0.027557 |
| P95 RGB MAE | 0.035325 | 0.036008 | 0.036008 | 0.036008 |
| Mean global-luma SSIM | 0.269554 | 0.353047 | 0.363459 | 0.367144 |
| Minimum global-luma SSIM | 0.095306 | 0.132334 | 0.132334 | 0.132334 |
| Mean PSNR | 25.013 dB | 23.663 dB | 23.678 dB | 23.637 dB |
| Worst frame indices | 38, 40, 36, 41, 37, 42, 39, 44, 43, 45 | 138, 137, 139, 112, 136, 111, 130, 128, 129, 131 | 138, 137, 139, 112, 136, 111, 130, 128, 129, 131 | 138, 137, 139, 112, 136, 111, 130, 128, 129, 131 |
| Audio | reused | missing | missing | missing |

The clean-room candidate contains no decoded reference pixels, extracted visual
assets, or reference audio. Version 0.6 is a 720×900 Chitra figure driven by
eight typed frame tracks plus a typed 40-point custom constellation. Against the
freeze, mean SSIM improves by 35% and minimum SSIM by 39%, while MAE and PSNR
remain worse because imperfect bright reconstructed content creates more pixel
error than a nearly black freeze. No single metric is promoted as the quality
score. Candidate 0.7 adds a parent transform group: SSIM improves to 0.367144
and the ring diameter is visually closer, but MAE/PSNR regress slightly because
its bright, uniform ring still differs from the reference's irregular blurred
cloud. It is not declared an unconditional win over 0.6.

The worst residual moved from frames 36–45 to the rapid phone-card carousel at
frames 128–139. Side-by-side inspection also shows three semantic compositor
gaps not captured well by the global metrics: the hero card lacks true internal
3D/light tracks and the phone collapse lacks motion blur. ADR-0020 closes the
custom particle destination gap and improves mean SSIM from 0.353047 to
0.363459. ADR-0021 then closes the measured parent-scale + child-morph hierarchy
gap and raises mean SSIM to 0.367144. The remaining close mismatch is now
appearance/blur/irregularity, not missing transform hierarchy.

Reproduce locally with the exact target bytes:

```bash
node benchmarks/card-vault/run.mjs /path/to/nJY81Asb24doUFnW.mp4
node benchmarks/card-vault/run-candidate.mjs /path/to/nJY81Asb24doUFnW.mp4
```

The candidate score and figure live in `candidate/`; the runner prints its
temporary evidence directory for local diff inspection. The next compositor
slice returns to the unchanged worst carousel frames, then isolates motion blur
or internal 3D only with new evidence. This document makes no exact-
reconstruction or competitive-quality claim.
