# Frame-addressed transform benchmark — 2026-07-16

ADR-0013 browser-level verification at 640×360, 30fps. The harness seeks the
compiled page to authored frames and reads GSAP's evaluated transform state.

| Frame | X px | Y px | Rotation Y | Opacity | Result |
|---:|---:|---:|---:|---:|:---:|
| 30 | 64.00 | -18.00 | 0.00° | 1.00 | pass |
| 0 | 0.00 | 0.00 | -20.00° | 0.20 | pass |
| 15 | 32.00 | -7.20 | 5.00° | 0.70 | pass |

- Exact keyframe states: **3/3 passed**
- Random seek order: **30 → 0 → 15 passed**
- Repeated frame-15 PNG capture: **byte-identical** (811182dcc8c36650…)
- Static quality gates: **0 P1/P2 findings**

Reproduce: `cd core && npm run build && cd .. && node benchmarks/keyframe-track/run.mjs`.
