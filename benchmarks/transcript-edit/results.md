# Transcript-addressed edit benchmark — 2026-07-18

- Two generated sources: one audiovisual, one silent/mismatched geometry and FPS.
- Transcript lock: exact bytes, media facts, owned Intake lineage.
- Compact phrase pack: 6 word-addressed tokens, 75% fewer characters than normalized word JSON.
- EDL: 3 explainable word-boundary segments, exact quote conformance.
- CLI: lock, pack, check, render, and hash receipt agree with the library contract; colliding video/receipt targets are refused.
- Render: geometry/FPS normalized, spoken audio preserved, mixed-source silence synthesized, all-silent output kept silent, per-cut fades and final loudness filter applied.
- Expected/resolved duration: 3030ms; encoded duration within one output-frame tolerance.
- Repeated render: byte-identical.
- Stale transcript digest, quote drift, path traversal, changed source bytes, unused-source overwrite, symlink output, and hard-linked source target: rejected.
