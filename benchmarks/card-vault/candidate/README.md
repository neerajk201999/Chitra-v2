# Card Vault clean-room candidate 0.7

This is the first Chitra-authored 274-frame reconstruction candidate for the
registered Card Vault target. It uses one token-themed figure, eight typed
frame-addressed tracks, ADR-0020 custom particle constellations, and an ADR-0021
parent transform group for the expanding mark→ring→mark close. It contains no
decoded reference frame, crop, logo file, or reference audio and is safe to
inspect without the licensed source video.

The candidate is a benchmark baseline, not an exact reconstruction. It proves
that Chitra can author and render every target frame at the registered geometry
and timing, then lets the exhaustive comparator expose the remaining errors.

Run from the repository root after building `core/`:

```bash
node benchmarks/card-vault/run-candidate.mjs /path/to/nJY81Asb24doUFnW.mp4
```

The runner verifies the immutable reference hash, renders this score at high
quality, compares all 274 decoded frame pairs, and prints the temporary evidence
directory. The source video and generated artifacts are never committed.
