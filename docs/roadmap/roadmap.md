# Roadmap — MVP to v1.0

**Status (2026-07-16): M0 ✅ · M1 ✅ · M2 partial · M3 partial · M4 (Creative Intelligence) STARTED.** See [known-issues.md](known-issues.md) for the honest ledger.

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
Remaining:
- Independent critic runs (fresh sessions) + independent human labels; grow to ~20 cases across registers before publishing agreement stats.
- Narration/voiceover (word timestamps), energy-envelope tracks, and clip-audio pass-through. SFX hooks + deterministic beat detection + `at.onBeat` are built (ADR-0007/0011).
- Interval-based gate sampling (close the between-instants gap).
- **Exit gate:** deterministic layer ≥80% on seeded defects (✅ 100%) AND critic layer measured against the calibration set with published agreement stats.

> **Priority lens (2026-07-15):** [docs/research/moats.md](../research/moats.md) ranks the five-year moats: calibration data → ChitraBench → motion-language spec → creative ladder (ADR-0006 candidate). M3 remains necessary execution, but feature polish beyond it is explicitly deprioritized; CLI is declared done.

## M3 — Distribution (install anywhere) — IN PROGRESS (2026-07-15)
*Goal: `install → first non-embarrassing video < 10 minutes` in Claude Code, Cursor, Codex.*
Landed 2026-07-15 (v3): **ADR-0008 figures & interaction choreography** — sanitized token-themed HTML-fragment mockups (agent-authored UI as first-class elements, gated on pixels), cursor element with waypoint moves + click rings, type-in preset (char cadence + caret); IR-CUR-1 gate; proven against the Anthropic Claude Design benchmark ([docs/research/benchmark-claude-design.md](../research/benchmark-claude-design.md)). Committed CC0-equivalent audio library (3 synthesized beds + SFX kit, core/audio-library/).
Landed 2026-07-15 (later): **media asset pipeline (ADR-0006)** — `chitra fetch` (download+normalize via sharp) and `chitra snap` (webpage capture via vendored Chrome, consent overlays auto-hidden, never clicked); asset bytes content-hashed into scene hashes; MO-MED-1..4 rules + static gate; provenance ledger (`assets/sources.jsonl`); proven end-to-end by the Wokelo launch film (live wokelo.ai screenshot as a scored scene). Also: right/bottom-anchor compiler bug found by the critique loop and fixed (compiler cache v3).
Landed: npm publish readiness (`chitra-video`, tarball verified; publish pending owner npmjs login) · MIT LICENSE · canonical skills with Claude Code/Codex/Cursor manifests, `AGENTS.md`/`GEMINI.md`, `npx skills` portability, hash manifest, and stale-version CI checks (ADR-0016) · isolated tarball install benchmark through a real browser frame · MO-EDIT-5 no-dead-air gate · render-cache auto-pruning.
Remaining:
- Make the GitHub repository public and `npm publish` (owner actions).
- Three outside testers across Claude Code, Codex, and Cursor; record network-cold install-to-first-frame time and first-use failures.
- Router + per-register workflow skills (product-launch, social-short as separate workflows).
- **Exit gate:** cold-start test in 3 harnesses by 3 outside testers hits the 10-minute bar.

## M3.5 — Expressiveness & audio v2 (owner-directed priority, 2026-07-15) — LANDED same day
Owner call: close the Remotion expressiveness gap and the HyperFrames workflow gap now, ahead of M4. Landed: **video-in-scene** (ADR-0007: ffmpeg frame pre-extraction, deterministic, content-hashed, MO-MED-gated) · **SFX on choreography** (sounds fire at resolved animation starts; MO-AUD-3 sparsity gate) · **deterministic starter audio** (`chitra sfx-kit`, `chitra bed` — zero-license ffmpeg synthesis) · workflow skills (product-launch, screen-demo, social-short) · renderer-frontier survey (docs/research/render-stack-frontier.md). Proven by the akta.pro launch film: transcribed voiceover → real UI stills + moving clip + bed + SFX, all gates green.
Landed 2026-07-16 by concrete-reference exception (ADR-0012): **ADR-0013 frame-addressed transform tracks** — typed X/Y, scale, 3-axis rotation, opacity, perspective, origin, and token easing; final-frame/FPS timing; reason-gated by MO-KEY-1; browser benchmark seeks exact authored frames 3/3 and repeats a PNG byte-identically ([results](../../benchmarks/keyframe-track/results.md)).
Remaining honest gaps vs Remotion for exact reconstruction: masks/mattes, nested compositions, blend modes, motion blur, internal 3D camera/mesh tracks, clip audio pass-through, narration/TTS timeline, and automated reference-frame comparison.

## M4 — Creative Intelligence (the missing brain) — STARTED 2026-07-16
*Goal: Chitra makes the creative decisions a top director + motion designer would — before rendering. The pipeline begins at intent, not at Motion IR (ADR-0012).*
Landed: ADR-0012 (creative pipeline architecture) · **docs/creative/creative-constitution.md** (the encoded WHY across narrative/rhythm/camera/type/colour/composition/brand — CC-* rules) · Direction tier wired into the CLI (`chitra plan`) · **Brief↔Score conformance gate** (`chitra conform`; CC-CONF-1..5: register match, no dropped beat, no scene without a WHY, hero moments executed, pacing peak gets air) · ADR-0013 typed frame-addressed transform tracks.
Engineering foundation: independent `Chitra-v2` lineage + ADR-0014 repository operating system, compact current-state memory, shared local/CI verification contract, executable link/version/manifest checks, and explicit SemVer/CHANGELOG discipline.
Reference intelligence: ADR-0015 `chitra decompose` → typed Style DNA with deterministic source/media facts, shot rhythm, palette, luminance/saturation, motion energy, audio onset landmarks, and evidence frames; generated benchmark reproduces known cuts/colors and identical repeated JSON.
Intake intelligence: ADR-0017 `chitra intake` → separately versioned multimodal Intake IR with objective/deliverable, mixed-source roles and rights, preferences/anti-references, brand constraints, assumptions/questions, evidence links, deterministic local hashes, and explicit unlocked URLs; 44 tests and a mixed-input benchmark.
Creative ladder: ADR-0018 Direction 0.2 + Storyboard 0.1 → explicit concept and
shot design, stable source/preference traces, three adjacent-tier conformance
boundaries, `chitra creative-check`, 49 tests, and a benchmark that catches all
three seeded intent drifts.
Reference comparison: ADR-0019 `chitra compare` → strict exhaustive frame-index
mode, explicit normalized sampling, transparent visual/audio-energy metrics,
deterministic per-frame diff evidence, and generated exact/drift fixtures.
Card Vault benchmark target registered: immutable source hash, exact 274-frame
geometry/timing, exhaustive freeze lower baseline, and worst-frame evidence.
Clean-room candidate 0.5 now authors and compares all 274 frames without copied
reference pixels/audio: mean SSIM 0.353047 versus freeze 0.269554, but worse MAE
0.027479 versus 0.024120. Exact reconstruction remains open; residual evidence
prioritizes the custom particle close before broader compositor work.
Remaining (priority order):
- **Style Memory**: learn from accepted human revisions (diff → style delta) so future films inherit taste and brand stay consistent.
- **Creative QA**: promote CC-* constitution principles to calibrated gates (narrative/composition/pacing/rhythm), beyond motion mechanics.
- **Then ChitraBench** end-to-end (benchmarking a creative system, not a renderer).
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
