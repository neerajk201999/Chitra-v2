# ADR-0013 — Frame-addressed transform tracks

**Status:** accepted · shipped 2026-07-16

## Context

ADR-0012 freezes renderer expansion unless a concrete target film exposes a
specific missing capability. The supplied Card Vault reference is exactly 274
frames at 30fps and uses authored card/phone perspective, rotation, scale, and
opacity changes that cannot be represented by Chitra's curated entrance/exit
presets or the fixed `scene3d` oscillation. Approximation is possible; exact
frame reconstruction is not.

The missing primitive is not arbitrary JavaScript. It is a small, typed track
whose states are addressed in output frames and evaluated by the existing
seek-only timeline.

## Decision

1. Add a `keyframe-track` choreography preset. Its `keyframes` are relative to
   the animation start and use integer output-frame indices. Frame zero is
   required; the final frame determines the animation duration from `meta.fps`.
2. The typed property surface is deliberately bounded to transform and
   compositing properties needed by the reference: stage-relative X/Y offsets,
   uniform or axis scale, X/Y/Z rotation, opacity, CSS perspective, and a
   tokenized transform origin. Each arriving keyframe may choose a named Chitra
   easing; raw easing strings remain forbidden.
3. `keyframe-track` requires `override.reason`. The escape hatch must explain
   why a curated preset cannot express the shot. `MO-KEY-1` rejects missing or
   misplaced tracks and tracks that outlive their scene.
4. The compiler serializes the typed track into the existing deterministic GSAP
   master timeline. The browser runtime reads no wall clock and evaluates only
   `seek(ms)`, preserving random-access rendering and cache behavior.
5. This is a DOM transform track. It can animate any rendered element,
   including a `scene3d` canvas as a layer, but does not yet author the internal
   Three.js camera or mesh. A true 3D property-track extension requires separate
   evidence and an ADR.

## Consequences

- A 30fps score can now state exact visual states at frames 0…273 and seek them
  reproducibly, closing the most immediate Card Vault reconstruction gap.
- Curated presets remain the default vocabulary; exact tracks are an explicit,
  reviewable exception rather than an untyped animation back door.
- Masks/mattes, nested compositions, blend modes, motion blur, internal 3D
  camera/mesh tracks, richer audio, and automated reference frame-difference
  comparison remain separate capabilities. This ADR makes no exact-recreation
  claim until those gaps and the comparison benchmark are closed.
