# ADR-0034 — Speech footage is edited through a locked transcript and typed EDL

**Status:** shipped · 2026-07-18

## Context

Product demos, founder videos, tutorials, interviews, and social cuts share one
expensive task: an agent must understand hours of speech without loading frames,
choose exact word-boundary ranges, preserve source audio, and verify that the
render still says what the edit claims. Chitra can place video visually but has
no clip-audio pass-through, word timeline, or edit-decision contract.

video-use demonstrates the correct representation: word timestamps are the
addressing system, phrases are the compact reading view, and visual evidence is
requested only around decisions. Its implementation is coupled to one ASR
provider and a Python helper stack. Chitra needs the user job without that
coupling and with its existing provenance, validation, and deterministic-output
discipline.

## Decision

1. Add Transcript IR 0.1. A transcript contains project-local footage sources,
   Intake source lineage and owned/licensed declarations, and ordered word/event
   tokens with exact millisecond bounds, speakers, and preserved filler words.
2. `chitra transcript-lock` resolves every source inside the project boundary,
   probes video/audio/geometry/duration, and binds byte count plus SHA-256. A
   changed or escaped source cannot be edited under a stale transcript.
3. `chitra transcript-pack` groups tokens only at ≥500ms gaps or speaker changes
   and emits a deterministic Markdown reading surface with source, word-ID, and
   time ranges. It fails rather than truncating when the requested context
   budget is exceeded; callers narrow by source.
4. Add Edit Decision List 0.1. Every segment names source, first/last word IDs,
   bounded pre/post handles, narrative beat, exact selected quote, and reason.
   The EDL binds the normalized locked-transcript digest.
5. `chitra edit-check` resolves word ranges and refuses unknown/cross-source
   words, stale digest, quote drift, invalid timing, source-byte drift, unsafe
   paths, and segments shorter than a useful audiovisual cut.
6. `chitra edit-render` uses FFmpeg already required by Chitra. It normalizes
   geometry/FPS, preserves clip audio, synthesizes silence for silent sources in
   mixed edits, applies a configurable 10–100ms fade at both ends of each audio
   segment, concatenates in EDL order, normalizes the combined bus, and writes a
   hash-bound receipt. Every locked source is protected from video or receipt
   overwrite even when it is not selected by the EDL; symlink targets are
   refused.
7. Rendering has draft/high profiles but no creative grade, subtitles, overlay,
   or generative provider. The edited output is a first-class local plate that
   can enter the existing Score and creative-review pipeline.
8. The core makes no transcription API call. Host agents may use any provider
   that emits the IR. Provider adapters remain optional and must preserve words,
   gaps, speakers, events, model/version, and provenance.

## Alternatives rejected

- **Bundle ElevenLabs or Whisper:** provider/cost/hardware lock-in and a much
  heavier first install; the hard problem is the stable editing contract.
- **Use seconds directly in free-form JSON:** loses word-boundary correctness,
  quote conformance, and addressable revision.
- **Load all frames into the agent:** catastrophic context use and less semantic
  precision than transcript plus targeted evidence.
- **Attach clip audio directly to Score first:** mixes source-selection/editing
  semantics into the motion compositor and leaves raw-footage reasoning
  untestable.
- **Copy video-use helpers:** Python/runtime duplication without improving the
  representation or Chitra’s provenance guarantees.

## Consequences

Chitra gains a useful headless raw-footage path with no new dependency and a
compact agent surface. It does not yet transcribe, generate word-aligned visual
timeline images, remove filler automatically, grade HDR footage, render
subtitles, or evaluate cut-boundary pictures. Those are subsequent measured
slices; the receipt and EDL provide their stable join points.
