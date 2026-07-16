# ADR-0023 — Source-assisted reconstruction provenance

**Status:** accepted · 2026-07-16

## Context

Comparison 0.2 localizes Card Vault 0.7's largest residual to synthetic card
artwork, typography, and lighting. More timing-keyframe tuning would optimize a
benchmark without addressing that cause. A rights-approved reconstruction may
instead use supplied or extracted source assets, but Chitra cannot currently
distinguish that workflow from its clean-room benchmark.

The underlying asset contract is also incomplete. Figure fragments can load a
project-local image, while only the fragment HTML participates in scene hashes;
changing the nested image can therefore leave stale cached frames. Rendered
asset paths are not connected to Intake rights, and several path fields permit
traversal despite ADR-0006's project-relative rule.

## Decision

1. Score metadata may declare a reconstruction as `clean-room` or
   `source-assisted`, name the Intake reference sources, and state why that mode
   is appropriate. Existing non-reconstruction scores remain unchanged.
2. Rendered image, video, background, music, SFX, and figure-nested asset uses
   may carry typed provenance: Intake source ID, `direct` or `derived` use, and
   a concrete transformation/use note.
3. A declared reconstruction makes provenance mandatory for every rendered
   file asset. `creative-check` verifies source existence, Direction and
   Storyboard planning, and `owned`/`licensed` rights. Clean-room scores may not
   render bytes from their named references; source-assisted scores must render
   at least one named reference asset and may not use `reference-only` or
   `unknown` bytes.
4. Figure fragments declare every local nested asset explicitly. The compiler
   rejects undeclared or inline-data dependencies, resolves declarations inside
   the project boundary, and scene hashes include their bytes.
5. All Score asset paths use one normalized project-relative schema. Runtime
   resolution rejects symlinks escaping the project before a browser or FFmpeg
   consumes the file.
6. The generated benchmark uses synthetic, licensed-equivalent bytes. The Card
   Vault clean-room score stays unchanged and no supplied reference pixels are
   committed. A future source-assisted Card Vault run requires an explicit
   owner rights decision and remains labelled separately.

## Consequences

- Agents can use approved reference crops without hiding lineage or poisoning
  the clean-room renderer benchmark.
- Editing a nested card image invalidates the figure scene and transition
  neighbors deterministically.
- Passing the gate proves declared byte lineage and rights state, not legal
  ownership independently; user claims remain the authority.
- Masks, mattes, blend modes, and arbitrary clipping are still deferred. The
  source-assisted benchmark must expose a concrete visual need before those
  compositor surfaces expand.
