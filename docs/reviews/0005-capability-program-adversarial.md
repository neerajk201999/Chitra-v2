# Capability program adversarial review

**Date:** 2026-07-18 · **Scope:** current-source audit, installation/runtime
weight, Revision Memory 0.1, research memory, and competitive claim boundaries.

## Verdict

The branch materially improves installation weight and adds a coherent first
creative-memory slice. It does not establish feature parity or superiority.
The architecture remains sound only if the next program follows blocked user
jobs—transcript/clip audio, still-first directorial probes, calibration, then
residual compositor work—rather than treating the new capability matrix as a
checklist to copy.

## Findings and disposition

| Severity | Finding | Disposition |
|---|---|---|
| P1 | The old audit said HyperFrames had no output review; current 0.7.62 has an explicit plan→sketch→build→final-preview human loop. | Corrected in the current audit, index, ADR-0004 status note, roadmap, and claim boundaries. Chitra's hypothesis is calibrated semantic review and outcome memory, not “has review.” |
| P1 | Chitra installed full Three.js and four Fontsource packages while executing one module and nine fonts. | ADR-0033 vendors exact MIT/OFL bytes with upstream versions, hashes, sources, and licenses. Five dependencies removed; installed footprint falls 93.7→62.8 MiB. |
| P1 | The first Revision Memory implementation bounded only `directives`, allowing wrapper/query metadata to exceed the promised context budget. | Shared compiler now measures the complete serialized packet. Benchmark selects 23/100 entries in 5,913/6,000 characters. |
| P1 | A non-accepted record could label an outcome “measured” without evidence. | All outcomes other than `not-measured` now require evidence; regression test added. |
| P2 | “Renderer feature-complete” became a false literal claim after current Remotion/HyperFrames verification. | Historical ADR retained, roadmap explicitly supersedes the literal wording; renderer changes remain user-job/residual driven. |
| P2 | Public README previously named unpublished `chitra-video@0.5.0`. | Commands now install the current public package without asserting 0.5 availability; docs state npm still resolves 0.4.0. |
| P2 open | npm authentication is expired (`npm whoami` returns 401), so public 0.5 install and release evidence cannot be completed. | Requires owner `npm login`; no publish or shipped-version claim made. |
| P2 open | The memory benchmark is synthetic and universal-promotion provenance is declared, not externally verified. | Known issue retained; collect real accepted/rejected outcomes and ≥20 blind cases before taste-lift claims. |
| P2 open | Transcript EDL, clip audio, narration timing, imported animation, compositor depth, player/studio, and distributed render remain meaningful gaps. | Explicit capability status and ordered roadmap; no parity claim. |

## Verification evidence

- Full repository verification: 79 tests; all static, browser, rendering,
  provenance, comparison, release, 3D, skills, package, and 10/10 seeded-defect
  checks green.
- Runtime-asset hashes are enforced in repository consistency checks; isolated
  npm-prefix install proves the asset is packed and the real system browser
  captures a frame without browser-download bytes.
- npm dry-run: 561.3 kB tarball, 2.0 MB unpacked package content, 69 files;
  isolated installed dependency tree: 62.8 MiB.
- Revision Memory: 200 entries/two brands, zero foreign-brand leakage,
  byte-identical repeated compilation, rejected proposals emitted only as
  `avoid`, complete context 5,913 characters under a 6,000-character ceiling.

## Merge boundary

Merge only after the post-fix full verification passes. Publication is a
separate transaction after npm authentication, merge CI, and fresh registry
install/probe. No GitHub release or npm tag should be created from this branch
before those conditions hold.
