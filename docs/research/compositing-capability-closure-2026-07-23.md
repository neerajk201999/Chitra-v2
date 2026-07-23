# Typed compositing capability closure — 2026-07-23

This is the implementation evidence following the immutable
[HyperFrames/studio-process audit](hyperframes-and-studio-process-audit-2026-07-23.md).
It updates Chitra's current status without rewriting the audit snapshot.

## Source finding

HyperFrames commit `7a294f1` implements sub-composition inlining through
`packages/core/src/compiler/inlineSubCompositions.ts` and selector/ID/script
rewriting through `compositionScoping.ts`. That is appropriate for an arbitrary
HTML runtime, but it makes scoping and executable-code trust part of the
composition contract.

Chitra instead keeps one typed scene registry and one seek clock. ADR-0042 adds
local coordinate groups and browser-native typed compositing without admitting
raw CSS or script. This is a better abstraction for deterministic agent editing
where the requested job fits the typed surface; it is deliberately less broad
than arbitrary HTML.

## Capability result

Now native:

- static alpha/luminance asset mattes and linear/radial gradient mattes;
- inset, circle, ellipse, and polygon clips;
- opacity, isolation, 17 blend modes, and seven bounded filter operations;
- nested local-coordinate groups with single ownership, cycle checks, and depth
  limit eight;
- project-local matte provenance/cache/release binding;
- independent motion and appearance layers.

Still not closed:

- animated mask paths, filter parameters, or blend values;
- shader/WebGPU authoring and arbitrary executable runtimes;
- motion blur, depth of field, filmic color management, HDR, and alpha export;
- independent nested timelines or time remapping;
- cross-browser/cross-machine golden-pixel equivalence.

The first-party real-browser benchmark is recorded in
`benchmarks/compositing/results.md`. This closes one important user-job gap; it
does not establish complete HyperFrames parity or watched-output superiority.
