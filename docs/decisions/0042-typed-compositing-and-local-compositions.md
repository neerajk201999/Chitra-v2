# ADR-0042 — Typed compositing and local compositions

**Status:** implemented · 2026-07-23

## Context

The current HyperFrames source can inline arbitrary HTML sub-compositions and
exposes masks, shaders, filters, and blend treatments. Chitra's one-level,
full-stage groups cannot express a masked product reveal, a clipped local UI
module, or a parent composition whose children use local coordinates. The
Card Vault residual and the source-verified parity audit both identify this as
a real production blocker.

Copying HyperFrames' raw HTML/CSS/script-inlining model would also copy its
scoping problem: selectors, IDs, scripts, assets, and timing APIs must be
rewritten across composition boundaries. Chitra already has a typed flat
element registry, stable selectors, project-local asset trust boundary, and one
seek clock. The missing abstraction is bounded composition, not arbitrary code.

## Decision

1. Every Score element receives an optional typed `compositing` contract:
   opacity, a closed blend-mode set, isolation, bounded CSS filters, typed
   inset/circle/ellipse/polygon clips, and alpha/luminance mattes from a
   project-local PNG/JPEG/WebP/SVG or bounded linear/radial gradient.
2. Project-local matte bytes are resolved through the existing asset boundary,
   inlined as data URLs at compile time, included in render inputs, provenance,
   cache identity, and release identity, and decoded before capture. Rendering
   never depends on a browser network or file fetch.
3. Motion and appearance use separate DOM layers. Choreography targets the
   stable outer `.el`; authored compositing lives on an inner `.comp`. A
   `blur-focus` motion therefore cannot erase a persistent grade, clip, or
   matte.
4. Groups become reference-addressed local compositions. The scene remains one
   flat ID registry, while a group establishes typed position, width, height,
   overflow, and local percentage coordinates for its children. Groups may
   contain groups to a maximum depth of eight.
5. Every child has one owner. Duplicate IDs, duplicate children, missing
   children, multiple ownership, cycles, and depth overflow fail schema, static
   gates, or compilation before pixels are captured. Child and group IDs remain
   stable choreography/evidence targets.
6. Compositing parameters are static in this version. Existing transform and
   opacity tracks may animate the outer layer; there is no arbitrary CSS,
   shader, script, mask-path animation, time remapping, offscreen render graph,
   or nested independent timeline.
7. Scene capacity rises from 12 to 64 typed elements and each group may address
   up to 32 children. These are explicit complexity bounds, not a claim of
   unbounded After Effects-style precomposition.

This decision supersedes ADR-0021's one-level/full-stage restriction while
preserving its flat registry, stable IDs, ownership, and independent
parent/child choreography.

## Alternatives rejected

- **Inline arbitrary HTML sub-compositions:** broad but creates CSS/script/ID
  scoping, security, dependency, and determinism work that Chitra does not need
  to solve the user job.
- **Pre-render every treatment:** deterministic but destroys semantic
  editability, resolution independence, local revision, and provenance detail.
- **Adopt a general WebGL compositor now:** adds install/runtime weight and a
  second layout model before browser-native compositing has shown a measured
  ceiling.
- **Leave groups full-stage and one-level:** keeps the implementation small but
  cannot express the verified mask/local-composition production jobs.

## Evidence and boundaries

`benchmarks/compositing/run.mjs` validates schema → compiler → Chromium pixels:

- nested local widths resolve 160 → 80 → 40 px;
- blend, persistent filter, motion filter, clip, and mask styles coexist;
- project-local alpha and luminance mattes suppress the left side and reveal
  the right;
- matte byte changes invalidate scene identity;
- repeat capture of the same composited frame is byte-identical.

This proves a deterministic first-party substrate on the tested browser. It
does not prove animated masks, shaders, motion blur, cross-browser pixel
identity, complete HyperFrames parity, or superior creative quality.
