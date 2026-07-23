# ADR-0020 — Typed custom particle constellations

**Status:** accepted · 2026-07-16

## Context

ADR-0012 permits renderer expansion only when a concrete target exposes a
measured gap. The exhaustive Card Vault clean-room 0.5 comparison authors all
274 target frames, but the closing particle move is structurally wrong: the
reference changes from a circular cloud into a specific dot-matrix mark while
Chitra can morph only among grid, ring, and scatter. A static HTML approximation
matches the held close but cannot express the trajectory.

The missing primitive is a bounded destination constellation, not an arbitrary
particle script or physics engine.

## Decision

1. A `particles` element may use `formation:"custom"` with `points`, an ordered
   array of normalized `{x,y}` coordinates inside its own 0–100 box.
2. `particle-morph` may use `morphTo:"custom"` with `morphPoints`. Source and
   destination counts must match, coordinates must remain in bounds, and both
   arrays remain capped at 400 dots by schema; grid density above 400 is
   reviewable under MO-PART-2 rather than release-blocking.
3. Custom data is legal only on its matching surface: `points` only with a
   custom base formation; `morphPoints` only with a custom particle morph.
   Misuse is a P1 rather than a silent fallback.
4. The existing compiler maps points by stable array index, converts normalized
   deltas to pixels, and uses the existing seek-driven GSAP timeline. No random
   matching, nearest-neighbour reassignment, wall clock, or runtime network is
   introduced.
5. Existing grid/ring/scatter scores and compiler behavior remain compatible.

## Consequences

- Card Vault can author the measured ring-to-mark close with a portable typed
  score rather than hiding the trajectory inside untyped figure CSS.
- Point order becomes creative data: agents must order source/destination dots
  intentionally when crossing paths matter. Automatic assignment can be added
  later only if a benchmark proves it necessary.
- This does not add masks, blend modes, motion blur, internal Three.js tracks,
  physics, or arbitrary per-particle styling. Those remain separate evidence-
  gated capabilities.
