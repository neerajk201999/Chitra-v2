# Changelog

All notable user-visible changes are recorded here. The format follows Keep a
Changelog; versions follow Semantic Versioning. Motion IR compatibility is
versioned separately.

## [Unreleased]

### Added

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
- `chitra compare` and typed Comparison 0.1 reports with exhaustive strict
  frame-index mode, explicitly normalized progress mode, per-frame RGB MAE/
  PSNR/global-luma SSIM, deterministic difference images, worst-frame evidence,
  and limited audio energy-envelope alignment.
- ADR-0020 typed custom particle constellations and same-count custom morph
  targets with deterministic point-index mapping.

### Benchmarked

- Registered the immutable 274-frame Card Vault target and published an
  exhaustive freeze-frame lower baseline plus worst-frame indices.
- Authored clean-room Card Vault 0.6 across all 274 frames without copied
  reference pixels/audio. Custom particles improved mean SSIM from 0.353047 to
  0.363459; exact reconstruction and competitive-quality claims remain open.

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
