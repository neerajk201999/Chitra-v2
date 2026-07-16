# ADR-0027 — A release is a verified transaction

**Status:** accepted · 2026-07-16

## Context

`chitra check` sampled three instants per scene, so a short overlap, off-safe
entrance, or contrast dip could occur between samples. `chitra render` was a
separate command and therefore could produce a plausible final without rendered
gates or creative conformance. Music was normalized before SFX were mixed and
the final AAC mux was never measured. Scene cache hashes also omitted the beat
grid even though `at.onBeat` changes rendered frame timing.

These are release-integrity failures, not missing effects. A quality floor is
not real when the moving interval, final mux, or exact checked inputs can differ
from the delivered artifact.

## Decision

1. Rendered gates sample real output-frame times at a maximum 250 ms interval,
   plus scene/cut/transition boundaries and each animation's start, midpoint,
   and end neighborhoods. Cross-scene text is inspected during transition
   overlap. This is bounded temporal coverage, not an exhaustive every-frame
   proof.
2. `chitra release` is the sole claim-bearing export path. In one process it
   validates Intake → Direction → Storyboard → Score conformance, static gates,
   rendered gates, final render, final-mux audio, and evidence before writing a
   receipt. P1 findings block the transaction.
3. The receipt binds the four creative artifacts, resolved render inputs,
   final video, evidence files, package/compiler versions, gate findings, and
   audio measurement by SHA-256. Inputs are hashed again after rendering; a
   mid-release change refuses the receipt. `chitra verify-release` rejects any
   later artifact, asset, output, or evidence drift.
4. Music/SFX are premixed losslessly, then music-led mixes receive measured
   two-pass EBU R128 normalization before AAC encoding. The encoded final mux is
   measured and must land within ±0.5 LU of −14 LUFS with true peak ≤ −1.5 dBTP.
   SFX-only mixes are peak-gated but are not boosted toward an integrated music
   target. Silent films remain valid and explicitly report no audio.
5. Scene hashes include audio timing inputs used by choreography. Changing the
   beat grid invalidates the affected frame cache.
6. Release outputs are staged under temporary sibling paths, then committed only
   after gates, render, audio measurement, and input re-hashing succeed. Canonical
   target checks refuse video, evidence, or receipt paths that could overwrite
   creative artifacts or resolved render inputs, including symlink aliases.

## Consequences

- A receipt proves which checked inputs produced which delivered bytes; it does
  not claim professional taste or legal ownership.
- `render` remains useful for drafts and diagnostics, but it is not a release
  claim. Agent skills must deliver through `release`.
- Temporal gates become slower in proportion to runtime. The 250 ms ceiling and
  choreography landmarks are the smallest credible fix; exhaustive per-frame
  QA remains available only when a future benchmark proves it necessary.
- Existing scores need no IR-version change. Receipt format is independently
  versioned as `0.1.0`.
- The receipt is a drift-detecting integrity manifest, not a signed attestation;
  it does not prove who approved or produced a release.
