# ADR-0036 — Direction is selected through bounded still-first search

**Status:** shipped · 2026-07-18

## Context

The most expensive failure in agent-made launch films is often upstream of
motion: the first plausible concept is animated before anyone proves that its
governing idea, hero image, emotional turn, or brand specificity is strong.
Rendering more frames cannot repair a generic direction. Conversely, asking an
agent for many text-only concepts rewards verbal fluency rather than watched
evidence and consumes context without retiring visual uncertainty.

Chitra already has typed Intake, Direction, Storyboard, Score, rendered evidence,
Creative Review, and accepted-revision memory. It lacks the decision transaction
between Intake and an approved Direction: a small number of materially different
directions, cheap comparable hero probes, identity-blind selection, and a durable
record of why one path advanced.

## Decision

1. Add Directorial Search 0.1. A search binds one locked Intake and two to four
   candidate Direction files. Each candidate declares a distinct narrative
   mechanism, hero composition, motion premise, tradeoff, and failure mode.
2. Each candidate supplies a valid diagnostic Score with one to three probe
   scenes. Probe roles are `opening`, `hero`, or `resolution`; every candidate
   must use the same ordered role set so comparison is fair. Each probe maps to
   an actual Direction beat, exact Score scene, bounded settled offset, and one
   uncertainty-retiring question.
3. `chitra direction-search-lock` validates Intake→Direction conformance,
   capability fit, register/deliverable agreement, probe/beat/scene addressing,
   P1 static gates, exhaustive pairwise distinction rationales, and normalized
   Direction/Score SHA-256. Changed candidate semantics invalidate the search.
4. `chitra direction-probes` opens each diagnostic Score in the existing
   deterministic renderer, runs rendered P1 gates, captures only requested
   stills, and emits:
   - a private content-addressed manifest mapping candidate IDs to blind IDs;
   - an identity-free reviewer packet with frames labelled only by blind ID and
     probe role;
   - a comparable contact sheet;
   - per-role normalized pixel differences used only to detect near-identical
     probes, never to rank aesthetics.
5. Blind IDs are derived from the locked search digest and candidate ID, then
   sorted independently of author order. Blinding is procedural, not magical:
   the reviewer contract declares that identity, Direction files, and private
   mapping were unseen before decision. Core can validate the declaration but
   cannot independently prove reviewer behavior.
6. Add Blind Direction Selection 0.1. A complete decision covers every blind
   candidate, records first read, evidence-bound dimensional judgments,
   ranking, winner rationale, loser reasons, salvageable ideas, uncertainty,
   and reviewer provenance. The winner must rank first; every loser must be
   addressed; near-identical search candidates block selection.
7. `chitra direction-select` resolves the blind winner only through the private
   manifest and writes a hash-bound receipt naming the exact winning Direction.
   That receipt is the authority to proceed to Storyboard. It is evidence of a
   disciplined decision, not proof that the decision is professionally good.
8. Core makes no LLM or network call and creates no concepts. Host agents author
   candidate Directions and probe Scores using progressive skills and supplied
   evidence. Two to four candidates are a hard bound: enough for real contrast,
   small enough for deliberate craft.

## Alternatives rejected

- **Animate the first Direction:** spends most production cost before the
  highest-leverage decision is tested.
- **Generate ten text concepts:** encourages synonym variation, overwhelms
  review, and does not prove a visual system.
- **Full Storyboard/Score per candidate:** turns exploration into parallel film
  production and biases selection toward sunk cost.
- **Automatic weighted taste score:** uncalibrated dimensions create false
  precision and Goodhart the work. Ratings remain evidence attached to a human
  or declared model decision.
- **Random opaque IDs without a private mapping receipt:** harms reproducibility
  and auditability. Digest-derived IDs are stable while the reviewer packet
  remains identity-free.
- **Treat pixel difference as creative difference:** palette noise can create a
  large MAE while two ideas remain identical. Pixel metrics only catch near-
  duplicate rendered probes; conceptual distinctions remain explicit contracts.

## Consequences

Chitra can reject weak direction before expensive motion and retain a reversible,
auditable selection. It still cannot autonomously guarantee originality, brand
specificity, or professional taste. Blind-selection outcomes must feed real
Creative Review and Revision Memory before broader creative-quality claims.
