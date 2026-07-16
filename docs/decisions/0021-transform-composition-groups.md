# ADR-0021 — Transform composition groups

**Status:** accepted · 2026-07-16

## Context

Card Vault 0.6 can morph custom particle points, but its reference ring expands
while the child dots change formation. MO-KEY-1 correctly prevents a transform
track from stacking on the same particle target as `particle-morph`. The missing
hierarchy is a parent transform target with independently animated children.

## Decision

1. Add a `group` Score element containing ordered IDs of sibling elements in the
   same scene. The group is a full-stage, transform-only composition; child
   positions retain their existing stage coordinate system.
2. A child may belong to at most one group. Missing children, self-reference,
   duplicate ownership, and groups containing groups are P1 errors and compiler
   failures. Version 0.1 is deliberately one level, so cycles are impossible.
3. Grouped children render once inside the parent DOM transform context and keep
   their own stable IDs, choreography, asset hashing, text evidence, and element
   semantics. The group itself is a legal choreography target.
4. No local coordinate remapping, time remapping, nested scene timelines,
   offscreen buffers, or arbitrary compositing is added. Those require separate
   evidence and decisions.

## Consequences

- A parent can scale/rotate/translate while child particles morph, directly
  expressing the measured Card Vault ring expansion without weakening
  MO-KEY-1's exclusive-target invariant.
- The representation is portable and diffable, but intentionally not yet an
  After Effects-style precomposition. Local bounds, clipping/mattes, and deeper
  hierarchy remain future evidence-gated extensions.
