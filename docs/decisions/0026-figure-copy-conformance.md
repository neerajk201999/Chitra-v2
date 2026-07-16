# ADR-0026 — Figure copy participates in creative conformance

**Status:** accepted · 2026-07-16

## Context

Storyboard copy authored inside a sanctioned figure fragment passed rendered
typography gates but failed `CC-SCORE-4`, because Storyboard→Score conformance
only inspected top-level `text` elements. Deleting approved copy from the
Storyboard or duplicating it as hidden Score text would weaken the trust chain.

## Decision

When the Score project directory is available, Storyboard→Score conformance
loads figure fragments through the existing project-local, symlink-safe asset
resolver. It removes style/script/tag markup, decodes common HTML entities,
normalizes whitespace, and treats matching figure text as authored Score copy.
Top-level `text` matching remains exact. Library calls without a project
directory preserve their previous pure-data behavior.

## Consequences

- Complex product UI can preserve approved Storyboard copy without false P1s.
- Nested spans and ordinary HTML formatting do not break copy matching.
- This proves that copy is authored in the local figure; ADR-0024 rendered DOM
  gates remain responsible for its visibility, geometry, contrast, and overlap.
- No remote fetch, HTML execution, new dependency, or arbitrary filesystem read
  enters conformance.
