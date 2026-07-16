# ADR-0015 — Deterministic Reference Decomposer and Style DNA

**Status:** accepted · shipped 2026-07-16

## Context

ADR-0012 places a Reference Decomposer at the entrance to Chitra's creative
pipeline, but “analyze this reference” is currently an untyped agent exercise.
That invites confident aesthetic labels with no evidence, inconsistent shot
counts, and no stable artifact that downstream planning or benchmarks can diff.

The two supplied references demonstrate the need at different scales: a
274-frame, 9.2-second card film and an 81.6-second product film. Before Chitra
can recreate either grammar, it needs defensible measurements and evidence,
not a model's prose impression.

## Decision

1. Add a versioned `StyleDNA` artifact produced by `chitra decompose`. The
   deterministic layer owns source identity, media facts, cut/shot timing,
   rhythm statistics, sampled palette, luminance/saturation, frame-difference
   motion energy, audio onset/beat candidates, and one evidence frame per
   detected shot.
2. Reuse pinned dependencies already in the core: ffprobe for media facts,
   ffmpeg for scene detection/frame extraction/audio decode, sharp for raw
   pixels, and the ADR-0011 beat analyzer. No model or network call enters
   `core/`.
3. Sampling is explicit and bounded. The artifact records requested/effective
   FPS, scene threshold, sample dimensions, and analyzer versions. Long inputs
   reduce effective sampling rate rather than exhausting memory or disk.
4. Semantic dimensions that pixels cannot establish reliably—typography class,
   camera intent, narrative function, and emotion—remain typed as `unmeasured`
   review slots. An agent may later create a separate evidence-linked semantic
   annotation; the deterministic artifact never fabricates one.
5. Benchmark the decomposer first on a generated three-shot film with known
   cuts and colors, then exercise it on both supplied references. Do not commit
   copyrighted source media or bulky extracted evidence.

## Alternatives rejected

- **VLM-only analysis:** useful later for semantics, but non-reproducible and
  incapable of grounding basic media/cut/color claims by itself.
- **OpenCV/shot-detection dependency:** unnecessary for the first measurable
  contract; ffmpeg and sharp already cover the required surface.
- **One prose report:** cannot be schema-validated, diffed, gated, or consumed
  safely by Storyboard/Score planners.

## Consequences

- “Make it like this” gains a deterministic, inspectable input artifact.
- Style DNA measures visual behavior; it does not yet compare a Chitra render
  to the reference. Alignment and frame/audio difference metrics remain the
  next separate slice.
- Scene detection and motion energy are heuristics with recorded thresholds;
  ChitraBench must measure their accuracy before stronger claims.
