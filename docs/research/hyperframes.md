# HyperFrames (HeyGen) — Competitive Reverse-Engineering Report

**Repo analyzed:** `scratchpad/repos/hyperframes` (v0.7.57, Apache 2.0, ~4,200 files, ~227K lines of TS, ~372K words of skill markdown across 280 skill files)
**For:** Chitra — open-source AI-native video creation framework
**Date:** 2026-07-14

---

## 1. What It Actually Is

HyperFrames' one-liner (`README.md`): **"Write HTML. Render video. Built for agents."** It is an open-source framework that turns plain HTML + CSS + seekable animations (GSAP by default) into deterministic MP4s. It is explicitly positioned against Remotion: Remotion bets on React components; HyperFrames bets on plain HTML because *agents already write HTML* and no build step is needed — an `index.html` composition plays as-is in a browser.

### Installation from coding agents

Three parallel distribution channels, all in-repo:

- **skills.sh / vercel-labs skills:** `npx skills add heygen-com/hyperframes --full-depth --yes` (README.md:41). Skills are plain directories under `skills/` with a `SKILL.md` each, hashed and versioned in `skills-manifest.json`.
- **Claude Code plugin:** `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (marketplace with a single plugin pointing at `./`).
- **Cursor plugin** (`.cursor-plugin/plugin.json`, with `"skills": "./skills/"`) and **Codex plugin** (`.codex-plugin/plugin.json`, with an `interface` block: display name, category "Creativity", default prompts, brand color, composer icon).

### End-to-end flow (prompt → video)

1. User prompts an agent ("make a 60s promo for acme.com"). Agent reads the **router skill** `/hyperframes` (`skills/hyperframes/SKILL.md`) — a capability map + intent router.
2. Router picks one of 11 **creation workflows** (product-launch-video, website-to-video, faceless-explainer, pr-to-video, embedded-captions, talking-head-recut, motion-graphics, music-to-video, slideshow, general-video, remotion-to-hyperframes) and runs `npx hyperframes skills update <workflow>` to lazily install it.
3. The workflow orchestrates gated steps (e.g. product-launch-video: setup/brief → website capture → design system (`frame.md`) → storyboard/script → TTS audio → per-frame parallel sub-agent builds → transitions/captions/assembly → check → preview → render).
4. Agent authors HTML compositions: DOM elements with `class="clip"` and `data-start`/`data-duration`/`data-track-index`, one paused GSAP timeline registered at `window.__timelines["<id>"]`.
5. `npx hyperframes lint` (static) and `npx hyperframes check` (headless-Chrome gate: runtime errors, layout, motion, WCAG contrast) must pass.
6. `npx hyperframes render` seeks each frame in headless Chrome (Chrome's **BeginFrame** CDP API, `Page.captureScreenshot` fallback) and encodes with FFmpeg; audio is mixed by an FFmpeg-based audio mixer. Same input → same MP4. Cloud paths: HeyGen-hosted `cloud render` or self-managed `lambda render`.

---

## 2. Architecture

### Package layout (bun monorepo, `packages/`)

| Package | Role |
| --- | --- |
| `@hyperframes/core` | Types, parsers, generators, linter, **browser runtime** (`packages/core/src/runtime/` — clock, timeline, clipTree, media, protocol, variables, color grading, adapters), storyboard/beats/slideshow/figma/media modules |
| `@hyperframes/engine` | Seekable page→video capture: Puppeteer + CDP BeginFrame, FFmpeg wrappers, chunk encoder, streaming encoder, audio mixer, GPU encoder detection, HDR capture, alpha blit, shader transitions, video frame extractor/injector (`packages/engine/src/services/`) |
| `@hyperframes/producer` | Full pipeline: render orchestrator, HTML compiler (localizes remote media/fonts for determinism), deterministic fonts (bundles 11 `@fontsource` families), lint service, distributed render primitives (`plan`/`renderChunk`/`assemble`), regression + parity harnesses, perf gate |
| `@hyperframes/cli` (`hyperframes`) | ~35 commands: init, add, capture, lint, check, snapshot, compare, grade-compare, keyframes, preview, play, present, render, batchRender, publish, cloud, lambda, doctor, tts, transcribe, remove-background, beats, skills, telemetry… (`packages/cli/src/commands/`) |
| `@hyperframes/studio` + `studio-server` | Browser editor UI (React + CodeMirror, timeline with eye-icon `data-hidden` toggles, caption editing) |
| `@hyperframes/player` | Embeddable `<hyperframes-player>` web component |
| `@hyperframes/sdk` | Headless, framework-neutral composition **editing** engine (programmatic edits to composition HTML) |
| `@hyperframes/shader-transitions` | WebGL transitions (html2canvas-based) |
| `@hyperframes/aws-lambda`, `gcp-cloud-run` | Distributed rendering adapters (SAM/Step Functions/S3; Terraform for GCP); `examples/k8s-jobs` too |
| `@hyperframes/parsers`, `lint` | HTML/JS parsing (babel/acorn/recast/linkedom) and lint rules |

### Scene/timeline model

The **composition contract** (`skills/hyperframes-core/SKILL.md`, enforced by `packages/core/src/runtime/`):

- Root `<div data-composition-id data-width data-height data-duration>`; children with `class="clip"` + `data-start/data-duration/data-track-index` (tracks = z-layers, like an NLE).
- **Sub-compositions**: separate HTML files loaded via `data-composition-src`, root wrapped in `<template>` (the runtime *only clones template contents* — a notorious footgun the skills hammer on). Per-instance variables supported.
- **One paused GSAP timeline** per composition, registered synchronously at `window.__timelines["<id>"]`. Render duration = root `data-duration`, not timeline length.
- Seven **runtime adapters** (`packages/core/src/runtime/adapters/`, docs in `skills/hyperframes-animation/adapters/`): GSAP (default, "95% of motion work"), Lottie (`__hfLottie`), Three.js (`hf-seek` events), Anime.js (`__hfAnime`), CSS keyframes (negative `animation-delay` seeking), WAAPI (`currentTime`), TypeGPU/WebGPU. Duration inference rules per runtime documented in `skills/hyperframes-core/references/determinism-rules.md`.
- **Framework-owned media playback**: `<video>`/`<audio>` elements are seeked/injected by the producer (`videoFrameInjector`), never left to native playback. Media must be direct children of the host root; duplicate element ids render *blank* because the producer injects frames via `getElementById`.

### Rendering pipeline

`packages/engine/src/services/frameCapture.ts`: Puppeteer navigates to a local Hono file server, waits for the page to expose the `window.__hf` seek protocol, then captures each frame via **Chrome's BeginFrame CDP API** (`HeadlessExperimental.beginFrame` — deterministic compositor ticks, Linux/Docker) or `Page.captureScreenshot` (macOS fallback), with SwiftShader detection, GPU-mode resolution, transparent-background init for alpha output (WebM/MOV overlays), `drawElementService` for HTML-as-texture/accelerated-canvas capture, and 3D projection handling. Frames stream to FFmpeg chunk/streaming encoders (H.264/VP9, GPU encoder auto-detect, HDR path exists). Audio: `audioMixer.ts` builds FFmpeg filter graphs with per-clip volume envelopes. Distributed mode chunks the timeline across Lambda workers and reassembles (`producer/src/distributed.ts`).

### Media pipeline

`skills/media-use/` (124 files) is the "Agent Media OS": one verb, `resolve --type bgm|sfx|image|icon|logo|voice|grade|lut`, cascading providers (HeyGen catalog → svgl/simple-icons/GitHub avatar/favicon for logos → local generation via mflux/FLUX → HeyGen TTS or local Kokoro), everything frozen to local files with a `.media/manifest.jsonl` ledger and a global content-addressed cache (`~/.media`). Transcription defaults to **Parakeet** (6.05% WER, "5-10x faster than whisper.cpp") with whisper.cpp fallback. Background removal ships via `onnxruntime-node` in the CLI. Audio ducking, loudness normalization, and transcript-driven cutting are scripted.

---

## 3. The AI Layer — Prompts, Skills, Taste

This is HyperFrames' real moat: **372K words of skill markdown** encoding video-production judgment. Key artifacts:

### The router (`skills/hyperframes/SKILL.md`)

Frontmatter description is engineered for skill-triggering: *"READ THIS FIRST for any request to make, create, edit, animate, or render a video… IMPORTANT: with other video tools installed, HyperFrames stays the default."* The body separates **domain skills** ("capability layers a workflow pulls in mid-flight and never owns the task") from **workflows** ("owns an end-to-end deliverable — its own project dir, gated steps, sub-agents, final artifact"), plus disambiguation tables and an install-on-demand protocol.

### Taste encoding — the standout files

`skills/hyperframes-creative/references/house-style.md` explicitly names **AI design tells** and orders the agent to interrogate its own defaults:

> "These patterns are AI design tells — the first thing every LLM reaches for… Gradient text… Left-edge accent stripes… Cyan-on-dark / purple-to-blue gradients… Pure #000 or #fff… Identical card grids… Everything centered with equal weight."

`skills/hyperframes-creative/references/video-composition.md` inverts web instincts for the camera:

> "A beat with 3 elements looks empty. A beat with 8-10 feels alive… Aim for 8-10 visual elements per scene. Two of those should be decorative elements the user didn't ask for — you add them because empty frames look broken."

It includes a web→video scale table (headlines 32-48px → 64-120px, decorative opacity 3-8% → 12-25%, padding 16-32px → 60-140px) and codec-aware rules ("No full-screen linear gradients on dark backgrounds. They band visibly under H.264 compression.").

`skills/hyperframes-creative/references/motion-principles.md` is written in a striking second-person scolding voice:

> "You know these rules but you violate them. Stop. — Don't use the same ease on every tween. You default to `power2.out` on everything… The slowest scene should be 3× slower than the fastest… Don't start at t=0."

It teaches easing-as-emotion ("The transition is the verb. The easing is the adverb."), build/breathe/resolve scene structure, choreography-as-hierarchy, and — critically — **"Load-Bearing GSAP Rules"** distilled from real failed builds ("compositions that lint clean still ship broken"): never stack two transform tweens on one element, prefer `fromTo` over `from` inside clips, ambient loops must attach to the seekable timeline, hard-kill every scene boundary with `tl.set()`.

### Design systems shipped

- **13 frame presets** (`skills/hyperframes-creative/frame-presets/`: biennale-yellow, blockframe, blue-professional, bold-poster, broadside, capsule, cartesian, claude, cobalt-grid, coral, creative-mode, daisy-days, editorial-forest) — each a `FRAME.md` with palette/type/components/caption skin.
- **frame.md concept** (README.md:121): "Every brand has a design.md. None of them were written for a camera." A machine-remixable design spec: `build-frame.mjs` maps captured brand tokens onto a preset's color roles deterministically (product-launch-video Step 2).
- **9 palettes** (`skills/hyperframes-creative/palettes/`), typography guardrails with a banned-fonts list, narration/story-spine/beat-direction doctrine.
- **36 atomic motion rules** + **15 scene blueprints** (`skills/hyperframes-animation/rules/`, `blueprints/`) — each a named, reproducible recipe (e.g. `kinetic-beat-slam`, `depth-scatter-assemble`, `multi-phase-camera`) with full HTML/CSS/GSAP code. Workers are ordered to "open the rule recipe for every named motion — never name-guess (a guess loses the signature move)."
- **Caption identity systems**: `skills/embedded-captions/` ships 36 visual identities as JSON "themes" and "dna" files (chrome, documentary, editorial, glitch, neon, velocity…).

### Sub-agent orchestration

Workflows dispatch parallel per-frame sub-agents with tightly scoped contracts. `skills/product-launch-video/sub-agents/frame-worker.md` is a masterclass in role isolation: an explicit **"You do NOT decide"** list (narration, duration, transitions, audio, design tokens, assets, the shared storyboard), a caption keep-out band ("all content in the top ~83%"), anti-slide doctrine ("Dumping the whole canvas in the first ~25% then holding it is exactly what reads as a PowerPoint slide"), and a self-check keyed to lint error codes since workers can't run the CLI on an unassembled frame. `skills/hyperframes-core/references/subagent-dispatch.md` abstracts dispatch verbs across harnesses (Claude Code, Codex, Cursor).

---

## 4. The Skills Mechanism

- **Format:** `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`, optional `metadata.tags`). Descriptions are long, trigger-phrase-rich, and include *negative* routing ("Not a general site tour (/website-to-video). Unclear → /hyperframes"). Supporting files sit beside it: `references/`, `scripts/` (runnable .mjs/.py), `agents/`/`sub-agents/`, `assets/`, category `module.md`s.
- **Manifest:** `skills-manifest.json` maps each skill → content hash + file count; used by `hyperframes skills check/update` for staleness detection. `scripts/lint-skills.ts` lints skill content in CI; `scripts/test-skills-fresh.sh` + `Dockerfile.test` test fresh installs.
- **Lazy install protocol:** core set (router + `hyperframes-*` + media-use) refreshed by `hyperframes init`; workflows installed at trigger time (`npx hyperframes skills update <name>`) — the router carries all trigger phrases precisely so it can route to *not-yet-installed* skills. `render`/`lint` print a one-line stale-skill reminder.
- **Multi-host packaging:** the same `skills/` dir is exposed via skills.sh registry, Claude plugin marketplace, Cursor plugin, Codex plugin. `.claude/settings.json` and `.codex/hooks.json` even ship PreToolUse hooks that gate `git commit` on build+lint+typecheck.
- **Progressive disclosure:** every SKILL.md is a thin router into `references/` read on demand ("Do not read every reference for simple edits" — `hyperframes-creative/SKILL.md`), keeping context cost low.

---

## 5. Quality Control

Layered, mostly *preventive* rather than *evaluative*:

1. **Static lint** (`npx hyperframes lint`, `packages/lint`): structural rules with named codes (`missing_template_wrapper`, `timeline_not_paused`, `gsap_css_transform_conflict`, `exit_animation_on_non_final_scene`, `gsap_repeat_ceil_overshoot`, `font_family_without_font_face`…).
2. **Browser gate** (`npx hyperframes check`, `packages/cli/src/commands/check.ts`): one headless-Chrome session running lint + runtime errors + **layout audit** (1,459-line `layout-audit.browser.js`: overflow, collapsed boxes, offscreen content) + **motion sampling** (`motion-sample.browser.js`) + **WCAG AA contrast** on five sampled frames (`contrast-audit.browser.js`, with `--snapshots` to persist the PNGs).
3. **Visual spot-checks:** `snapshot --at <midpoints>` stitches a contact sheet (`snapshots/contact-sheet.jpg`); `hyperframes keyframes` diagnoses rendered motion; `grade-compare` previews color grades; `compare` diffs renders.
4. **Documented silent-bug lists:** `hyperframes-core` SKILL explicitly enumerates bugs "lint/validate/inspect won't catch" (root sizing collapse, duplicate ids rendering blank, root background dropped by frame compositing) so the *agent* is the check.
5. **Workflow gates:** every workflow step has an explicit artifact gate; failures re-dispatch a **repair sub-agent** with the finding as hard constraint (motion-graphics `agents/finalize.md`; frame-worker "Retry" clause).
6. **Engineering-side regression:** golden MP4 baselines in Git LFS (~240MB, `packages/producer/tests/`), parity harness (local vs Lambda), perf gate, runtime conformance tests; the Remotion-port skill ships a **tiered SSIM eval corpus** ("a translation that 'looks right' but renders 0.05 SSIM lower than the validated baseline is silently wrong" — `skills/remotion-to-hyperframes/SKILL.md:16`).

**What's missing:** there is no *aesthetic* critique loop — no LLM/VLM judge scoring the rendered output against the storyboard, no "watch the video and criticize it" pass. The contact sheet step literally says "Glance at it; if nothing is obviously broken, move on — don't linger here." Vision captioning of captured assets is used for *input* understanding, not *output* review. Quality is achieved by constraining generation, not by evaluating results.

---

## 6. Developer Experience

- **CLI:** citty-based, ~35 commands, non-interactive by default ("agents-first"), `doctor` for environment triage, `init --example`/`--tailwind`, `preview` (Studio with live reload), `play`/`publish` (shareable links via hyperframes.dev), `cloud render` (zero-infra) and `lambda deploy/render` (BYO AWS), `batchRender`, `feedback`, telemetry with redaction (`packages/core/src/telemetryRedaction.ts`).
- **Docs:** Mintlify site with 5 tabs (Documentation/Catalog/Packages/SDK/Reference), a generated catalog page per registry item with preview MP4s, showcase, weekly updates, per-release notes (135+ files in `releases/`), contributor guides including `docs/contributing/studio-manual-dom-editing.mdx`. `DOCS_GUIDELINES.md` and `DESIGN.md` govern doc quality/brand.
- **Registry:** 142 items (`registry/registry.json`: 109 blocks, 25 components, 8 examples) installed via `npx hyperframes add <name>`. Each has `registry-item.json` (shadcn-style: `$schema`, type `hyperframes:block`, files with targets, preview video/poster, typed `params` like `--bg-color`) — a genuinely good "shadcn for video" design.
- **Studio:** browser editor (timeline scrubbing, `data-hidden` eye toggles, CodeMirror editing, caption tools) + headless `@hyperframes/sdk` for programmatic edits.
- **Examples/deploy:** `examples/aws-lambda`, `gcp-cloud-run`, `k8s-jobs` with sample events and scripts.
- **Repo hygiene:** bun + oxlint/oxfmt + lefthook + commitlint + knip + renovate; `AGENTS.md`/`CLAUDE.md` for contributors' agents; conventional commits.

---

## 7. Scores (1–10)

| Subsystem | Score | Justification |
| --- | --- | --- |
| Architecture | 8 | Clean core/engine/producer/cli layering, adapter pattern for runtimes, headless SDK, distributed rendering; but heavy Chrome/Puppeteer coupling and a very large surface for a v0.7. |
| Rendering | 8 | Deterministic BeginFrame capture + FFmpeg, alpha/HDR/GPU-encode paths, Lambda chunking, golden-MP4 regression — serious engineering; still fundamentally screenshot-a-browser (throughput ceiling, no native compositor). |
| Motion quality | 7 | 36 rules + 15 blueprints + anti-slop doctrine produce well-above-baseline motion; but it's all DOM/GSAP 2.5D — no real camera, physics, or cinematic 3D grammar; quality depends on the agent following prose. |
| AI/prompt design | 9 | Best-in-class: router + lazy install, role-isolated sub-agents, self-check lists keyed to lint codes, taste files that name and ban LLM defaults, failure-derived "load-bearing rules." |
| Skills/DX | 9 | Four distribution channels, hashed manifest, staleness checks, shadcn-style registry, non-interactive CLI, excellent docs; minor friction (`--full-depth` registry-lag workaround, neutered `--skip-skills`). |
| Quality control | 6 | Strong deterministic gates (lint/check/contrast/layout/motion sampling, SSIM eval for ports) but no aesthetic judge, no VLM review of rendered output, no taste regression on generated videos. |
| Extensibility | 7 | Runtime adapters, registry contribution path, hooks in producer, headless SDK; but the skill/workflow system is HeyGen-authored — no third-party workflow packs, and cloud value-adds (TTS/BGM catalog) funnel to HeyGen. |

---

## 8. Weaknesses & Gaps (What Chitra Must Beat)

1. **No output-side critique loop.** Nothing watches the rendered video. All taste is front-loaded prose; a mediocre-but-lint-clean result ships. A VLM-based "director's review" (frame sampling → scored critique → targeted re-dispatch) would leapfrog them.
2. **Prose-enforced correctness = fragile.** Whole classes of "silent bugs" (template transport, duplicate ids, root background dropped, transform-tween stacking) are documented as *agent responsibilities* because the linter can't catch them. That's a framework-design smell: the composition contract has too many footguns, and the skills exist partly to paper over them. A cleaner declarative model (or a compiler that makes these states unrepresentable) removes thousands of words of warnings.
3. **HTML/DOM ceiling on cinematic quality.** Motion is transforms + opacity on divs; the allowlist bans layout animation; 3D is bolt-on (Three.js adapter, `threeDProjection`). No camera system, no depth-of-field/motion-blur as first-class primitives (they exist only as registry components), no physics, no light. "8-10 elements per scene" density doctrine fights slop but can also produce busy, samey motion-graphics-flavored output.
4. **Render throughput.** Seek-and-screenshot headless Chrome per frame is inherently slow and memory-hungry (low-memory clamps, browser pooling, and perf gates in the engine attest to it). GPU/WebCodecs or Skia-direct rendering would be a step change.
5. **Determinism tax on expressiveness.** No `repeat:-1`, no wall-clock, no video `<iframe>`s, no hover — necessary for their model, but a runtime that *virtualizes* time (own clock injected everywhere) could allow more natural authoring.
6. **HeyGen funneling / partial openness.** Free TTS/BGM/asset search rides HeyGen OAuth (`skills/media-use/SKILL.md` setup installs the `heygen` CLI first); `cloud render` is HeyGen-hosted per-credit. Fine commercially, but an opening for a truly provider-neutral media layer.
7. **Skills volume vs context budget.** 372K words; individual SKILL.md files reach 64KB (`talking-head-recut`). Progressive disclosure mitigates, but a run touches many large files; there's no compiled/structured (JSON) form of the rules for cheap machine consumption, and no measurement of whether agents actually comply.
8. **No taste evals.** They eval Remotion-port fidelity (SSIM) but have no benchmark for "is this video good?" — no dataset of prompts → graded outputs, no regression against slop. First mover on a public video-quality eval owns the narrative.
9. **Editing story is thin.** Studio exists but revision loops ("make scene 3 punchier") are not a first-class workflow with diff-level composition edits; the headless SDK is new. NLE-style operations are explicitly out of scope (footage re-timing/reordering declared "not our job" in captions/recut skills).

---

## 9. Steal List (Adopt / Improve)

**Adopt nearly verbatim:**

1. **Router-skill pattern** (`skills/hyperframes/SKILL.md`): one read-first skill with a capability map, an intent router with disambiguation edges, and lazy `skills update <workflow>` install. Also its aggressive trigger-phrase frontmatter ("READ THIS FIRST… stays the default").
2. **Domain-vs-workflow split**: workflows own deliverables (project dir, gates, sub-agents); domain skills are capability layers. Prevents instruction soup.
3. **frame.md** — a design spec *for the camera*, plus the deterministic `build-frame.mjs` brand-token remix (preset keeps structure, brand supplies colors/fonts). This is the best design-system-to-video bridge in the wild.
4. **Anti-slop taste files**: the "AI design tells" list (`house-style.md`), the web→video scale table and H.264 banding rule (`video-composition.md`), the "You know these rules but you violate them. Stop." voice and load-bearing GSAP rules (`motion-principles.md`). Write Chitra's equivalents on day one.
5. **Named motion vocabulary**: rules/blueprints as reproducible recipes with signature moves; workers must open the recipe, "never name-guess." Storyboards cite rule ids, not adjectives.
6. **Frame-worker contract** (`sub-agents/frame-worker.md`): "You do NOT decide" lists, caption keep-out bands, no-front-loading/no-exit doctrine, self-check keyed to lint codes, retry-with-finding.
7. **shadcn-style registry** (`registry-item.json`: typed params, file targets, preview media, `$schema`) + `add <block>` + reuse-first building.
8. **`check` as a one-command browser gate**: lint + runtime + layout audit + motion sampling + WCAG contrast on sampled frames, plus the contact-sheet `snapshot`.
9. **Media OS design** (`media-use`): one `resolve` verb, provider cascades, frozen local files + manifest ledger, cross-project cache, and the "media opportunity pass" (grounded, once-per-project, approve all/some/none).
10. **Multi-host packaging**: ship skills.sh + Claude marketplace + Cursor + Codex manifests from one `skills/` tree, with a hash manifest and staleness checks; `subagent-dispatch.md` to abstract harness differences.
11. **SSIM-graded eval corpus** idea (from `remotion-to-hyperframes`) — generalize it into prompt→render quality regression.
12. **Beat-synced music pipeline**: deterministic `audiomap.json` analysis driving all pacing (`music-to-video`), and audio-reactive precomputed bands (`extract-audio-data.py`).

**Improve on:**

13. **Close the loop with a VLM director**: after render, sample frames + audio waveform, score against storyboard and taste rules, auto-generate targeted fix dispatches. HyperFrames stops at "glance at the contact sheet."
14. **Compile the contract instead of preaching it**: make Chitra's composition format eliminate template-transport/duplicate-id/tween-stacking classes of bugs by construction (schema-validated scene IR → generated seek-safe code), shrinking the warning literature.
15. **First-class cinematic primitives**: camera (dolly/rack focus), motion blur, depth, grain, light as engine features with typed parameters — not registry components.
16. **Faster renderer**: WebCodecs/OffscreenCanvas or Skia path with a Chrome-parity fallback; keep their determinism guarantees and golden-baseline regression discipline.
17. **Public quality benchmark**: a graded prompt→video eval suite (motion variety, density, contrast, pacing, brand adherence) — the taste equivalent of their lint codes.

---

**Bottom line:** HyperFrames' engine is solid but conventional (headless Chrome + FFmpeg, like Remotion). Its genuinely novel asset is the **agent-facing production system**: 20 versioned skills that encode a studio's worth of craft — routing, story doctrine, design systems, named motion recipes, role-isolated sub-agents, and deterministic gates. Chitra must match that system's shape (router, workflows, registry, gates, multi-host skills) while beating it on the two things it lacks: a **closed aesthetic feedback loop** and a **composition model that makes slop and silent breakage structurally impossible** rather than prose-discouraged.
