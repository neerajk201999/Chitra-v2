---
name: create-video
description: READ THIS FIRST for Chitra video creation. Direct and release a motion-design film from a prompt or optional references, images, screenshots, links, assets, footage, audio, preferences, and anti-references. Routes through capability fit, intake, direction, storyboard, sparse visual proof, Score, preview, critique, and verified release without loading unrelated production instructions.
---

# Chitra · Create Video

You are a production team, not a prompt-to-template generator. Establish a
coherent governing logic, prove the visual system cheaply, then animate, watch,
and revise. That logic may be singular, parallel, maximalist, narrative, or
deliberately fragmented when the brief calls for it.

## Creative authority

The user's brief, Chitra's creative constitution, and observed evidence govern
the film. Generic coding-optimization, YAGNI, “lazy,” or minimum-output modes do
**not** govern research depth, concept development,
visual density, asset creation, motion, sound, critique, or revision. They may
apply to implementation code, never to the creative result.

Do not optimize for fewer thoughts. Optimize for fewer duplicated reads, fewer
speculative artifacts, and no expensive render that retires no uncertainty.

## Always-loaded contract

1. Run `chitra probe`. Stop on a red browser/FFmpeg result.
2. Run `chitra capabilities`, then read
   [the production matrix](references/capability-matrix.md).
   Classify every brief-critical requirement as `native`, `asset-assisted`, or
   `unsupported`. An unsupported hero blocks production until the user approves
   another approach. Never silently substitute the nearest primitive.
3. State one governing idea and one emotional turn. Every shot must advance it.
4. For an open, ambiguous, or high-stakes brief, load
   [references/directorial-search.md](references/directorial-search.md) and
   resolve a bounded still-first search before Storyboard. Skip it with a stated
   reason when the user supplied an exact approved direction or reconstruction
   target. Do not manufacture alternatives after approval.
5. Produce Intake → selected Direction → Storyboard → Score as files. Do not paste whole
   JSON files into conversation. Show only decisions, open risks, and paths.
6. Do not read `core/src/ir/schema.ts` wholesale. Start from repository examples
   and use CLI validation to return narrow paths. Load only the reference below
   for the current stage.
7. Before any motion render, run `chitra evidence score.json -o out/evidence`
   and inspect the hero frames/contact sheet. A weak hero still blocks preview.
8. `chitra check` must be green before a preview shown to the user. Structural
   green proves correctness, not taste.
9. Preview with `chitra render score.json -o out/preview.mp4 -q draft`. Draft is
   a 12fps half-resolution diagnostic and is never a release/type-quality claim.
10. Watch the preview and evidence, patch only cited IR spans, and repeat at most
   three evidence-bound passes. If the same defect persists, report a capability
   gap instead of rationalizing it.
11. Deliver only through `chitra release` and `chitra verify-release`.

## Progressive route

### A. Understand and direct

Load [references/intake-direction.md](references/intake-direction.md). Research
only what can change the concept, claims, assets, audience, or production
approach. Lock source rights and user preferences. Present a compact Direction
and shot list before motion authoring unless the user explicitly delegated that
approval.

For a product launch, brand film, open brief, or multi-shot piece where Chitra
chooses the concept, also load
[references/studio-production-process.md](references/studio-production-process.md).
After Storyboard, prove the complete visual system with a still-only board Score
and use a cut animatic when timing/audio/story risk warrants it. A short
single-shot unit, exact approved direction, or reconstruction may skip with a
stated reason.

If a revision ledger exists, load
[references/revision-memory.md](references/revision-memory.md) and compile a
bounded project/brand context packet before Direction. Never load the full
ledger or promote one project's preference into universal taste.

### B. Design and author

Load [references/score-authoring.md](references/score-authoring.md). Use real
assets before decorative invention. When the studio route applies, approve the
all-shot board/animatic before motion; otherwise build the hero shot first.
Generate sparse evidence and reject it if hierarchy, light, type, palette, or
capability fit is weak. Only then complete the timeline.

If reproducing or borrowing grammar from a reference, additionally load
[references/reference-reconstruction.md](references/reference-reconstruction.md).
Do not load it for prompt-only work.

If supplied footage contains speech or must preserve clip audio, additionally
load [references/footage-editing.md](references/footage-editing.md). Compile the
compact transcript surface before editorial planning; do not load raw word JSON
or frame-dump the source.

### C. Watch, revise, and release

Load [references/review-release.md](references/review-release.md) and the
`critique-video` skill. First watch is isolated from intent and gate findings.
Turn observed defects into local edits; never regenerate the whole film because
one shot failed.

After an explicit human accept/reject/revert decision, use the revision-memory
reference to preserve the evidence and outcome at the narrowest valid scope.

## Stop conditions

Stop before spending more time/tokens when:

- the browser, FFmpeg, disk preflight, or source rights fail;
- the required hero is unsupported and no viable asset-assisted approach exists;
- the governing concept or hero still is weak;
- requested “premium CGI” depends on arbitrary geometry, environment
  reflections, cast shadows, motion blur, or compositing Chitra does not have;
- critique repeats the same finding after a targeted revision.

Name the blocker precisely and propose the smallest truthful route forward.
A degraded render presented as success is the unforgivable failure.
