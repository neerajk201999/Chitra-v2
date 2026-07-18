# Roadmap — MVP to v1.0

**Status (2026-07-18): M0 ✅ · M1 ✅ · M2 partial · M3 partial · M4 (Creative Intelligence) IN PROGRESS.** See [known-issues.md](known-issues.md) for the honest ledger.

> **Capability-program rebaseline (2026-07-18).** Current-source verification
> confirms Remotion leads renderer/ecosystem breadth, HyperFrames leads workflow/
> media breadth and now includes plan→sketch→final-preview review, while
> video-use established compact transcript-addressed footage editing. ADR-0032
> ships scope-safe accepted-revision memory; ADR-0034/0035 now close Chitra's
> provider-neutral edit plus requested-range evidence slice. ADR-0036 now closes
> the first still-first directorial-search contract: bounded candidate Directions,
> comparable identity-free probes, and a blind selection receipt. Selection
> quality remains uncalibrated. See the
> [current capability audit](../research/capability-audit-2026-07-18.md).
> The 2026-07-16 “renderer feature-complete” sentence below is historical and
> superseded: current Remotion/HyperFrames source proves important compositor,
> imported-animation, media/audio, player, and distribution gaps. Renderer work
> remains residual/user-job driven, but the renderer is not literally complete.
>
> **Public-preview recovery (2026-07-18, ADR-0037).** Because npm authentication
> still returns 401, the exact protected-main 0.5.0 package is also available as
> a SHA-pinned GitHub prerelease. A URL-based fresh-prefix install completes
> version/probe/Intake/init/validate/real-frame in 12.4s on this machine. This
> unblocks friend tests; it is not stable npm or outside-user/cross-OS proof.
>
> **Measured preview optimization (2026-07-18, ADR-0038/0039).** Phase telemetry
> isolates browser capture as the dominant draft cost. Preserving all 115
> temporal samples while reducing only diagnostic spatial capture moves the
> fixed fixture from 8.76s to 6.02s p50 and from 3.0 to 1.3 MiB cache. Output
> dimensions and the final-typography boundary are explicit; release/evidence
> pixels remain full resolution. Cross-machine measurements remain the M3 gate.
>
> **P0 footage slice (2026-07-18, ADR-0034/0035).** Provider-neutral word transcripts
> now lock to exact local footage, pack into bounded phrase context, conform an
> explainable word-addressed EDL, and render normalized source-audio-preserving
> plates with cut fades and receipts. Requested EDL ranges now produce labeled
> filmstrips, audio/explicit-silence waveforms, adjacent-cut strips, and neutral
> RGB/luma/RMS facts under content-addressed manifests. Semantic cut judgment
> remains Creative Review work; no transcription provider is bundled.

> **Program rebaseline (2026-07-16).** The architecture remains aligned, but the
> active queue had narrowed around one Card Vault reconstruction. Review 0003
> restores the product order: release integrity (A2/A3/A5) → calibrated Creative
> QA + Style Memory → outside-user distribution → neutral ChitraBench. Card Vault
> remains an immutable renderer probe; compositor features stay residual-driven.
> See [the evidence-backed rebaseline](../reviews/0003-program-rebaseline.md).

> **Course correction (2026-07-16, ADR-0012).** Two outside reviews + our own VISION confirmed a drift: ADR-0006→0011 were all renderer/expressiveness features (media, video, figures, particles, 3D, audio) while the creative-intelligence layer VISION calls "the product" (Direction → Design → taste) stayed unbuilt and the Direction tier stayed orphaned. **Renderer is now declared feature-complete unless a concrete target film exposes a specific missing capability.** Center of gravity shifts to M4. Honest self-scoring: Rendering ~90%, Determinism ~100%, Motion IR ~90%, Quality gates ~80% (leaks — see known-issues), **Creative Direction ~20%, Narrative ~10%, Taste model ~20%, Storyboarding ~10%, Brand ~10%.** The low numbers are the whole game now.

## M0 — Memory & thesis ✅ 2026-07-14
Competitor reverse-engineering (6 reports + stack validation, docs/research/), vision, ADR-0001…0005, motion language seed, standards, roadmap.

## M1 — Proof of taste (the vertical slice) ✅ 2026-07-15
Delivered: Motion IR v0 (two tiers, zod) · compiler → HTML/GSAP with determinism guarantees · renderer (seek-protocol screenshot mode → FFmpeg, per-scene content-hash cache) · token registry · gates L1/L2 (14 unit tests green) · evidence generator · CLI (`validate/check/render/evidence/probe`) · 2 house styles (night, paper) · flagship example rendered.
**Exit gate passed:** re-render byte-identical across independent sessions (sha256-verified) · enforced MO rules gated in code with fixtures · flagship survived an internal critique loop that found and fixed 7 real defects (4 caught by gates, 3 by visual review — one of which became a new gate, QE-OVERLAP-1).
Also landed early from M2/M3: evidence sheets + critic/creator skills (prompts), Claude Code plugin manifest, AGENTS.md.

## M2 — The closed loop (the moat) — IN PROGRESS (2026-07-15: deterministic half done)
*Goal: the system catches and fixes its own defects.*
Landed: evidence generator · critique-video skill · **seeded-defect eval measuring 10/10 deterministic catch rate** ([benchmarks/seeded-defects](../../benchmarks/seeded-defects/results.md)) · audio v1 (music bed, −14 LUFS loudnorm verified, declared-BPM grid + MO-AUD-2) · true crossfade & fade-through-black · IR-REF-2 · adversarial review round 1 with 8 findings fixed ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).
Landed 2026-07-15 (later): critic-calibration harness — 4 labeled cases (control, monotony, slop-aesthetic, broken-hierarchy) whose defects pass deterministic gates by construction; run-001 scored 4/4 verdicts, 4/4 mustFinds, 0 false positives (author-biased — see run notes). Novelty/lineage/gap analysis in [docs/reviews/0002](../reviews/0002-novelty-and-gap.md). Run-001's gate candidate shipped as MO-EDIT-5 (no dead air).
Landed 2026-07-16: ADR-0027 closes the audited A2/A3/A5 release-integrity
slice with bounded temporal rendered gates, a non-bypassable hash-receipted
`release` transaction, target-safe staging, beat-aware frame-cache identity,
and measured two-pass final-bus audio.
Remaining:
- ADR-0030 makes blind independent panel collection and separate agreement
  metrics operational; collect ≥20 real cases and human annotations before
  publishing critic-reliability statistics.
- Narration/TTS generation, energy-envelope tracks, and automatic word-aligned
  overlay sync. ADR-0034 now provides word timestamps, explainable EDLs, and
  source-audio-preserving edit plates; SFX hooks, beat detection, and `at.onBeat`
  remain built (ADR-0007/0011).
- **Exit gate:** deterministic layer ≥80% on seeded defects (✅ 100%) AND critic layer measured against the calibration set with published agreement stats.

> **Priority lens (2026-07-15):** [docs/research/moats.md](../research/moats.md) ranks the five-year moats: calibration data → ChitraBench → motion-language spec → creative ladder (ADR-0006 candidate). M3 remains necessary execution, but feature polish beyond it is explicitly deprioritized; CLI is declared done.

## M3 — Distribution (install anywhere) — IN PROGRESS (2026-07-15)
*Goal: `install → first non-embarrassing video < 10 minutes` in Claude Code, Cursor, Codex.*
Landed 2026-07-15 (v3): **ADR-0008 figures & interaction choreography** — sanitized token-themed HTML-fragment mockups (agent-authored UI as first-class elements, gated on pixels), cursor element with waypoint moves + click rings, type-in preset (char cadence + caret); IR-CUR-1 gate; proven against the Anthropic Claude Design benchmark ([docs/research/benchmark-claude-design.md](../research/benchmark-claude-design.md)). Committed CC0-equivalent audio library (3 synthesized beds + SFX kit, core/audio-library/).
Landed 2026-07-15 (later): **media asset pipeline (ADR-0006)** — `chitra fetch` (download+normalize via sharp) and `chitra snap` (webpage capture via vendored Chrome, consent overlays auto-hidden, never clicked); asset bytes content-hashed into scene hashes; MO-MED-1..4 rules + static gate; provenance ledger (`assets/sources.jsonl`); proven end-to-end by the Wokelo launch film (live wokelo.ai screenshot as a scored scene). Also: right/bottom-anchor compiler bug found by the critique loop and fixed (compiler cache v3).
Landed: public GitHub repository + `chitra-video@0.4.0` on npm · verified
unauthenticated clone and isolated registry install/probe · protected `main` +
private vulnerability reporting · MIT LICENSE · canonical skills with Claude
Code/Codex/Cursor manifests, `AGENTS.md`/`GEMINI.md`, `npx skills` portability,
hash manifest, and stale-version CI checks (ADR-0016) · isolated tarball install
benchmark through a real browser frame · MO-EDIT-5 no-dead-air gate · render-
cache auto-pruning.
Landed 2026-07-18: ADR-0038/0039 complete-transaction phase telemetry and a
declared half-resolution 12fps draft profile. Five fresh-cache samples improve
p50 by about 31% on the fixed fixture while retaining all motion samples; a
generated compact-UI probe and odd-size H.264 case guard the spatial tradeoff.
Remaining:
- Ship and independently re-run the 0.5.0 Cursor recovery: zero browser download,
  real browser probe, executable CLI, sampled preview, disk preflight, and typed
  capability fit. Local benchmarks are green; public registry proof is pending.
- Three outside testers across Claude Code, Codex, and Cursor; record network-cold install-to-first-frame time and first-use failures.
- Router + per-register workflow skills (product-launch, social-short as separate workflows).
- **Exit gate:** cold-start test in 3 harnesses by 3 outside testers hits the 10-minute bar.

## M3.5 — Expressiveness & audio v2 (owner-directed priority, 2026-07-15) — LANDED same day
Owner call: close the Remotion expressiveness gap and the HyperFrames workflow gap now, ahead of M4. Landed: **video-in-scene** (ADR-0007: ffmpeg frame pre-extraction, deterministic, content-hashed, MO-MED-gated) · **SFX on choreography** (sounds fire at resolved animation starts; MO-AUD-3 sparsity gate) · **deterministic starter audio** (`chitra sfx-kit`, `chitra bed` — zero-license ffmpeg synthesis) · workflow skills (product-launch, screen-demo, social-short) · renderer-frontier survey (docs/research/render-stack-frontier.md). Proven by the akta.pro launch film: transcribed voiceover → real UI stills + moving clip + bed + SFX, all gates green.
Landed 2026-07-16 by concrete-reference exception (ADR-0012): **ADR-0013 frame-addressed transform tracks** — typed X/Y, scale, 3-axis rotation, opacity, perspective, origin, and token easing; final-frame/FPS timing; reason-gated by MO-KEY-1; browser benchmark seeks exact authored frames 3/3 and repeats a PNG byte-identically ([results](../../benchmarks/keyframe-track/results.md)).
Landed 2026-07-16 from the measured Card Vault residual: **ADR-0028 textured
3D property tracks** — rights-traced card/slab front artwork plus typed internal
mesh, camera, key/fill light, and exposure states. The browser benchmark lands
3/3 states under backward seeks and repeats a PNG byte-identically.
Remaining honest gaps vs Remotion for exact reconstruction: masks/mattes,
local-coordinate/deeper compositions, blend modes, motion blur, back/side
textures and custom 3D geometry/materials, and narration/TTS generation. Clip
audio is native through ADR-0034 edit plates but not direct Score-video mixing.
Automated exhaustive reference comparison and named ROI
diagnostics are built (ADR-0019/0022).

## M4 — Creative Intelligence (the missing brain) — STARTED 2026-07-16
*Goal: Chitra makes the creative decisions a top director + motion designer would — before rendering. The pipeline begins at intent, not at Motion IR (ADR-0012).*
Landed: ADR-0012 (creative pipeline architecture) · **docs/creative/creative-constitution.md** (the encoded WHY across narrative/rhythm/camera/type/colour/composition/brand — CC-* rules) · Direction tier wired into the CLI (`chitra plan`) · **Brief↔Score conformance gate** (`chitra conform`; CC-CONF-1..5: register match, no dropped beat, no scene without a WHY, hero moments executed, pacing peak gets air) · ADR-0013 typed frame-addressed transform tracks.
Engineering foundation: independent `Chitra-v2` lineage + ADR-0014 repository operating system, compact current-state memory, shared local/CI verification contract, executable link/version/manifest checks, and explicit SemVer/CHANGELOG discipline.
Reference intelligence: ADR-0015 `chitra decompose` → typed Style DNA with deterministic source/media facts, shot rhythm, palette, luminance/saturation, motion energy, audio onset landmarks, and evidence frames; generated benchmark reproduces known cuts/colors and identical repeated JSON.
Intake intelligence: ADR-0017 `chitra intake` → separately versioned multimodal Intake IR with objective/deliverable, mixed-source roles and rights, preferences/anti-references, brand constraints, assumptions/questions, evidence links, deterministic local hashes, and explicit unlocked URLs; 44 tests and a mixed-input benchmark.
Creative ladder: ADR-0018 Direction 0.2 + Storyboard 0.1 → explicit concept and
shot design, stable source/preference traces, three adjacent-tier conformance
boundaries, `chitra creative-check`, 55 tests, and a benchmark that catches all
three seeded intent drifts.
ADR-0031 advances Direction to 0.3 with registry-bound production requirements:
unsupported must-haves fail schema validation and asset-assisted must-haves must
reach the rendered Score path.
Reference comparison: ADR-0019 `chitra compare` → strict exhaustive frame-index
mode, explicit normalized sampling, transparent visual/audio-energy metrics,
deterministic per-frame diff evidence, and generated exact/drift fixtures.
ADR-0022 Comparison 0.2 adds validated named ROI/pair-range summaries and
cropped diffs; the fixture proves localized-drift isolation and the Card Vault
run measures 0.089867 ROI MAE versus 0.027557 whole-film MAE.
Source-assisted reconstruction: ADR-0023 adds explicit clean-room/source-
assisted labels, locked rendered-asset lineage and rights conformance, safe
project-local paths, and declared/hash-invalidating figure dependencies. A
synthetic licensed asset renders in a real browser; reference-only use and false
clean-room claims fail. Card Vault source pixels remain uncommitted pending an
explicit owner rights decision.
Rendered Figure QA: ADR-0024 registers actual figure DOM text for minimum size,
pixel contrast, safe zones, reading time, and overlap. ADR-0027 expands checks
to bounded intervals and choreography/transition neighborhoods. A generated
browser fixture triggers all five rules and leaves its compliant control green;
exhaustive every-frame coverage and token-only CSS parsing remain open.
Creative judgment: ADR-0029 ships Creative Review 0.1 with 28 stable `CR-*`
principles, isolated first-watch provenance, fourteen evidence-bound domain
assessments, actionable findings, hidden-label scoring, severity/finding
budgets, and a deterministic contract benchmark. It deliberately has no scalar
taste score and is not a release blocker until independent calibration supports
that use.
Calibration science: ADR-0030 ships a strict study contract around complete
Creative Reviews: at least three blind reviewers per case, blind candidates,
subject/provenance/consent bindings, register/motion/audio coverage,
thresholded consensus, visible disagreement, and separate verdict, principle,
and severity metrics. The synthetic benchmark proves arithmetic and CLI
mechanics only; the ≥20-case independent corpus remains to be collected.
Card Vault benchmark target registered: immutable source hash, exact 274-frame
geometry/timing, exhaustive freeze lower baseline, and worst-frame evidence.
Clean-room candidate 0.6 now authors and compares all 274 frames without copied
reference pixels/audio: mean SSIM 0.363459 versus freeze 0.269554, but worse MAE
0.027408 versus 0.024120. ADR-0020 custom constellations improved both SSIM and
MAE locally without moving the unrelated worst frames. Exact remains open; the
ADR-0021 parent transform groups then raise SSIM to 0.367146 while slightly
regressing MAE/PSNR; the tradeoff is published rather than collapsed to a win.
The rights-approved source-assisted 0.9 run then reaches SSIM 0.401685 and
localizes the next largest appearance residual to the final mark. ADR-0025 adds
bounded heterogeneous particle size/opacity/glow for that measured gap; exact
reconstruction remains open.
Remaining (priority order):
- **Creative QA data collection**: independently label ≥20 cases across brand film,
  product demo, and social short using video, motion clips, and audio; measure
  principle/severity/verdict agreement and false-positive rate.
- **Accepted-revision memory**: ADR-0032 ships the typed ledger and bounded,
  scope-safe compiler; collect real accepted/rejected outcomes to test whether
  retrieval improves future films without silent global mutation.
- **Directorial search outcomes**: ADR-0036 ships the bounded still-probe and
  blind-receipt contract; collect real searches and measure whether chosen
  Directions reduce discarded animation and improve independent preference.
- Prove outside-user first use, then run neutral **ChitraBench** end-to-end.
- **Exit gate:** on a fixed brief + reference, blind evaluators cannot distinguish Chitra's creative *decisions* (storyboard, pacing, type, palette choices) from a professional's on ≥ the ChitraBench bar.

## M5 — ChitraBench (define "best")
*Goal: the public benchmark for motion-design quality.*
- Fixed brief suite (per register), scoring harness (gates + calibrated VLM rubrics), blind A/B protocol.
- Publish Chitra vs HyperFrames (and raw-Remotion-skill baselines) results, reproducibly.
- **Exit gate:** ≥70% blind preference over HyperFrames on identical briefs; methodology withstands external scrutiny (pre-registered protocol).

## M6 — Ecosystem → v1.0
Brand ingestion ("BRAND.md for motion": logo, palette, type, motion personality → tokens), style/block registry with `chitra add`, remaining workflows (feature-demo, PR-to-video, screen-recording ingestion via video-use patterns), distributed rendering (chunk-and-concat), WebCodecs backend spike.

## Standing risks (tracked here, reviewed each milestone)
1. **Taste ceiling** — encoded rules may plateau below "Apple-grade." Mitigation: ChitraBench measures it honestly; revision loop + growing rule registry; human escalation is a feature, not a failure.
2. **VLM critic reliability** (false confidence, rubric drift). Mitigation: calibration sets, isolated critics, deterministic gates carry the floor.
3. **HyperFrames adds a critique loop** (they can read this playbook too). Mitigation: speed + the benchmark + IR-level structural advantages they can't retrofit onto raw HTML without breaking their installed base.
4. **Render-stack entropy** (Chrome/Puppeteer drift). Mitigation: pinned browser, golden-frame CI, renderer abstraction.
5. **Scope gravity** (GUI editor, hosted platform, 3D). Mitigation: VISION.md's refusal list; ADR required to expand scope.
