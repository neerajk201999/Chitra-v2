# ADR-0007 — Video-in-scene via frame pre-extraction; audio v2 (SFX + procedural beds)

**Status:** accepted · 2026-07-15

## Context

Two capability gaps against the competitive frontier: scenes cannot contain moving video (Remotion's core expressiveness advantage; essential for product demos from screen recordings), and scores ship silent unless the user supplies a licensed music file (the "no music" failure). Research on current best practice (2026): HeyGen/HyperFrames render `<video>` by **pre-extracting every clip to per-frame images with ffmpeg** and swapping images per captured frame — browser-native video playback/seeking in headless is fragile and non-deterministic. Remotion ships a bundled SFX collection (`@remotion/sfx`); music is user-supplied or AI-generated (e.g. ElevenLabs text-to-music).

## Decision

1. **`video` element, rendered as per-frame image swap.** New IR element `{type:"video", src, startMs, fit, radius, scrim, …}` (project-relative only, like images). At session open, the renderer pre-extracts the needed span to JPEG frames under `<cache>/media/<contentHash>/` (ffmpeg, element fps = score fps, sized to the element box). The compiled page carries an `<img>` per video element; the seek runtime swaps `src` to frame ⌊(t − sceneStart) · fps⌋ and awaits decode. Fully deterministic, cache-participating, and byte-identical on re-render — the property browser `<video>` cannot give us. Clip audio is dropped in v1 (mux-stage mixing is a follow-up).
2. **SFX as choreography metadata.** An animation may declare `sfx: {src, gainDb}`; the sound fires at the animation's resolved start time. Sounds attach to *motion*, not to wall-clock — sound design inherits choreography's relational timing. Mixed at the mux stage (ffmpeg `adelay`+`amix`), after loudness normalization of the bed.
3. **Zero-license starter audio, generated deterministically.** `chitra sfx-kit` synthesizes a minimal kit (tick, whoosh, rise, boom) from ffmpeg signal sources; `chitra bed` synthesizes an ambient bed (root drone + fifth + slow pulse at a chosen BPM/key). No licensing, no downloads, reproducible from the CLI. Real music remains user-supplied (`music.src`) or AI-generated externally; the bed guarantees a score never ships silent by accident.
4. **Taste boundary (MO-AUD-3):** SFX are sparse — hero entrances and transitions, never every animation; the bed sits at −14 LUFS integrated with SFX peaks ≤ −8 dBTP.

## Consequences

- Screen recordings become first-class scene material end-to-end (transcribe → still → clip).
- Media extraction adds a one-time per-clip cost, cached by content hash; the cache pruner keeps `media/` entries referenced by the current score.
- The renderer's determinism claim now covers moving media, which neither raw Remotion renders nor HyperFrames' prose-driven pipeline guarantees at the IR level.
