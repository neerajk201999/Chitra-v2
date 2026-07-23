# Compositing and local-composition benchmark — 2026-07-23

- Schema/compiler/browser pipeline: **pass**
- Nested local widths: **160 → 80 → 40 px**
- Blend/filter/clip computed styles: **pass**
- Motion/appearance filter isolation: **pass**
- Project-local alpha/luminance matte pixels: **pass**
- Matte-byte cache invalidation: **pass**
- Repeated frame capture: **byte-identical** (c3df9268f9885eeb…)
- Runtime dependencies added: **0**
- Full package dry-run: **603.0 kB compressed / 2.4 MB unpacked**
  (pre-tranche documented package: 586.1 kB / 2.2 MB)

This is a first-party deterministic substrate test, not evidence of superior
motion-design taste or complete HyperFrames parity.
