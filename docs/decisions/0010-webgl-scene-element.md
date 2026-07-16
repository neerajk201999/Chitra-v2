# ADR-0010 — WebGL scene element (real 3D) — BUILT

**Status:** accepted · shipped 2026-07-15. Headless Chrome with `--use-angle=swiftshader` renders Three.js byte-identically on re-render and produces a genuine 3D card (perspective, clearcoat, PMREM environment). WebGL flags are conditional (only when a `scene3d` is present), so 2D renders stay byte-identical to before.

## Context

The single reason Chitra cannot reproduce a 3D-rendered reference "exactly" is
that it has no real 3D. CSS `perspective` on a figure approximates a flat card;
it cannot do travelling specular highlights, depth of field, or true rotation.
Remotion ships `@remotion/three`. This is the honest visual gap
(docs/research/honest-gap-vs-remotion-editframe.md §1).

## Decision

1. **`scene3d` element** — a vetted, self-contained Three.js scene we drive, not
   arbitrary user script. Author picks from curated 3D primitives (card, phone,
   logo-extrude, particle-cloud) parameterized by tokens; we own the Three code.
2. **Determinism via seek clock.** The scene never reads the wall clock; its only
   time input is our `seek(ms)`. Three.js is deterministic under a fixed clock
   and fixed geometry/seed, exactly like GSAP — so byte-identical re-render holds.
   Requires allowing ONE vetted `<canvas>`+module in the compiled page (a
   controlled exception to the figure sanitizer, scoped to our own bundle).
3. **Gated like everything else.** 3D scenes render to pixels the frame gates
   already read; a new MO-3D rule bounds camera speed and requires the subject to
   settle (no perpetual spin = slop).

## Remaining scope

The curated card/coin/slab set and seek-driven runtime are built. Cross-machine
golden-frame CI, additional primitives, and authored internal camera/mesh tracks
remain future work; ADR-0013 adds only a typed transform track around the canvas.
