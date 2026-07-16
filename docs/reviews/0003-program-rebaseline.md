# Program rebaseline — capability, competition, and the shortest credible path

**Date:** 2026-07-16 · **Evidence cut:** `main` at ADR-0024

This review answers the program question, not a renderer question: can Chitra
reliably turn mixed creative direction into premium launch films, and what must
be true before it can claim to beat Remotion, HyperFrames, EditFrame, or Replit
Video? Claims below trace to the repository benchmarks, supplied-reference
decompositions, competitor source audits dated 2026-07-14, and known-issue
ledger. No blind preference study exists yet.

## Executive verdict

The architecture is pointed at the right product: typed intent, deterministic
rendering, output-side gates, bounded critique, and surgical revision. The
implementation is now a credible foundation for authored 2D product films and
UI demos. It is not yet an easy, general Apple/Google/CRED/Anthropic-quality
film system, and it has not beaten any named competitor.

The recent work did not invalidate the vision: Intake → Direction → Storyboard
→ Score → render evidence is the correct spine. The local drift is priority,
not architecture. Card Vault became the entire ordered queue even though it is
one renderer-capability probe. It remains valuable and immutable, but the
program must return to the quality layer: release enforcement, temporal gate
coverage, calibrated Creative QA, Style Memory, outside usability, then neutral
head-to-head evaluation. Compositor work remains benchmark-triggered.

## What “can create” must mean

Four different claims were being collapsed:

1. **Expressible:** the IR/compiler can represent the required pixels and time.
2. **Reliable:** deterministic gates catch objective defects before release.
3. **Easy:** a fresh user/model reaches a good first film without repository
   archaeology or expert intervention.
4. **Better:** blind evaluators prefer the output to a named baseline under the
   same brief, inputs, time, and model budget.

Chitra is broadly at (1) for 2D/UI product motion, partly at (2), locally proven
but not externally proven at (3), and has no evidence for (4).

## Premium-reference capability map

| Target grammar | Current truth | Main blockers to “easy and professional” |
|---|---|---|
| Anthropic/Claude product demo | UI figures, cursor/type choreography, video-in-scene, typography, cuts, beat grid, and evidence are expressible. The supplied 81.6s film decomposed into 12 detected shots. | No full recreation or preference score; dark network/globe motif is thin; semantic direction/critique and richer audio remain uncalibrated. |
| Google-style 2D launch | Shapes, type, UI, image/video, particles, keyframes, palette, and relational choreography cover much of the grammar. | Brand ingestion/Style Memory, illustration/motif breadth, semantic composition judgment, and a strong example corpus are missing. |
| CRED-style luxury fintech | Real 3D primitives, DOM/internal 3D tracks, front textures, custom particles, groups, and exhaustive comparison can author the complete timeline. | Card Vault candidate 0.7 predates ADR-0028 and is still far from exact: mean SSIM 0.367146; phone/card ROI MAE 0.089867 and PSNR 14.212 dB. A measured rerun, motion blur, masks/mattes, local/deeper comps, blend modes, and sound design remain gaps. |
| Apple-style product film | Sparse typography, pacing, footage placement, simple product slabs/cards, and brand-film motion tokens exist. | Broad product-CG geometry, material/lighting/camera animation, depth of field/motion blur, compositing/color pipeline, premium audio, and human-level editorial judgment do not. Supplied footage can be assembled; Chitra does not synthesize a world-class live-action or CG shoot. |

“Exact reconstruction” remains a separate, higher bar. For exact reconstruction
of the 274-frame reference, Chitra needs typed rotation/perspective tracks,
general keyframes, masks, nested compositions, blend modes, motion blur, richer
audio, and automated frame-difference comparison. Rotation/perspective/general
DOM tracks, one-level groups, textured internal mesh/camera/light/exposure
tracks, and automated whole-frame/ROI comparison are now built. Masks/mattes,
deeper local compositions, blend modes, motion blur, and richer audio remain
open.

## Competitive reality

| Axis | Evidence-backed leader today | Chitra position |
|---|---|---|
| Unrestricted rendering ecosystem and production maturity | Remotion | Chitra deliberately loses breadth: no mature player/studio, serverless render network, full composition surface, or ten years of media edge cases. |
| Agent workflow breadth, media tooling, examples, registry, and distribution | HyperFrames | HyperFrames has far more workflows, skills, presets, media resolution, editor/cloud paths, and fresh-user proof. Chitra's critique architecture is stronger in design, but its aesthetic critic is uncalibrated. |
| Hosted/embeddable editing and browser-native delivery | EditFrame/Replit-class systems | Chitra has no hosted API, embeddable editor, or browser-native WebCodecs output. That is acceptable before quality proof, but it is not parity. |
| Typed intent traceability and reason-gated Motion IR | Chitra has a differentiated implementation | Intake/Direction/Storyboard/Score conformance and addressable revision are real, benchmarked advantages; no market win follows automatically. |
| Deterministic motion-design quality gates | Chitra has measured internal evidence | The 10/10 seeded catch rate covers constructed deterministic defects only. Three-instant sampling, final-release enforcement, and aesthetic calibration are open. |
| Output quality on equal briefs | Unknown | No neutral head-to-head or blind panel. “Beats” is prohibited until ChitraBench supplies it. |

## Rebased execution order

### P0 — Make “release” truthful

1. Add one hash-keyed release path that enforces validate → creative conformance
   → rendered frame gates → final render → evidence, and refuses stale receipts.
2. Sample choreography boundaries plus bounded intervals so transient overlap,
   safe-zone, and contrast defects cannot hide between three instants.
3. Measure the final mux for loudness/peak invariants instead of treating input
   normalization as output proof.

These close known integrity findings A2, A3, and A5. A quality engine that can
be bypassed or miss the moving part is not yet a release gate.

### P1 — Calibrate the brain and memory

1. Grow critic calibration from four author-biased cases to at least 20
   independently labelled cases spanning product-demo, brand-film, and social.
2. Record evidence → finding → accepted/rejected revision → measured outcome.
3. Implement Style Memory as explicit, reviewable deltas learned only from
   accepted human revisions; never silently mutate global taste.
4. Promote only calibrated CC-* proxies into deterministic or critic gates.

### P2 — Prove first-use and distribution

1. Public repository and npm publish remain owner actions.
2. Run three outside users across Claude Code, Codex, and Cursor; record
   network-cold install-to-first-frame time, failures, model, and intervention.
3. Build the example gallery and routing only from observed first-use failures.

### P3 — Run neutral ChitraBench

Pre-register fixed briefs, allowed inputs, model/time budgets, failure handling,
deterministic metrics, blind human panels, and publication of losses. Baselines
must include HyperFrames and a competent Remotion-agent workflow; EditFrame or
other closed systems enter only where reproducible access permits. The v1 claim
requires at least 70% blind preference over HyperFrames on identical briefs,
not a self-authored rubric win.

### P4 — Add expressiveness only from residual evidence

Use Card Vault and future fixed targets to isolate the next largest residual.
Add masks, deeper comps, blend modes, motion blur, internal 3D/light tracks, or
audio automation one coherent slice at a time only when source rights and
comparison evidence show that capability—not asset mismatch or direction—is the
limiter. Preserve the clean-room baseline; source-assisted target runs require
an explicit owned/licensed claim.

## Operating-system assessment

The repository already has the core world-class habits: versioned memory, ADR
before architecture, schema-first contracts, one verification command shared by
local/CI, executable benchmarks, immutable evidence, small PRs, conventional
commits, and honest limitations. PRs 1–10 passed both branch and post-merge CI.

It is not yet a world-class *product organization* in four measurable respects:
there are no independent quality labels, no outside-user cold starts, no neutral
competitive runs, and no production incident/telemetry loop. Documentation and
green CI cannot substitute for those external feedback systems. The plan above
prioritizes them before breadth.

## Decision rule

At every next step ask: which currently prohibited claim becomes true, what
evidence will refute it, and is this the smallest shared-root change? If the
answer is only “more features,” do not build it.
