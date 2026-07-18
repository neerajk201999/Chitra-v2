# Requested-range footage evidence benchmark — 2026-07-18

- Inputs: one audiovisual moving source and one silent mismatched-geometry source.
- Request: 3/4 EDL segments, 5 word-addressed frames per segment, 300ms source context, including an exact source-end select.
- Evidence: audiovisual and explicit-silence waveforms plus all three adjacent four-frame cut strips; source-end sampling clamps to the last decodable frame.
- Diagnostics: normalized RGB/luma discontinuity and nullable pre/post-cut RMS; no aesthetic verdict inferred.
- Cache: repeated request reuses a byte/hash-verified content-addressed manifest.
- CLI/library manifests: identical.
- Unknown segment, stale edit digest, changed source bytes, changed cached manifest, and changed cached artifact: rejected.
