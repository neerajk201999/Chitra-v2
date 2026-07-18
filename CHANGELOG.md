# Changelog

All notable user-visible changes are recorded here. The format follows Keep a
Changelog; versions follow Semantic Versioning. Motion IR compatibility is
versioned separately.

## [Unreleased]

### Added

- ADR-0038 complete render-transaction telemetry for setup, capture, encode,
  finalization, and browser shutdown, plus repeatable p50/p95 preview benchmarks.

- ADR-0032 Revision Memory 0.1 with strict project/brand/universal scope,
  evidence-required accepted outcomes, independently calibrated universal
  promotion, `memory-validate`, and deterministic budgeted `memory-context`.
- A 200-entry benchmark proving exact-brand isolation, byte-identical complete-
  context compilation, rejected-proposal retention, and a 6,000-character ceiling.
- A current source-backed competitor capability matrix and workflow/product-
  differentiation report with explicit adopt/improve/replace/omit decisions.
- ADR-0034 Transcript/Edit IR 0.1 with exact footage locking, compact phrase
  packs, quote-conformed word-addressed EDLs, source-audio-preserving FFmpeg
  rendering, mixed silent-source support, cut fades, and hash receipts.
- `transcript-lock`, `transcript-pack`, `edit-check`, and `edit-render`, plus a
  generated audiovisual benchmark proving deterministic three-cut output and
  all-silent behavior, and rejection of stale digest, quote drift, traversal,
  changed source bytes, locked-source overwrite, and symlink output targets.
- ADR-0035 Footage Evidence 0.1 and `edit-evidence`: content-addressed,
  EDL-selected word filmstrips, audio/explicit-silence waveforms, four-frame
  adjacent-cut strips, and neutral RGB/luma/RMS diagnostics without whole-video
  context or false aesthetic thresholds.
- A generated moving/silent footage benchmark proving bounded source-end-safe
  sampling, CLI/library equivalence, exact cache reuse, and rejection of stale
  edits, unknown segments, changed sources, and changed cached artifacts.
- ADR-0036 Directorial Search/Direction Selection 0.1: two to four locked,
  pairwise-distinct Directions; one to three comparable still probes; an
  identity-free packet/contact sheet; a private digest-bound map; and a complete
  blind selection receipt that authorizes the exact winning Direction.
- A generated three-concept benchmark proving comparable identity-free probes,
  exact cache reuse, CLI/library receipt agreement, rejection of changed
  Direction/evidence, and blocking of pixel-near-identical rendered searches.

### Changed

- ADR-0039 keeps all 12fps draft motion samples while capturing at half spatial
  resolution. The fixed 9.6s fixture improves from 8.76s to 6.02s local p50 and
  from 3.0 to 1.3 MiB cache; CLI/library results expose actual output geometry,
  odd H.264 dimensions are safely padded, and a generated compact-UI comparison
  preserves the explicit diagnostic-not-release quality boundary.

- ADR-0033 replaces complete Three.js and four Fontsource runtime dependencies
  with the exact licensed module/font bytes Chitra executes. The isolated
  installed footprint falls from 93.7 MiB to 62.8 MiB with no browser download;
  runtime assets carry versions, hashes, sources, and license texts.
- ADR-0037 adds an immutable GitHub prerelease fallback while npm authentication
  is unavailable. The exact public tarball is SHA-256 pinned and exercised in a
  fresh prefix through probe, Intake, initialization, validation, and a real
  browser frame; it does not claim stable npm 0.5.0 publication.

## [0.5.0] — 2026-07-17

### Fixed

- Cursor-first installation now uses an existing Chrome/Chromium/Edge through
  `puppeteer-core`, downloads no browser during npm install, publishes an
  executable CLI, and makes `chitra probe` launch the resolved browser.
- Draft rendering is a true preview profile: at most 12fps JPEG capture,
  profile-isolated cache, disk preflight, and explicit fps/cache reporting.

### Added

- ADR-0031 capability-fit gate, machine-readable `chitra capabilities`, typed
  Direction 0.3 production requirements, and Score conformance for required
  asset-assisted heroes.
- Progressive create-video references, sparse-evidence-before-motion workflow,
  and whole-skill-tree integrity hashes to reduce agent context duplication.
- Install and draft-preview regression benchmarks derived from the first
  independent Cursor run.

## [0.4.0] — 2026-07-17

### Added

- ADR-0030 Independent Calibration Study 0.1: at least three blind reviewers per
  case, reviewer/candidate provenance and consent, subject binding,
  register/motion/audio coverage, explicit consensus/disagreement, separate
  panel/candidate metrics, `chitra review-calibrate`, and a deterministic
  contract benchmark.
- ADR-0029 Creative Review 0.1 with 28 stable multidisciplinary craft
  principles, isolated visual-assessment provenance, subject digests, fourteen
  evidence-bound domains, actionable findings, deterministic hidden-label
  scoring, CLI validation/scoring, and an anti-spam contract benchmark.
- Typed multimodal Intake IR for objectives, mixed-source provenance, rights
  state, preferences and anti-references, brand constraints, assumptions, open
  questions, and evidence links.
- `chitra intake <file> -o <lock>` deterministic source locking with SHA-256,
  byte counts, claimed-hash verification, traversal/symlink protection, and no
  implicit network acquisition.
- Mixed-input benchmark covering inline prompts, local references, uncaptured
  URLs, evidence, and repeatable locks.
- Direction 0.2 creative concept and Intake trace fields, plus Storyboard 0.1
  shot-level composition, camera, typography/copy, colour, timing, transition,
  audio, and provenance intent.
- Deterministic Intake→Direction→Storyboard→Score conformance gates,
  `chitra board`, generic adjacent-tier `chitra conform`, complete-chain
  `chitra creative-check`, and a three-defect creative-ladder benchmark.
- `chitra compare` and typed Comparison 0.2 reports with exhaustive strict
  frame-index mode, explicitly normalized progress mode, per-frame RGB MAE/
  PSNR/global-luma SSIM, deterministic difference images, worst-frame evidence,
  limited audio energy-envelope alignment, and named ROI/pair-range diagnostics
  with deterministic cropped diffs and strict validation.
- ADR-0020 typed custom particle constellations and same-count custom morph
  targets with deterministic point-index mapping.
- ADR-0021 one-level transform composition groups with stable child ownership
  and independent parent/child choreography.
- ADR-0023 typed clean-room/source-assisted reconstruction metadata, rendered-
  asset Intake lineage and rights gates, normalized project-only paths, safe
  local resolution, and declared figure dependencies included in scene hashes.
- Generated source-assisted benchmark proving licensed nested-asset rendering,
  cache invalidation, exact repeated capture, and rejection of reference-only
  use and false clean-room labels.
- ADR-0024 rendered figure-DOM text registration for minimum size, three-instant
  pixel contrast, safe zones, reading time, and overlap gates, plus a real-
  browser defect/control benchmark.
- ADR-0025 bounded per-point size/opacity and field glow for deterministic
  heterogeneous custom particle constellations, with a real-browser benchmark.
- ADR-0026 project-local figure copy participates in Storyboard→Score copy
  conformance instead of producing false missing-copy blockers.
- ADR-0027 `chitra release` and `verify-release`: bounded temporal frame gates,
  staged non-overwriting outputs, hash-bound creative/render/evidence inputs,
  measured final-mux loudness/peak, and stale receipt rejection.
- ADR-0028 rights-traced front textures for curated card/slab `scene3d`
  subjects and reason-gated, frame-addressed internal mesh, camera, studio-light,
  and exposure tracks, with exact random-seek and repeated-frame verification.

### Fixed

- Figure text no longer bypasses deterministic typography gates; media
  contrast now runs at bounded frame intervals and choreography/transition
  neighborhoods, while the midpoint capture is reused for blank-frame analysis.
- Beat-grid timing now invalidates frame caches, and music/SFX are normalized
  and measured on the encoded final bus rather than trusting the source bed.

### Benchmarked

- Generated textured-3D benchmark lands 3/3 authored internal states in
  non-monotonic seek order and repeats the same PNG byte-identically.

- Registered the immutable 274-frame Card Vault target and published an
  exhaustive freeze-frame lower baseline plus worst-frame indices.
- Authored clean-room Card Vault 0.6 across all 274 frames without copied
  reference pixels/audio. Custom particles improved mean SSIM from 0.353047 to
  0.363459; exact reconstruction and competitive-quality claims remain open.
- Card Vault 0.7 parent scaling improves mean SSIM again to 0.367146 but slightly
  worsens MAE/PSNR; both sides of the metric tradeoff are retained.
- Card Vault Comparison 0.2 localizes the remaining carousel error: pairs
  111–140 in the phone/card ROI measure MAE 0.089867 and 14.212 dB PSNR versus
  whole-film 0.027557 and 23.637 dB; regional metrics remain diagnostic only.

## [0.3.0] — 2026-07-16

### Added

- `chitra decompose` for deterministic, typed Style DNA and per-shot evidence.
- Generated three-shot benchmark covering cut timing, palette, motion energy,
  semantic honesty, bounded sampling, and byte-identical repeated JSON/evidence.
- Native Claude Code, Codex, and Cursor plugin manifests plus a Gemini entry
  point, all sharing the canonical skills tree.
- Isolated install benchmark covering package install, probe, init, validation,
  and an installed-package browser frame.

### Changed

- Agent workflows now decompose supplied references before direction.
- Creation intake explicitly supports prompt-only direction or any combination
  of references, assets, links, footage, audio, preferences, and anti-references.
- Package metadata points only to the isolated `Chitra-v2` repository.

## [0.2.0] — 2026-07-16

### Added

- Creative Intelligence architecture, constitution, Direction planning, and
  Direction↔Score conformance gates.
- Deterministic particles, curated seek-driven Three.js scenes, beat detection,
  `at.onBeat`, and typed frame-addressed transform tracks.
- Browser benchmark for exact authored keyframe states.

### Changed

- Package entry points and version identity are publishable as 0.2.0.
- Agent creation skill documents exact-track usage and honest capability limits.

### Fixed

- Compiler cache invalidates after transform-track runtime changes.
- Shipped 3D/audio ADR status and capability-gap documentation are current.
