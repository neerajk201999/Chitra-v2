# Card Vault source-assisted private run

**Run:** 2026-07-16 · **Reference redistributed:** no · **Best candidate:** 0.9

The owner confirmed that they authored the Card Vault reference. A private
source-assisted Chitra project used three declared still derivatives and the
extracted audio while explicitly refusing to embed or replay the full reference
video. Intake, Direction, Storyboard, Score, provenance conformance, rendered
frame gates, high-quality render, and exhaustive 274-frame comparison all ran.

| Metric | Clean-room 0.7 | Source-assisted 0.8 | Source-assisted 0.9 |
|---|---:|---:|---:|
| Whole-film MAE | 0.027557 | 0.026706 | **0.025749** |
| Whole-film mean SSIM | 0.367146 | 0.379462 | **0.401685** |
| Whole-film minimum SSIM | 0.132334 | 0.127293 | **0.157188** |
| Whole-film PSNR | 23.637 dB | 23.634 dB | **23.877 dB** |
| Phone/card ROI MAE, pairs 111–140 | 0.089867 | 0.090255 | **0.077290** |
| Phone/card ROI mean SSIM | 0.000048 | 0.003492 | **0.062493** |
| Phone/card ROI PSNR | 14.212 dB | 14.085 dB | **14.810 dB** |
| Audio envelope correlation | missing | 0.961110 | **0.961110** |

Candidate 0.8 established rights-traced source assets and audio. Regional
evidence then showed that phone-shell and card-slot geometry, not another asset,
was limiting the carousel; correcting those dimensions produced candidate 0.9.
A candidate 1.0 card-state swap slightly regressed whole-film SSIM to 0.4000 and
ROI SSIM to 0.061703, so it was rejected.

Two ADR-0025 appearance experiments were also rejected. Candidate 1.1 used
strong heterogeneous dot sizes and opacity: final-mark MAE improved to 0.099513,
but final-mark SSIM fell to 0.171020 and whole-film SSIM fell to 0.3988.
Candidate 1.2 softened that variation: final-mark SSIM recovered to 0.185994
and whole-film SSIM to 0.4014, but both remained below candidate 0.9. The new
capability is therefore retained as a general primitive, while the benchmark
video remains on the measured-best uniform treatment.

Additional 0.9 diagnostics:

| Region/pair range | MAE | SSIM | PSNR |
|---|---:|---:|---:|
| Hero, 0–68 | 0.025340 | 0.546438 | 27.107 dB |
| Phone, 69–230 | 0.039188 | 0.294708 | 21.398 dB |
| Collapse, 200–235 | 0.038106 | 0.233412 | 19.631 dB |
| Final mark, 215–273 | 0.103990 | 0.188308 | 12.714 dB |

This run supports ADR-0025's heterogeneous-particle slice. It does not establish
exact reconstruction or a competitive win, and its owner-supplied assets/audio
remain outside the repository.
