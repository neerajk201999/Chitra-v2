# ADR-0043 — Seekable Lottie is a typed import, not an arbitrary runtime

**Status:** accepted for implementation · 2026-07-23

## Context

HyperFrames supports Lottie through a generic runtime adapter. A composition
loads its own `lottie-web` or dotLottie script—often from a CDN—creates an
instance, and the adapter discovers and seeks it. This is broad, but runtime
choice, network behavior, JSON loading, readiness, registration, error
handling, and version identity remain composition responsibilities.

For Chitra, the user job is simpler: place an authorized vector animation,
trim/map it to a scene, compose it like any other typed element, and obtain the
same pixels under random seeks. Admitting arbitrary runtime scripts would
weaken the trust boundary established by the Score.

Current package evidence:

- `lottie-web@5.13.0` is MIT but ships 25.4 MB unpacked across many builds;
- its full SVG-only minified runtime is 242,630 bytes;
- the light minified runtime is 168,394 bytes but omits effects/expressions;
- dotLottie and Rive add separate binary/WASM runtimes and lifecycle behavior.

Installing the full npm package merely to execute one browser build would
repeat the dependency-weight problem ADR-0033 removed.

## Decision

1. Add a typed `lottie` Score element for project-local `.json` animation data.
   It has normal position, local-composition dimensions, compositing, fit, and
   a bounded scene-relative playback contract.
2. Vendor exactly one audited MIT SVG runtime file and its license. Include it
   in compiled HTML only when the Score contains a Lottie element. Do not add
   the 25.4 MB `lottie-web` npm dependency.
3. Parse and validate animation JSON during compilation. Require finite positive
   `fr`, finite `ip < op`, positive bounded `w`/`h`, and a layer array. Reject
   external image/font/network assets, expression strings, malformed JSON, and
   unsupported data URLs rather than silently degrading.
4. Inline both runtime and animation data. Rendering performs no network or
   browser file fetch. Animation bytes participate in provenance, render inputs,
   scene cache, and release identity.
5. Instantiate with `autoplay:false`, `loop:false`, and the SVG renderer. A
   readiness promise must resolve only after every instance reports DOM loaded;
   any load/runtime failure blocks session creation.
6. Chitra's seek clock computes one exact raw animation frame from scene-local
   time. The typed playback range supports start/end frame, start offset,
   duration, bounded iterations, and normal/reverse/alternate direction.
   Seeking is clamp/modulo arithmetic with no wall clock or call-order state.
7. Lottie remains inside the same stable `.el` motion layer and `.comp`
   appearance layer as native elements, so it can be nested, clipped, masked,
   blended, and choreographed without a second composition system.
8. This tranche does not claim dotLottie, Rive, glTF, expressions, external
   image/font assets, Canvas renderer parity, or every After Effects feature.
   Those remain separately named capability states.

## Acceptance evidence

Before capability status becomes native:

- generated vector fixture with at least three visually distinct frames;
- random seek order including backward and repeated frames;
- exact repeated PNG bytes at the same source frame;
- fit/local-composition geometry and authored compositing coexist;
- malformed range, expression, external asset, traversal/symlink, changed byte,
  and runtime-load failures reject;
- package dry-run and isolated install record the actual cost;
- full repository verification passes on local macOS and protected Linux CI.

## Alternatives rejected

- **Depend on the complete `lottie-web` package:** easiest import, but adds tens
  of megabytes of unexecuted builds and source to every install.
- **Load a CDN runtime or JSON path:** smaller package, but violates offline
  rendering, provenance, readiness, and reproducibility.
- **Accept arbitrary adapter JavaScript:** broadest parity, but turns every
  Score into executable code and recreates HyperFrames' runtime/scoping burden.
- **Pre-render Lottie to video:** deterministic, but loses vector scaling,
  source-frame editing, local compositing, and small surgical revisions.
- **Bundle Rive/dotLottie in the same tranche:** conflates independent WASM and
  binary-container risks before Lottie establishes the adapter contract.
