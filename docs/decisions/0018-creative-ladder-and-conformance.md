# ADR-0018 — Creative ladder and end-to-end intent conformance

**Status:** accepted · 2026-07-16

## Context

ADR-0012 defines a creative ladder, and ADR-0017 now preserves multimodal input
truth, but Chitra still jumps from a thin Direction directly to executable
Score. The missing Storyboard tier means composition, camera, copy, timing, and
transition decisions are improvised while scoring. Existing Direction↔Score
checks can detect dropped scene IDs but cannot prove that user preferences,
brand constraints, planned copy, or shot intent survived.

Repository research reaches the same conclusion: this is a schema and
conformance problem, not a reason to embed a provider-specific model or hosted
orchestrator in the deterministic core. Agents make creative judgments; Chitra
makes those judgments explicit, traceable, gateable, and revisable.

## Decision

1. Direction becomes a separately identified creative artifact with
   `directionVersion: 0.2.0`. It adds a governing creative concept and trace IDs
   back to Intake sources, preferences, brand constraints, and assumptions.
   Each directed beat cites the source and preference IDs that shaped it.
2. Add `Storyboard 0.1.0` between Direction and Score. Every shot cites a
   directed beat and records why it exists, why now, intended hero, composition,
   camera, typography/copy, colour, duration, transition, audio, and evidence
   provenance. A Storyboard shot ID is the Score scene ID.
3. Add deterministic gates for the full ladder:
   - Intake→Direction: project/register identity, valid trace IDs, must-level
     preference and brand coverage, blocked questions, and assumption status.
   - Direction→Storyboard: beat coverage, no invented beats, order, trace
     containment, hero delivery, and relative pacing.
   - Storyboard→Score: shot/scene coverage, register, duration tolerance,
     planned copy, and planned hero element type.
4. Add one `chitra creative-check intake direction storyboard score` command
   that validates every artifact and runs all three gate boundaries. Existing
   `plan` and Direction↔Score `conform` commands remain for compatibility.
5. The core does not generate Direction or Storyboard. Model-facing skills read
   the Creative Constitution and author the artifacts; deterministic code
   validates structure and traceability. Semantic quality remains a calibrated
   critic/ChitraBench responsibility.

## Alternatives rejected

- **Prompt directly to Score:** fastest first draft, but user intent and shot
  decisions disappear into model context and cannot be patched independently.
- **Hosted multi-agent orchestrator:** provider coupling, hidden memory, and no
  deterministic recovery from the repository.
- **A single giant Brief object:** fewer files but no approval/edit boundary
  between concept, narrative beats, shot design, and execution.
- **Deterministic semantic scoring by string similarity:** false precision; a
  paraphrase can be faithful and copied words can still betray the intent.

## Consequences

- A user can change a preference, concept, or shot without regenerating the
  whole film, and gates identify the downstream artifact that drifted.
- Models remain replaceable because every model receives the same typed
  contract and failure IDs.
- Direction 0.1 artifacts require migration to add identity, concept, and trace
  fields; Score IR remains unchanged.
- Passing conformance proves coverage and traceability, not professional taste.
  Blind preference and calibrated semantic review remain explicit benchmarks.
