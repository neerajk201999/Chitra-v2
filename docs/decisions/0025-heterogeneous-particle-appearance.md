# ADR-0025 — Heterogeneous particle appearance

**Status:** accepted · 2026-07-16

## Context

The rights-approved Card Vault source-assisted 0.9 run improves whole-film SSIM
to 0.401685, but regional comparison isolates the final mark as the largest
remaining appearance residual: MAE 0.103990 and SSIM 0.188308 over pairs
215–273. The reference mark uses intentionally irregular luminous dots; Chitra
can author the positions and morph trajectory but renders every dot at one size,
opacity, and glow.

The missing capability is bounded appearance data, not an arbitrary particle
runtime, shader language, or physics system.

## Decision

1. Custom base points may optionally declare `size` (0.25–2× the field's
   `dotSize`) and `opacity` (0.05–1). Generated formations remain uniform.
2. A particle field may declare `glow` (0–4× each rendered dot diameter), with
   the existing 1.5× appearance as the compatibility default.
3. Appearance belongs to the base dot identity and persists while that dot
   morphs. `morphPoints` remain positional only; destination appearance is not
   silently accepted and ignored.
4. The compiler emits only deterministic CSS size, opacity, and shadow values.
   No wall clock, random runtime, network, blend mode, or new dependency enters.
5. Schema bounds reject invisible, unbounded, or pathological values. The
   compiler cache version changes because generated HTML changes.

## Consequences

- Agents can express irregular dot-matrix logos, constellations, depth cues, and
  controlled luminous noise without hiding creative data in figure CSS.
- Existing scores preserve their previous 1× size, opacity 1, and 1.5× glow.
- This does not add motion blur, per-frame appearance tracks, particle physics,
  blend modes, or arbitrary shaders. Those remain evidence-gated.
