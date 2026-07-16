# Current State — read this after VISION

**Verified:** 2026-07-16 · **Package:** 0.3.0 · **Intake IR:** 0.1.0 · **Direction:** 0.2.0 · **Storyboard:** 0.1.0 · **Motion IR:** 0.1.0 · **Style DNA:** 0.1.0 · **Comparison:** 0.2.0

This is the compact handoff for a fresh builder. It records current truth, not
history or aspiration. Detailed history belongs in the roadmap, ADRs, research,
and CHANGELOG.

## What is shipped

- Deterministic Score → HTML/GSAP → seek-driven browser frames → FFmpeg video.
- ADR-0017 typed multimodal Intake IR and `chitra intake`: objective,
  deliverable, mixed-source roles/rights, preferences and anti-references, brand
  constraints, assumptions, open questions, evidence links, and deterministic
  local/inline content fingerprints. Uncaptured URLs stay explicitly unlocked.
- ADR-0018 Direction 0.2 + Storyboard 0.1 creative ladder: governing concept,
  source/preference/brand/assumption trace, shot composition/camera/type/copy/
  colour/timing/audio intent, and deterministic conformance across all four
  tiers through `chitra conform` and `chitra creative-check`.
- Score IR, static/frame quality gates, evidence generation, content-addressed
  scene cache, and agent-facing skills.
- Images, frame-extracted video, sanitized UI figures, cursor/type interaction,
  particles, curated Three.js primitives, music/SFX, beat detection, and
  `at.onBeat` choreography.
- ADR-0013 frame-addressed transform tracks: typed X/Y, scale, 3-axis rotation,
  opacity, perspective, origin, and token easing.
- ADR-0020 ordered custom particle constellations and same-count custom morph
  targets, deterministically mapped by point index with bounded coordinates.
- ADR-0025 heterogeneous custom-particle appearance: bounded per-point size and
  opacity plus a field glow multiplier, deterministic through browser capture.
- ADR-0021 one-level full-stage transform groups with single child ownership,
  stable nested IDs, and compiler failures for invalid hierarchy.
- ADR-0015 Reference Decomposer: `chitra decompose` emits validated Style DNA
  with source hash/media facts, hard-cut rhythm, quantized palette,
  luminance/saturation, frame-difference energy, audio onsets, and shot evidence.
- ADR-0019 Reference Comparator: strict exhaustive frame-index comparison or
  explicit normalized-progress sampling; RGB MAE, PSNR, global-luma SSIM,
  deterministic amplified diff PNGs, worst-frame evidence, and limited 20ms
  mono audio-energy envelope correlation/RMSE.
- ADR-0022 named ROI diagnostics: aligned-reference bounds and optional pair
  ranges, regional metric summaries/worst pairs, deterministic cropped diffs,
  and strict validation. Whole-frame metrics remain authoritative.
- ADR-0023 source-assisted reconstruction provenance: typed clean-room/source-
  assisted labels, rendered-asset lineage and rights conformance, normalized
  project-only paths, declared figure dependencies, and nested-byte cache
  invalidation. It does not infer legal rights; it enforces the user's claim.
- ADR-0024 rendered figure-text registration: actual DOM text geometry, color,
  font size, visibility, and addressable targets feed MO-TYPE-1/2/4,
  MO-EDIT-1, and QE-OVERLAP-1. ADR-0027 runs media contrast across bounded
  output-frame samples and choreography/transition neighborhoods.
- ADR-0026 Storyboard→Score conformance reads sanitized project-local figure
  text, so approved copy inside complex product UI remains traceable.
- ADR-0027 verified release transactions: ≤250ms output-frame sampling plus
  choreography/transition neighborhoods, cross-scene overlap checks, staged
  target-safe outputs, final-mux loudness/peak measurement, and receipts that
  bind the creative artifacts, resolved render inputs, video, and evidence.
- Package 0.3.0 has valid `main`/`types`/`exports`; global-style tarball install
  and `chitra probe` have been exercised locally.
- Canonical skills are exposed through Claude Code, Codex, and Cursor manifests,
  `AGENTS.md`/`GEMINI.md`, and the cross-harness `npx skills` installer.

## Evidence, not claims

- Unit suite: 61 tests.
- Release-integrity benchmark: generated four-tier project releases through the
  CLI at −13.98 LUFS/−12.51 dBTP; the receipt verifies immediately, changed
  Score/output bytes are rejected, and input-overwriting targets are blocked.
- Multimodal Intake benchmark: inline, local, and URL origins; local evidence;
  preferences and anti-reference; repeated locks identical; traversal, symlink
  escape, stale hash, duplicate ID, and unknown provenance links rejected.
- Creative ladder benchmark: four typed tiers, three conformance boundaries,
  full CLI chain green, and dropped must-preference, dropped beat, and missing
  planned copy caught by stable rule IDs.
- Reference Comparator benchmark: exact identical 12/12-frame report yields MAE
  0/SSIM 1/audio correlation 1; repeated report/diffs identical; colour drift
  caught; a localized defect is isolated from an untouched ROI; regional
  evidence repeats; invalid regions reject; strict geometry rejection,
  normalized non-exhaustive mode, and repeatable CLI regions are proven.
- Source-assisted benchmark: a synthetic licensed Intake asset traces through
  Direction/Storyboard/Score, renders inside a figure in a real browser,
  invalidates the scene hash when its bytes change, and repeats the same frame
  byte-identically. Reference-only use and a false clean-room label are blocked.
- Figure-text browser benchmark: one small, dark, off-safe, overlapping, long
  figure label triggers all five intended typography rules; a compliant control
  triggers none, and fully clipped/transparent controls stay ignored.
- Card Vault target registered by hash at 720×900/30fps/274 frames. The first
  clean-room Chitra candidate authors all 274 frames with eight typed tracks,
  custom particles, and no reference pixels/audio: mean SSIM 0.363459 and
  minimum SSIM 0.132334 versus freeze 0.269554/0.095306, while MAE remains worse
  at 0.027557 versus 0.024120. Candidate 0.7 raises mean SSIM to 0.367146
  through parent-scale + child-morph grouping, but slightly regresses MAE/PSNR.
  Worst residuals moved to the frames 128–139 card carousel. Comparison 0.2's
  phone/card ROI over pairs 111–140 measures MAE 0.089867 and 14.212 dB PSNR
  versus whole-film 0.027557 and 23.637 dB, localizing the asset-fidelity gap;
  exact is not met.
- A private, rights-approved source-assisted Card Vault 0.9 run uses three
  declared still derivatives plus audio without replaying the reference video.
  It improves whole-film MAE to 0.025749/SSIM to 0.401685, ROI MAE to 0.077290/
  SSIM to 0.062493, and audio-envelope correlation to 0.961110. Exact remains
  unmet; the non-redistributed evidence is summarized in the benchmark record.
- Seeded deterministic defects: 10/10 caught.
- Keyframe browser benchmark: 3/3 exact authored states, backward seek passes,
  repeated same-frame PNG is byte-identical.
- Reference benchmark: generated 3-shot film finds both exact cut times and all
  three colors; bounded sampling holds; repeated Style DNA JSON and all three
  evidence frames are byte-identical.
- Both supplied references decomposed locally: the 274-frame card film produced
  1 continuous shot; the 81.6s Claude Design film produced 12 detected shots.
- Skill manifest and package dry-run are verified by the repository contract.
- Isolated tarball install proves the installed CLI can probe, initialize,
  validate, and capture a real browser frame.
- Claude Code and Codex marketplace installs pass in isolated config homes;
  `npx skills` places all three canonical skills for Claude Code, Codex,
  Cursor, and Gemini CLI.

Run `node scripts/verify.mjs` before merge. Use `--quick` only while iterating.

## Active product objective

Turn a prompt and any optional mix of references, images, links, screenshots,
footage, audio, brand material, preferences, and anti-references into explicit,
evidence-backed creative decisions and a gated film. Then prove competitive
quality through neutral ChitraBench runs. Creative Intelligence (ADR-0012)
remains the center of gravity; renderer work requires a specific target-film gap.

Ordered next slices:

1. Calibrate Creative QA on at least 20 independently labelled cases, then add
   explicit Style Memory from accepted human revisions.
2. Prove public/outside first use across Claude Code, Codex, and Cursor, then run
   a pre-registered neutral ChitraBench against real baselines.
3. Keep Card Vault as an immutable renderer benchmark. Add masks, deeper comps,
   blend modes, internal 3D/light tracks, motion blur, or richer audio only when
   a rights-approved measured residual isolates that capability. Never infer
   source-use rights from possession of a reference.

The evidence and reasoning for this rebaseline are in
[program review 0003](../reviews/0003-program-rebaseline.md).

## Claim boundaries

- Chitra does not yet “beat Remotion/HyperFrames/EditFrame/Replit Video.” No
  neutral head-to-head benchmark has established that.
- Same-machine repeated-frame determinism is measured. Cross-machine golden
  equivalence, cold/warm full-render equivalence, interrupted-render
  equivalence, and broad critic calibration are still open. Two current Card
  Vault reruns are byte-identical, but an earlier artifact differs at MAE
  0.000095/SSIM 0.999909; the cause is not isolated.
- Exact reconstruction of either supplied reference is not yet achieved.
- Comparator exactness is decoded-pixel equality. Its global SSIM and audio
  envelope do not measure local perceptual features, optical flow, semantics,
  speech, music quality, or professional preference.
- Creative conformance proves structural coverage and traceability, not that a
  concept, narrative, composition, or copy is professionally good. Calibrated
  semantic Creative QA and cross-project Style Memory remain open.
- Release gates sample output frames at ≤250ms intervals plus choreography and
  transition neighborhoods. This is bounded coverage, not every-frame proof;
  shorter between-sample defects, rasterized text, and token-only CSS
  enforcement remain open.
- GitHub is private and `chitra-video` is unpublished; native manifests and
  isolated installs are verified, but public and three-harness outside-user
  installation are not.
- GitHub vulnerability alerts are enabled. Enforced branch protection is not
  available for this private repository on the current GitHub plan.

## Invariants for every change

- ADR before architecture; schema before compiler; gate and benchmark with every
  new law/capability; compiler cache version changes with compiler output.
- No LLM calls in `core/`; no network access in render; no silent degradation.
- One coherent change per commit, with tests/evidence and memory updated in the
  same commit. Preserve user changes and keep rollback possible with `git revert`.

## Resume protocol

Read `VISION.md` → this file → roadmap → relevant ADR/code. Confirm the active
objective, run quick verification, write a bounded plan, and change the shared
root rather than patching callers. At handoff, update this file only when current
truth changed; do not turn it into a session diary.
