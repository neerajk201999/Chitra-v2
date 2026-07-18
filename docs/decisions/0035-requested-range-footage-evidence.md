# ADR-0035 — Footage evidence is requested, bounded, and edit-addressed

**Status:** shipped · 2026-07-18

## Context

ADR-0034 lets an agent read speech compactly and cut exact word ranges, but a
correct quote can still produce a bad picture edit: a blink, gesture pop, UI
state discontinuity, flash frame, repeated composition, or poor handoff may sit
at the chosen boundary. Loading a whole video or a dense global filmstrip wastes
context and still makes exact decisions hard to locate.

video-use demonstrates the useful user job: request visual evidence only around
the transcript ranges under consideration. Chitra also needs evidence around
the assembled EDL boundaries and must preserve enough machine facts for a critic
to reason without pretending that pixel difference is an aesthetic score.

## Decision

1. Add Footage Evidence Request 0.1. A request binds the locked transcript and
   EDL digests, one to twelve stable segment IDs, a concrete reason, bounded
   source context, three to nine samples per segment, thumbnail dimensions, and
   whether adjacent EDL cuts are included.
2. Every selected segment resolves through ADR-0034. Evidence generation fails
   on stale transcript/edit digests, unknown or duplicate segment IDs, changed
   source bytes, ranges longer than 60 seconds, unsafe sources, or unbounded
   output settings. It never silently samples a whole project.
3. `chitra edit-evidence` generates, for each requested segment:
   - a labeled, source-time filmstrip spanning context-before through
     context-after;
   - a waveform for the identical source range when audio exists, or an
     explicit silent-source panel when it does not;
   - stable sample times and exact word/quote addresses in a manifest.
4. When requested, each adjacent EDL boundary touching a selected segment gets
   a four-frame cut strip: two frames before the outgoing source boundary and
   two after the incoming boundary. The manifest records output time, source
   times, normalized RGB MAE, luma change, and short-window RMS on both sides.
5. These metrics are diagnostic facts, not quality thresholds. A large visual
   change can be an excellent contrast cut; a small one can be an accidental
   jump cut. Semantic evaluation cites the generated cut strip/waveform through
   the existing Creative Review principles `CR-EDIT-1..3`, `CR-MOT-4`, and
   `CR-SOUND-1..3`.
6. Evidence is written under a content-addressed request directory. The manifest
   hashes every artifact and carries no wall-clock field, so repeated generation
   with fixed source/FFmpeg/Sharp versions is directly comparable. Cross-machine
   PNG identity is not promised until independently measured.
7. Core uses only existing FFmpeg and Sharp dependencies. No ASR, VLM, Python,
   browser, or network access is added.

## Alternatives rejected

- **Dense whole-video filmstrip:** high token/compute cost and poor decision
  locality; requested evidence is the product advantage.
- **One midpoint thumbnail per quote:** cannot reveal boundary defects or
  gestures evolving through a select.
- **Automatic good/bad threshold from pixel MAE:** confuses intentional contrast
  with defects and would create false confidence.
- **A second footage-only critic schema:** duplicates Creative Review before
  independent calibration proves a distinct contract is needed.
- **Interactive timeline UI first:** adds a large product surface before the
  headless evidence and revision contract is stable.

## Consequences

Agents can inspect exact editorial decisions with compact visual/audio evidence
instead of loading full footage. Chitra still does not transcribe, track faces or
objects, infer semantic continuity deterministically, or guarantee that a critic
will judge cuts professionally. Calibration and accepted revision outcomes remain
the evidence path for those claims.
