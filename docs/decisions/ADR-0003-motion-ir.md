# ADR-0003: The Motion IR — a two-tier, schema-validated, diffable representation

**Status:** Accepted · **Date:** 2026-07-14 · **Informed by:** docs/research/{openmontage,hyperframes,video-use,landscape}.md

## Context

Every studied system fails at the representation layer in a different way: Remotion's videos are arbitrary TSX (agents can't edit structurally; nothing is checkable), HyperFrames' are arbitrary HTML (silent-failure footguns; taste enforced by prose), OpenMontage's EDL is checkable but too low-level to carry design intent. The IR is where Chitra wins or loses: it must be simultaneously **expressive enough for cinematic intent, constrained enough to validate, and diffable enough for surgical revision**.

## Decision

Chitra's IR has **two tiers, both schema-validated (JSON Schema / zod), both version-controlled artifacts**:

### Tier 1 — Direction (intent; written by director agents, read by critics)
Per video: narrative arc, tone, format/register (brand film · product demo · social short — registers get different quality rubrics, per Impeccable's register system). Per scene: `narrative_role`, `shot_intent`, `hero_moment`, composition notes, pacing weight. Carries the *why* that critics evaluate the render against.

### Tier 2 — Score (execution; compiled to the render backend)
The precise, deterministic description of what happens on screen:

- **Scenes → layers → elements**: typed elements (text, shape, image, video, chart, device-frame, …) with layout expressed against a grid/token system, never raw magic numbers.
- **Choreography**: animations reference **named motion tokens** (easing families, duration scale, stagger patterns, transition types) from the motion language (`docs/motion/`). Raw cubic-beziers and ad-hoc durations are schema violations by default; escape hatch requires an explicit `override` with a reason string.
- **Relational timing** (EditFrame's best idea): elements time themselves relative to siblings/parents (sequence, contain, fit, overlap) so edits don't cascade into manual re-timing.
- **Per-scene and per-cut `reason` fields** (OpenMontage's best idea): every creative decision is explainable, hence critiquable.
- **Audio as a first-class track**: music with beat grid, narration with word timestamps, sync points that choreography can reference ("land on beat").
- **Determinism fields**: seeds, asset content hashes, font versions.

## Why two tiers

Critics need intent to judge execution ("this scene's `hero_moment` never visually peaks"). Compilers need execution free of prose. Collapsing them (HyperFrames) makes quality unenforceable; dropping intent (OpenMontage's EDL alone) reduces critique to lint.

## Consequences

- **Structural prevention**: the compiler generates IDs, the master timeline, and transform composition — HyperFrames' entire documented footgun class becomes unrepresentable.
- **Surgical revision**: critics cite IR paths (`scenes[3].choreography[1]`); the editor patches spans; only dirty scenes recompile and re-render (content-hash per scene → incremental, parallelizable, cacheable renders).
- **Token-gated taste**: "all motion uses tokens" turns most of taste enforcement into cheap deterministic validation instead of LLM judgment.
- Cost: we must design and document schemas extremely well — the IR spec *is* the product's grammar. Versioned from day one (`irVersion`), with migration notes.
