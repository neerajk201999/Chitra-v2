# ADR-0011 — Audio-reactive timeline (scored motion)

**Status:** accepted · shipped 2026-07-15

## Context

Chitra renders silent, then muxes a track over the top. Motion is not aware of
the audio, so films are *scored-over*, not *scored*. Reference launch films land
every motion hit on a beat (docs/research/honest-gap-vs-remotion-editframe.md
§2). We already gate declared-BPM cuts (MO-AUD-2) but never detect tempo from a
real file and never snap animation to beats.

## Decision

1. **`chitra analyze-audio <file>`** — deterministic beat/tempo detection with no
   new dependency: ffmpeg decodes to mono f32 PCM; a Node onset detector
   (short-time energy flux → adaptive peak-pick, ≥120ms inter-onset) emits
   `{ bpm, firstBeatMs, beats: [ms…], durationMs }` as a sidecar and to stdout.
2. **Beats live in the score.** `audio.music.beats: number[]` (ms from start),
   plus existing `bpm`/`firstBeatMs`. The agent runs analyze-audio and pastes the
   result. The compiler stays pure (no file reads).
3. **`at.onBeat`** — a new relational timing anchor. `at: { onBeat: 12 }` fires an
   animation at `beats[12]` (absolute), converted to scene-relative at compile.
   Out-of-range or no-beats-declared is a loud error, not a silent 0. This is the
   third timing mode after `scene-start` and `after: <anim>`.
4. **Gate MO-AUD-4:** if any animation uses `onBeat`, the score must declare
   `audio.music.beats`; hero-moment entrances *should* land on beats (P3 nudge
   when a hero entrance is >100ms off the nearest beat).

## Consequences

- Motion becomes a function of the actual track: "assemble the dot-matrix on the
  drop" is now expressible and verifiable.
- Determinism preserved: beats are static numbers in the score; analysis is a
  one-time authoring step, not part of render.
- Foundation for audio-energy-driven properties (envelope → opacity/scale) as a
  later increment; this ADR ships beat-snapping first.
