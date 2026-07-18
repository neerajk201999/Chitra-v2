# Current State — read this after VISION

**Verified:** 2026-07-18 · **Package:** 0.5.0 release candidate · **Intake IR:** 0.1.0 · **Transcript IR:** 0.1.0 · **Edit IR:** 0.1.0 · **Footage Evidence:** 0.1.0 · **Directorial Search:** 0.1.0 · **Direction Selection:** 0.1.0 · **Direction:** 0.3.0 · **Storyboard:** 0.1.0 · **Motion IR:** 0.1.0 · **Style DNA:** 0.1.0 · **Comparison:** 0.2.0 · **Creative Review:** 0.1.0 · **Independent Calibration:** 0.1.0 · **Revision Memory:** 0.1.0

This is the compact handoff for a fresh builder. It records current truth, not
history or aspiration. Detailed history belongs in the roadmap, ADRs, research,
and CHANGELOG.

## What is shipped

- Deterministic Score → HTML/GSAP → seek-driven browser frames → FFmpeg video.
- ADR-0017 typed multimodal Intake IR and `chitra intake`: objective,
  deliverable, mixed-source roles/rights, preferences and anti-references, brand
  constraints, assumptions, open questions, evidence links, and deterministic
  local/inline content fingerprints. Uncaptured URLs stay explicitly unlocked.
- ADR-0018/0031 Direction 0.3 + Storyboard 0.1 creative ladder: governing concept,
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
- ADR-0028 project-local front textures for curated card/slab `scene3d`
  subjects plus typed, frame-addressed internal mesh, camera, key/fill light,
  and exposure tracks. Texture bytes participate in provenance and cache hashes.
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
- Package 0.4.0 is public on npm with valid `main`/`types`/`exports`/`bin`;
  isolated registry installation, `chitra --version`, and `chitra probe` pass.
  The public repository, release tag, security-reporting path, and protected
  `main` branch are live.
- Canonical skills are exposed through Claude Code, Codex, and Cursor manifests,
  `AGENTS.md`/`GEMINI.md`, and the cross-harness `npx skills` installer.
- ADR-0029 Creative Review 0.1: 28 stable multidisciplinary `CR-*`
  principles; isolated first-watch provenance; subject digest; fourteen
  evidence-bound domain assessments; actionable findings; deterministic hidden-
  label scoring; and explicit anti-spam/verdict coherence. This is a judgment
  contract, not proof that the critic has professional taste.
- ADR-0030 Independent Calibration Study 0.1: at least three blind human
  annotations per case, blind candidate provenance, reviewer expertise/conflict/
  consent declarations, subject binding, register/motion/audio coverage,
  thresholded consensus, explicit disagreement, and separate panel/candidate
  agreement dimensions through `chitra review-calibrate`. Declarations are
  bound and surfaced, not independently verified by the core.
- ADR-0031 first-use recovery: system-browser discovery with a real launch
  probe, executable packed CLI, browser-download-free installation, disk
  preflight, sampled JPEG draft profile, progressive skill references,
  machine-readable capabilities, and Direction 0.3 production requirements.
  Asset-assisted must-haves must reach rendered Score paths; unsupported
  must-haves cannot validate.
- ADR-0032 Revision Memory 0.1: accepted/rejected/reverted human decisions bind
  subject, review finding, exact patch, outcome evidence, and reusable guidance;
  project/brand retrieval is exact-scope, universal promotion requires declared
  ≥20-case independent calibration, and context is deterministically bounded.
- ADR-0034 Transcript/Edit IR 0.1: provider-neutral word tokens lock to exact
  owned/licensed footage bytes and media facts; deterministic phrase packing,
  quote-conformed word-addressed EDLs, source-drift checks, mixed silent/audio
  rendering, cut fades, bus normalization, and hash receipts. Transcription
  remains host/provider work.
- ADR-0035 Footage Evidence 0.1: one to twelve requested EDL segments compile to
  word-labeled source-time filmstrips, audio or explicit-silence waveforms, and
  adjacent four-frame cut strips with neutral RGB/luma/RMS facts. Requests and
  artifacts are digest-bound and cached; semantic cut quality remains review,
  not a pixel threshold.
- ADR-0036 Directorial Search/Direction Selection 0.1: two to four locked,
  pairwise-distinct candidate Directions; one to three same-role/same-question
  diagnostic stills; identity-free reviewer packet/contact sheet; private
  digest-bound mapping; near-identical pixel detection; complete blind decision;
  and evidence-rehashed winner receipt. It proves process integrity, not
  originality, reviewer blindness, motion/audio quality, or professional taste.

## Evidence, not claims

- Cursor-derived recovery benchmarks after ADR-0033: isolated local tarball
  installation takes 1.4s with a warm dependency cache, occupies 62.8 MiB, and
  writes zero browser-cache bytes; install through a real browser frame completes
  in 6.5s. The preceding 0.5 candidate measured 3.2s/93.7 MiB/8.8s. A 9.6s
  full-HD/vertical preview
  captures 115 JPEG frames at 12fps in 8.1s using 3.0 MiB cache. The failed
  pre-fix Cursor run took 301.5s for 510 PNG frames and exhausted disk.
- Revision-memory benchmark: 200 records across two brands yield 100 eligible
  exact-brand entries, select 23 within a 5,913-character complete context,
  leak zero foreign-brand records, retain rejections only as avoid guidance,
  and compile byte-identically on repetition.
- Transcript-edit benchmark: two generated sources with mismatched geometry/FPS
  and mixed audio lock to exact bytes; six tokens pack 75% smaller than normalized
  word JSON; three explainable segments render 3,030ms with preserved speech,
  synthesized silence, cut fades, normalized geometry/audio, and byte-identical
  repeat output. Seven stale/unsafe contracts are rejected.
- Requested-range evidence benchmark: three of four EDL segments from moving
  audiovisual and silent footage produce fifteen word-addressed samples, three
  adjacent cut strips, audio/silence waveforms, and neutral discontinuity facts;
  exact source-end sampling is safe, CLI/library manifests match, exact cache is
  reused, and five stale/corrupt requests are rejected.
- Public distribution: unauthenticated clone resolved protected `main` at
  `c2b666670d87294763ebedabdd0b7922fc140346`; isolated npm-prefix installation
  fetched `chitra-video@0.4.0`, reported CLI 0.4.0, and passed runtime probe.
- Unit suite: 87 tests.
- Still-first directorial-search benchmark: three materially different Aether
  concepts lock and render comparable identity-free hero probes; CLI/library
  artifacts agree; exact cache reuse holds; changed Direction, manifest, packet,
  contact sheet, incomplete/foreign pair diagnostics, and duplicate evidence
  are refused; a separate pixel-identical two-candidate search blocks selection.
- Creative Review contract benchmark: valid typed review, hidden
  principle/severity/verdict matching, deterministic repeated scoring, the
  documented label-collection CLI flow, and rejection of detached evidence,
  contradictory verdicts, forbidden severity, and finding spam.
- Independent calibration contract benchmark: deterministic three-reviewer
  consensus, explicit three-way disagreement, separate verdict/principle/
  severity metrics, motion/audio/register coverage, private consent, blind
  candidate enforcement, duplicate-reviewer rejection, and byte-identical CLI
  output. It proves mechanics; no real independent corpus has been collected.
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
- Textured 3D browser benchmark: generated artwork is ready before capture; 3/3
  internal mesh/camera/light/exposure states land in seek order 30 → 0 → 15;
  repeated frame 15 is byte-identical.
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

1. Publish and independently retest the 0.5.0 Cursor-first recovery on a cold
   network/cache.
2. Run ADR-0036 with outside reviewers and real briefs; measure time/token cost,
   discarded-animation reduction, blind preference, and accepted revisions.
3. Collect the pre-registered ≥20-case independent Creative Review study using
   real motion clips/audio and populate ADR-0032 with actual accepted outcomes.
4. Prove public/outside first use across Claude Code, Codex, and Cursor, then run
   a pre-registered neutral ChitraBench against real baselines.
5. Keep Card Vault as an immutable renderer benchmark. Rerun it to measure
   ADR-0028 before claiming improvement. Add masks, deeper comps, blend modes,
   motion blur, or richer audio only when
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
- Creative conformance proves structural coverage and traceability. Creative
  Review 0.1 makes semantic judgment evidence-bound and scoreable, but four
  author-labelled cases cannot prove professional taste. ADR-0030 makes an
  independent study operational but does not supply its human labels.
  Calibration data, real accepted-revision outcomes, and blind preference remain open.
- Release gates sample output frames at ≤250ms intervals plus choreography and
  transition neighborhoods. This is bounded coverage, not every-frame proof;
  shorter between-sample defects, rasterized text, and token-only CSS
  enforcement remain open.
- GitHub and `chitra-video@0.4.0` are public. The 0.5.0 recovery is a local
  release candidate until npm publication and a fresh registry install pass.
  PR #22 and its post-merge protected CI passed; three-harness outside-user
  timing remains open.
- ADR-0033 vendors only the executed MIT Three.js module and nine OFL font
  files, removing five full runtime packages. With Transcript/Edit IR included,
  the npm artifact is 586.1 kB compressed/2.2 MB unpacked before dependencies;
  installed footprint falls
  33% from 93.7 to 62.8 MiB. GSAP remains a normal licensed dependency.
- The 2026-07-18 audit corrects the stale “HyperFrames has no review loop”
  claim: it now has a sophisticated human plan/sketch/final-preview loop.
  Chitra still has no calibrated evidence that its critic or output is better.
- GitHub vulnerability alerts/private reporting and protected `main` are live;
  a single maintainer remains a governance and review ceiling.

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
