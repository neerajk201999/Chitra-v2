# ADR-0044 — Narration is a provider-neutral timed Score track

**Status:** accepted  
**Date:** 2026-07-23  
**Evidence:** HyperFrames `7a294f1`, `faceless-explainer` audio/caption flow;
Chitra capability audit P0 voice/word-sync gap

## Context

Launch films and explainers need one temporal system for picture, narration,
music, effects, captions, and visual reveals. Chitra can preserve source speech
through transcript-addressed edit plates, but Score video is visual-only and a
supplied narration can only arrive as an opaque premix. An agent therefore
cannot bind an animation to the word that motivates it or let Chitra duck music
under voice.

HyperFrames solves acquisition through HeyGen or local Kokoro and writes timing
metadata for downstream captions. The useful abstraction is the frozen audio
plus word clock, not either provider. Bundling a TTS model or vendor client in
Chitra core would make installation heavy, credentials mandatory, and the
renderer network-dependent.

## Decision

1. Add one optional `audio.narration` Score track with a project-local audio
   source, provenance, global start offset, gain, locked script, and strictly
   ordered word IDs/times relative to the source.
2. Add `at.onNarrationWord` to choreography. It addresses a declared word ID
   and resolves to the word's absolute start on the same deterministic Score
   clock. A cue outside its scene or combined with `onBeat` is invalid.
3. Keep generation provider-neutral and outside core. The host agent may use
   any authorized TTS or supplied recording, but must freeze the result and
   timings locally before Score validation.
4. Mix narration as a first-class FFmpeg input. When music and narration both
   exist, use a typed side-chain compressor for smooth deterministic ducking;
   narration, ducked music, and sparse SFX then enter the existing measured
   two-pass final bus.
5. Narration bytes and timing participate in render inputs, Score/release
   identity, provenance, and any scene whose choreography cites a word.
6. Do not add a caption template system. Word-addressed choreography can reveal
   any typed text/figure element, preserving art-direction flexibility instead
   of forcing one caption skin.

## Acceptance evidence

Before word-synchronized narration becomes native:

- schema rejects duplicate, overlapping, reversed, or out-of-film word clocks;
- a real browser proves two visual reveals land on two named word starts under
  backward/random seeks;
- a real render contains narration, music, and SFX on one measured final bus;
- frequency-isolated evidence proves music attenuates while narration speaks;
- changed narration bytes or timing invalidate release identity;
- provenance and path/symlink boundaries include narration;
- silent and music/SFX-only Scores retain their prior behavior;
- package/install cost does not gain a TTS or ASR dependency.

## Boundaries

This decision does not claim bundled TTS, voice cloning, ASR accuracy,
phoneme/lip sync, automatic caption design, semantic script quality, or direct
Score-video clip audio. Those are separately named capabilities.

## Alternatives rejected

- **Bundle one TTS provider:** convenient demo, wrong trust/install boundary.
- **Require a premixed soundtrack:** deterministic but destroys surgical mix
  control and word-addressable visual timing.
- **Infer timings from audio during every render:** expensive, model-dependent,
  and breaks the renderer's offline pure-input contract.
- **Force captions as a special visual element:** narrows design and duplicates
  existing text/figure/choreography primitives.
