# Transcript-addressed editing adversarial review

**Date:** 2026-07-18 · **Scope:** ADR-0034 Transcript/Edit IR, compact
context, source locking, FFmpeg render, CLI targets, and capability claims.

## Verdict

This is a coherent first footage-editing foundation and closes the narrow
transcript/clip-audio job recorded in the capability audit without adding a
provider or runtime dependency. It is not a full nonlinear editor, a bundled
transcriber, or evidence that Chitra has video-use/HyperFrames/Remotion parity.
The next footage slice should add requested-range visual evidence before any
automatic cut-quality claim.

## Findings and disposition

| Severity | Finding | Disposition |
|---|---|---|
| P1 | Render targets were checked only against sources selected by the EDL. An unused locked source could be overwritten. | Target validation now compares against every locked source before FFmpeg runs; generated benchmark rejects the unused-source case. |
| P1 | An existing output symlink could alias arbitrary bytes, including locked footage. | Video and receipt targets reject symlinks. Existing regular targets are canonicalized and device/inode comparison also rejects hard-linked source aliases. |
| P1 | A user could set `--receipt` equal to `--out`, replacing the rendered MP4 with JSON after a successful render. | CLI canonicalizes both artifact targets and refuses equality before rendering. Receipt targets also receive locked-source protection. |
| P2 | The mixed-audio branch was benchmarked, but the implemented all-silent branch was not. | Generated benchmark renders a silent-only EDL, verifies no audio stream is invented, and checks encoded duration tolerance. |
| P2 | “Exact quote” could imply byte-for-byte whitespace preservation. | Contract remains exact selected token text after deterministic punctuation/whitespace normalization; word IDs are the authoritative boundaries. No fuzzy semantic matching is accepted. |
| P2 open | Codec byte identity is established only for repeated local runs with fixed FFmpeg/OS; cross-machine identity is unproved. | Claims remain same-machine and benchmark-specific. Receipt binds actual output bytes rather than promising cross-platform codec identity. |
| P2 open | Transcript validity does not prove ASR accuracy, speaker accuracy, legal rights, or that a provider emitted every audible event. | Provider/model, rights declaration, source bytes, and timing are preserved; external acquisition quality remains visible host responsibility. |
| P2 open | Word evidence alone cannot judge jump cuts, gestures, UI states, eyelines, or visual continuity. | Roadmap keeps requested-range filmstrip/waveform and cut-boundary evaluation as the next P0 slice. No automatic cut-picture claim is made. |

## Verified contract

- Transcript sources are normalized project-relative paths with Intake lineage
  and owned/licensed declarations; realpath containment blocks traversal and
  symlink escape.
- Source bytes, duration, audio presence, geometry, and FPS are locked. Tokens
  are unique, source-bound, ordered, non-overlapping, and inside source time.
- Phrase context preserves source, word IDs, time ranges, speaker changes, and
  the transcript digest. Over-budget context fails instead of truncating.
- EDL segments bind transcript digest, source, first/last word, normalized exact
  quote, handles, narrative beat, and editorial reason.
- Mixed audiovisual/silent rendering preserves speech, synthesizes silence,
  normalizes geometry/FPS/audio, applies cut fades and final loudness; all-silent
  edits remain silent.
- Generated evidence rejects stale transcript digest, quote drift, path
  traversal, changed bytes, unused-source overwrite, symlink output, and a
  hard-linked source target.
- All four public CLI commands run against generated footage and agree with the
  library contract; a colliding video/receipt target fails before rendering.

## Merge boundary

The full repository verifier passed on 2026-07-18: 83 tests, isolated package
install and browser frame, draft render, generated transcript media, provenance,
comparison, release, 3D, seeded-defect, skill-integrity, and package dry-run
checks are green. ADR-0034 may ship in this coherent commit; publication remains
separate from repository merge and still requires authenticated npm evidence.
