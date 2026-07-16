# Release-integrity adversarial review

**Date:** 2026-07-16 · **Scope:** ADR-0027 implementation before merge

The review tried to refute the claim that `chitra release` binds the checked
inputs to the delivered bytes without risking user inputs.

## Findings fixed in the slice

1. **Contrast coverage contradicted the ADR.** Geometry ran at ≤250ms samples,
   but over-media contrast still ran only at three scene instants and animation
   landmarks. Contrast capture now runs at every bounded sample; a regression
   case hides a one-sample white-on-white defect at 700ms.
2. **Rendered-gate failure bypassed browser cleanup.** The CLI called
   `process.exit` inside the session `try`, so `finally` could not close Chrome.
   The release path now throws through the cleanup boundary.
3. **Output aliases could destroy inputs.** Direct output paths could equal a
   creative artifact or resolved asset, and macOS `/var` versus `/private/var`
   aliases bypassed string comparison. Targets and protected inputs are now
   canonicalized through their nearest existing ancestor; video, receipt, and
   evidence collisions fail before browser or FFmpeg work.
4. **Release hashing could reuse render-time digest memo entries.** `scoreHash`
   now clears the mtime/size memo before each release fingerprint so pre/post
   checks read current asset bytes.
5. **A failed audio invariant could leave a plausible final at the requested
   path.** Video and evidence now render to temporary siblings and move into
   their final locations only after gates, audio measurement, and input
   re-hashing succeed.
6. **Generated clip-path parsing lost regex escapes.** The stronger Akta scan
   exposed fully clipped wipe-reveal text as visible `NaN` geometry because
   template-literal escaping emitted malformed runtime regexes. The generator
   now emits the intended `inset(...)` and whitespace parsers, with the compiled
   runtime pinned by a regression assertion.
7. **Contrast crops included the foreground glyph.** Black text on a mint pill
   could be misread as black-on-black because glyph pixels contaminated the
   estimated background. Render sessions now capture a background-only frame by
   masking authored text color without removing panels or media; blank-frame QA
   continues to use an unmasked capture.
8. **Output topology could delete a completed video.** A video or receipt path
   nested inside the evidence directory survived the input-collision check; the
   evidence replacement could then remove the video, while the inverse nesting
   could turn the intended video filename into a directory. Target validation
   now rejects every equal or nested video/receipt/evidence layout before
   browser or FFmpeg work.
9. **Missing evidence degraded silently.** The release path filtered absent
   evidence files before receipt creation. It now hashes every artifact returned
   by evidence generation, so any missing contact sheet, hero, or cut strip
   fails the transaction instead of shrinking the receipt.

## Residual boundaries

- Sampling is bounded, not exhaustive. A shorter defect between the sampled
  output frames can still escape; every-frame QA needs measured justification.
- A receipt is an unsigned integrity manifest. It detects drift relative to its
  own hashes but does not authenticate an approver or prevent deliberate
  receipt regeneration.
- Video, evidence directory, and receipt are separate filesystem objects; a
  machine crash between their final renames can leave a valid video without a
  receipt. Such output is not a Chitra release and `verify-release` will fail.
- Release QA is intentionally slower than draft rendering because it samples
  motion and then renders the complete final. Cache reuse limits the cost.

## Evidence

- 61 unit tests, including emitted clip-path parsing, transient overlap,
  transient contrast, beat-grid
  cache invalidation, canonical target collision, and input preservation.
- Generated `benchmarks/release-integrity` transaction proves final AAC
  measurement, immediate receipt verification, Score/output tamper detection,
  and unsafe target rejection without network access.
