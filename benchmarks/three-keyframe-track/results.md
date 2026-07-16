# Textured 3D property-track benchmark — 2026-07-16

ADR-0028 browser verification at 640×360, 30fps with generated owned artwork.

| Frame | Mesh X | Rotation Y | Camera FOV | Exposure | Result |
|---:|---:|---:|---:|---:|:---:|
| 30 | 0.35 | 28.00° | 32.00° | 1.25 | pass |
| 0 | -0.40 | -24.00° | 34.00° | 1.10 | pass |
| 15 | 0.00 | 8.00° | 30.00° | 1.40 | pass |

- Texture ready before capture: **passed**
- Exact authored states: **3/3 passed**
- Random seek order: **30 → 0 → 15 passed**
- Repeated frame-15 PNG: **byte-identical** (bc626b98ddac01a3…)
- Static gates: **0 P1/P2 findings**
