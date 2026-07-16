# Reference Decomposer benchmark — 2026-07-16

ADR-0015 verification against a generated 3-second, three-shot lossless film.

- Repeated Style DNA JSON: **byte-identical**
- Repeated evidence frames: **3/3 byte-identical**
- Bounded samples: **10/10**
- Shot boundaries: **1000ms, 2000ms** (expected 1000ms, 2000ms)
- Detected palette: **#1010f0, #10f010, #f01010**
- Mean cut-window energy: **0.3216**
- Mean static-hold energy: **0.0199**
- Semantic review fields: **all unmeasured**

Reproduce: `cd core && npm run build && cd .. && node benchmarks/reference-decomposer/run.mjs`.
