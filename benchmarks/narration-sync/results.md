# Narration and word-sync benchmark — 2026-07-23

- Provider-neutral local narration + word clock: **pass**
- Word-addressed visual starts: **500 ms → 1200 ms**
- Backward visual seek: **pass**
- Music-band RMS before/under voice: **0.11438 → 0.02275**
- Music ducking, narration, and choreography SFX on one bus: **pass**
- Narration-only measured final bus: **pass**
- Final loudness / peak: **-13.98 LUFS / -10.27 dBTP**
- Narration byte/timing release invalidation: **pass**
- Script-drift/duplicate/overlap/source-overrun/out-of-film/unknown-cue defects: **rejected**

This proves supplied/generated-and-frozen narration mixing and word-addressed
motion. It does not prove bundled TTS, ASR accuracy, voice quality, lip sync, or
automatic caption art direction.
