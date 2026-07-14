# OpenMontage — Competitive/Idea-Mining Analysis for Chitra

Repo analyzed: `/private/tmp/claude-501/-Users-macbook-Documents-Neeraj-s-Projects-Chitra/1302c09e-b491-430e-abd8-a3ab5beda127/scratchpad/repos/OpenMontage` (AGPLv3, ~2,010 files, Python tools + Node/Remotion renderer + ~400 markdown skills).

## 1. What it is, end-to-end

OpenMontage is an **agent-first video production system with no runtime orchestrator**. The user opens the repo in Claude Code/Cursor/Copilot and types a brief ("Make a 60-second explainer about black holes"). The coding agent *is* the control plane: it reads a YAML **pipeline manifest** (`pipeline_defs/*.yaml`), reads per-stage markdown **director skills** (`skills/pipelines/<pipeline>/<stage>-director.md`), calls Python **tools** (`tools/`, all `BaseTool` subclasses auto-discovered by `tools/tool_registry.py`), validates every stage output against **JSON Schemas** (`schemas/artifacts/`), writes resumable **checkpoints** (`lib/checkpoint.py`), and pauses at **human approval gates**. Output is `projects/<slug>/renders/final.mp4`.

Canonical stage flow (from `docs/ARCHITECTURE.md` and `AGENT_GUIDE.md`):

```
research → proposal → script → scene_plan → assets → edit → compose → publish
```

Key design facts:
- **No LLM API calls at runtime.** The IDE agent supplies all intelligence; Python is "tools + persistence only" (`docs/ARCHITECTURE.md` §Core Principles).
- 12 pipelines (animated-explainer, cinematic, documentary-montage, talking-head, clip-factory, screen-demo, character-animation, localization-dub, etc.).
- A local web UI, **Backlot** (`backlot/`), is a live "storyboard board" that watches the project directory and renders stages, decisions, costs, and approval gates — derived purely from files on disk, replayable after the run.
- A **reference-video entry point**: paste a YouTube Short/Reel, the agent analyzes transcript/pacing/scenes/keyframes (`skills/meta/video-reference-analyst.md`) and proposes 2–3 differentiated concepts with cost estimates before producing anything.

## 2. The timeline / editing model

There is no single monolithic timeline format; there is a **chain of schema-validated JSON artifacts**, each the contract for the next stage. The two that matter for Chitra:

### `scene_plan` (creative intent) — `schemas/artifacts/scene_plan.schema.json`
Scenes carry a *semantic* layer that most EDLs lack:

```json
"shot_language": {
  "shot_size": ["extreme_wide", "wide", ..., "establishing"],
  "camera_movement": ["static", "pan_left", "dolly_in", "whip_pan", "orbital", ...],
  "lens_mm": [14, 24, 35, 50, 85, 135, 200],
  "lighting_key": ["high_key", "golden_hour", "neon", "volumetric", ...],
  "depth_of_field": ["shallow", "medium", "deep"],
  "color_temperature": ["cool", "neutral", "warm", "mixed"]
},
"shot_intent": "WHY this shot exists...",
"narrative_role": ["establish_context", "build_tension", "deliver_payload",
                   "emotional_beat", "evidence", "resolution", "call_to_action", ...],
"hero_moment": true
```

Every scene also has `type` (talking_head | broll | animation | diagram | text_card | generated | ...), `start_seconds`/`end_seconds`, `required_assets[]` with `source: generate|source|provided|record`, and optional `character_actions[]` (acting beats for rigged characters).

### `edit_decisions` (the EDL) — `schemas/artifacts/edit_decisions.schema.json`
A flat, renderer-agnostic edit-decision list:

```json
{
  "version": "1.0",
  "cuts": [{
    "id": "cut_01", "source": "asset_slot_01",
    "in_seconds": 1.2, "out_seconds": 5.2,
    "speed": 1.0, "layer": "primary|overlay|background",
    "transform": {"scale": 1.0, "position": "center",
                  "animation": "ken-burns-slow-zoom", "crop": {...}},
    "transition_in": "fade", "transition_out": "cut", "transition_duration": 0.8,
    "reason": "opening hero — raindrop on asphalt, 4s hold"
  }],
  "overlays": [{"asset_id", "start_seconds", "end_seconds", "position", "animation", "opacity"}],
  "audio": {
    "narration": {"segments": [{"asset_id", "start_seconds"}]},
    "music": {"asset_id", "volume", "fade_in_seconds", "fade_out_seconds",
              "ducking": {"threshold_db", "reduction_db", "attack_ms", "release_ms"}},
    "sfx": [{"asset_id", "start_seconds", "volume"}]
  },
  "subtitles": {"enabled", "style": "sentence|word-by-word|karaoke", "font", "position", ...},
  "renderer_family": "explainer-data | cinematic-trailer | documentary-montage | ...",
  "render_runtime": "remotion | hyperframes | ffmpeg",
  "composition_mode": "templated | atelier",
  "slideshow_risk_score": {"average": 1.8, "verdict": "strong|acceptable|revise|fail"}
}
```

Three governance fields are **locked at proposal time** and must be carried forward unchanged: `renderer_family` (creative grammar), `render_runtime` (engine), `composition_mode` (assemble stock scene-types vs. hand-author). Every `cut` has a `reason` — the EDL is self-documenting for audit and review.

On the Remotion side, cuts double as **typed scene components**: `Cut.type` in `remotion-composer/src/Explainer.tsx` (lines 200–279) dispatches to `text_card`, `stat_card`, `bar_chart`, `line_chart`, `pie_chart`, `kpi_grid`, `comparison`, `callout`, `hero_title`, `anime_scene` (still images + particles + camera motion), `terminal_scene` (fully synthetic terminal recording), `screenshot_scene` (scripted cursor/typing overlays on a static screenshot). Overlays: `section_title`, `stat_reveal`, `provider_chip`. Authoritative catalog: `remotion-composer/SCENE_TYPES.md`. A second composition, `CinematicRenderer` (`remotion-composer/src/cinematic/types.ts`), uses a discriminated-union scene list (`kind: "video" | "title"`) with word-level caption config.

## 3. Rendering

Three engines behind one tool, `tools/video/video_compose.py` (2,634 lines), dispatched on `edit_decisions.render_runtime`:

1. **Remotion (React)** — `_remotion_render()` serializes edit_decisions to a props JSON, rewrites asset paths to `file://` URIs, derives a `themeConfig` from the active style playbook (`_build_theme_from_playbook`) so "every video gets a unique visual identity derived from its production decisions — not picked from a preset menu," picks a composition ID from `renderer_family`, and shells out to `npx remotion render`. Effects/transitions are React: `spring()`/`interpolate()` per frame, animated gradient-mesh backgrounds, particle overlays, TikTok-style word captions.
2. **HyperFrames (HTML/CSS/GSAP)** — `_render_via_hyperframes()`; consumed via `npx hyperframes`, workspace materialized under `projects/<name>/hyperframes/`, then `lint → validate → render`. Inherently "atelier": every composition is a hand-authored `index.html` with `data-*` timing attributes and a GSAP timeline. Used for kinetic typography, product promos, SVG character rigs.
3. **FFmpeg** — `_render_via_ffmpeg()` for pure concat/trim/Ken Burns; also subtitle burn-in, encoding, audio mux, LUT color grading.

A fourth path, **`_render_via_atelier()`**, renders a project-local hand-written Remotion entry (`bespoke.entry` + `composition_id` + mandatory `art_direction` note, enforced by `_run_atelier_checks`). Before rendering, `_pre_compose_validation()` checks the delivery promise, slideshow risk, and runtime availability; after rendering, `_run_final_review()` does ffprobe validation, 4-position frame extraction (black frames/broken overlays), audio level analysis, transcript-vs-script comparison, and subtitle presence. "If the review fails, the video is not presented."

## 4. The AI layer

All intelligence is prompt-as-file. Three layers (`skills/INDEX.md`): Layer 1 = tool registry ("what exists"), Layer 2 = `skills/` ("how OpenMontage uses it"), Layer 3 = `.agents/skills/` (vendored vendor knowledge — GSAP, FLUX, Remotion, ElevenLabs, Manim, Three.js, ~47 packs, mirrored into `.claude/skills/`).

The **agent contract** (`AGENT_GUIDE.md`, 713 lines) is the most interesting artifact. Excerpts:

> "**Rule Zero — All Production Goes Through a Pipeline.** ... Do NOT write ad-hoc Python scripts to call tools directly ... The intelligence is in the skills, not in improvised code."

> "**Present Both Composition Runtimes (HARD RULE).** When both Remotion and HyperFrames are available ... silently picking a 'default' is forbidden."

> "**Silent runtime swap is forbidden.** If `render_runtime="hyperframes"` was locked and HyperFrames is unavailable, do NOT route to Remotion instead. Surface the blocker, propose options, get user approval, log a `render_runtime_selection` decision."

> "Still-image fallback is forbidden. Do not quietly convert the job into a Ken Burns teaser, animatic, or slide-based video." (Motion-required rule)

How editing decisions get made: **the LLM writes the EDL directly**, guided by editorial-craft skills. `skills/pipelines/documentary-montage/edit-director.md` (380 lines) encodes genuinely good editing pedagogy: tone→hold-length tables (elegiac 4.0s base / urgent 1.2s), "arrange by narrative beat, not by score," "cut BEFORE the action's natural end. End on a look, not a move-off," leave 4–6-frame handles, downbeat cuts, "one held silence ... Use it once. Use it hard," a four-transition vocabulary with an explicit blacklist ("Do not use: wipes, push/slide, zoom blurs, RGB splits, light leaks, glitch"), adjacent-diversity walks (no two consecutive cuts sharing subject AND scale), and L-cuts ("weld two shots together more tightly than any visual transition").

Anti-sameness machinery: `skills/meta/taste-direction.md` produces a `taste_profile` JSON (design read + 1–10 dials for `visual_variance`/`motion_intensity`/`information_density` + `anti_patterns` like "generic AI-purple gradient backgrounds"); `skills/meta/bespoke-composition.md` governs atelier mode — "**reuse engine knowledge, never creative components**," ban on "hero-component spine" scenes, closing **distinctness review**: "could this be any other product's video?"

Provider choice is quantified in `lib/scoring.py`: each candidate scored 0–1 on task_fit (w=0.30), output_quality (0.20), control (0.15), reliability (0.15), cost_efficiency (0.10), latency (0.05), continuity (0.05); the winner plus all `options_considered` land in an append-only `decision_log` keyed by (category, subject). Budget governance (`tools/cost_tracker.py`) runs estimate → reserve → reconcile with modes observe/warn/cap, default $10 cap and $0.50 per-action approval threshold.

## 5. Asset pipeline

- **Video generation**: 15+ providers behind `video_selector` — Kling (fal.ai + official), Runway Gen-4, Veo 3, Sora, Grok, Higgsfield, MiniMax, HeyGen gateway, plus local GPU (WAN 2.1, Hunyuan, CogVideo, LTX).
- **Stock/archival footage**: 17 adapters in `tools/video/stock_sources/` — Pexels, Pixabay, Archive.org (Prelinger), NASA, ESA, JAXA, NOAA, NARA, Library of Congress, Wikimedia, Coverr, Mixkit, Videvo, Dareful, Pond5-PD, Unsplash.
- **Retrieval-first B-roll** (the standout): `lib/corpus.py` builds a project-local corpus — downloaded clips, 5 thumbnail frames each, `(N, 512)` CLIP visual embeddings + tag embeddings (`.npy`), human-readable `index.jsonl` with full provenance (provider, original_url, license, motion_score). `tools/video/clip_search.py` does fused visual+tag scoring, visual-KNN "more like this," MMR diversification, and a motion-score floor to reject static clips.
- **TTS**: ElevenLabs, Google (700+ voices), OpenAI, Kling, Piper (free/offline), Doubao, DashScope — behind `tts_selector`, with a `voice-performance-director` skill for pacing/pause/emphasis cues.
- **Music**: Suno, ElevenLabs Music, Freesound/Pixabay libraries, and a user drop-folder `music_library/` that the proposal stage must surface ("Music Plan (Mandatory)" in `AGENT_GUIDE.md`).
- **Captions**: WhisperX word-level transcription (`tools/analysis/transcriber.py`), `tools/subtitle/subtitle_gen.py` (SRT/VTT), Remotion `CaptionOverlay` word-by-word/karaoke burn, `remotion_caption_burn.py`.
- **Analysis/QA**: scene_detect, frame_sampler, video_understand (CLIP/BLIP-2), audio_energy, visual_qa, face_tracker, source_media_review (probes user footage so the agent "never hallucinates content from filenames").
- **Enhancement**: Real-ESRGAN upscale, rembg, CodeFormer/GFPGAN, LUT grading; avatar via SadTalker/MuseTalk/Wav2Lip/HeyGen/Kling.

## 6. Scores (1–10)

| Dimension | Score | Rationale |
|---|---|---|
| Timeline model | **7.5** | edit_decisions EDL + scene_plan shot-language is an excellent two-tier IR (intent vs. mechanics) with per-cut `reason`; but it's split across artifacts, has legacy duplication (top-level `music` vs `audio.music`, global `transitions` vs per-cut), no nested tracks/keyframes, and the Remotion `Cut` type is a sprawling optional-prop grab-bag. |
| Rendering | **7** | Three-engine architecture with locked runtime + atelier escape hatch is smart; Remotion component library is competent but templated output is admittedly samey; no GPU compositing, no real NLE-grade effects. |
| AI integration | **9** | The deepest part. Agent-as-orchestrator, director skills with genuine editorial craft, taste dials, decision logs, slideshow-risk and delivery-promise gates. This is state of the art for "LLM as film director." |
| Asset pipeline | **8** | 50+ tools, scored selectors, CLIP-indexed local corpus with license provenance, 17 free/open footage sources. Weak: no asset versioning/dedup across projects, single-shot music sync (no beat-grid extraction tool). |
| Extensibility | **8** | BaseTool auto-discovery, declarative pipelines, add-a-scene-type recipe in SCENE_TYPES.md; but tied to "user runs a coding agent in this repo" — no library/API surface, AGPLv3. |
| Output quality | **6.5** | Governance genuinely blocks the worst slop, and atelier mode can look bespoke; but the ceiling is Remotion templates + stock/genAI clips, word-caption defaults, and taste that depends entirely on the driving LLM. |

## 7. Steal list for Chitra

1. **The two-tier IR: scene_plan (intent) → edit_decisions (mechanics).** This is the single best transferable idea. An AI director should emit *intent* (shot_language, shot_intent, narrative_role, hero_moment) separately from the *executable EDL* (in/out/layer/transition/audio). Validation, critique, and revision all become tractable because "why" is machine-readable. Yes — the EDL shape (flat cuts + overlays + audio + subtitles + locked runtime fields, every cut carrying a `reason`) is a good intermediate representation for an AI director to emit; Chitra should clean it up (true tracks, keyframes, no legacy dupes) rather than reinvent it.
2. **Locked governance fields in the IR** (`renderer_family` / `render_runtime` / `composition_mode` set at proposal, silent swaps = violations) plus the **delivery-promise classifier** (`lib/delivery_promise.py`: promise types with `min_motion_ratio`, where animated slides explicitly do NOT count as motion). This is the anti-slop backbone.
3. **Slideshow-risk scoring** (`lib/slideshow_risk.py`): 6 cheap, deterministic heuristics over the plan (repetition, decorative visuals, purposeless motion, missing shot intent, typography overreliance, unbacked cinematic claims) gating render. Pure Python, no ML — trivially portable.
4. **Editorial craft as versioned prompt files**: the documentary edit-director's tone→hold tables, transition blacklist, adjacent-diversity walk, L-cuts, "one held silence." Ship editing *pedagogy*, not just APIs.
5. **CLIP-indexed local corpus with license provenance** (`lib/corpus.py` — JSONL index + npy embeddings, MMR diversify, motion-score floor). Retrieval-first real footage is the credible alternative to genAI-everything.
6. **Append-only decision log keyed by (category, subject)** + scored provider selection with `options_considered`. Auditability of creative choices is a differentiator.
7. **Templated vs. atelier as an explicit axis**, with the "reuse engine knowledge, never creative components" doctrine and the distinctness review question ("could this be any other product's video?").
8. **Backlot** — a UI derived entirely from files the pipeline already writes (checkpoints, artifacts, decision log), with run replay. Zero coupling between agent and UI.
9. **Synthetic screen recording** (`TerminalScene`/`ScreenshotScene`): scripted, deterministic fake recordings instead of real capture — great for dev-tool demos.
10. **Checkpoint gates enforced in code** (`lib/checkpoint.py` raises GATE VIOLATION if a gated stage completes without `human_approved=True`) — approval is structural, not vibes.

## 8. Weaknesses / anti-patterns to avoid

- **The default output is exactly the slop it polices.** Stock/genAI clips + TTS narration + word-by-word captions + royalty-free bed is the canonical AI-slop formula; OpenMontage's own docs concede the templated scene types "are the reason most videos look alike." Chitra must make the bespoke path the *cheap* default, not a token-expensive escape hatch.
- **Governance-by-prompt is unenforceable.** Hard rules live in markdown ("MUST," "forbidden," "CRITICAL governance violation") and depend on the agent reading and obeying 713 lines of AGENT_GUIDE plus per-stage skills. Only checkpoint gating is enforced in code. Chitra should push invariants into validators/types, not honor-system prose.
- **No programmatic surface.** It only works as "open the repo in a coding agent" — no SDK, no server API, no embedding path. Chitra should be a framework/library first.
- **IR entropy**: duplicate music/transition fields, `Cut` as an 80-field optional-prop union, timing semantics split between timeline (`in_seconds`) and source trim (`source_in_seconds`) that the docs themselves have to disambiguate. Design Chitra's schema once, with tracks and explicit source-vs-timeline time.
- **Music sync is aspirational**: the edit skill says "place hero cuts on downbeats" but there is no beat-detection tool feeding a beat grid into the EDL (only `audio_energy`). Chitra should make beat/onset analysis a first-class timeline input.
- **Massive skill duplication** (`.agents/skills/` fully mirrored in `.claude/skills/`) and repo bloat (demo mp4s, 2k files) — maintenance smell.
- **AGPLv3 + agent-runtime coupling** limits commercial reuse; also means output quality is hostage to whichever IDE model the user runs — no evals of the *director*, only of tools (`tests/eval/` replays tool scenarios, not taste).
- **Per-frame React rendering ceiling**: no motion blur, no optical-flow retime, speed changes are naive; fine for explainers, limiting for genuinely cinematic work.

**How Chitra must differ**: keep the intent+EDL IR, the promise/risk gates, and the editorial-craft-as-data idea, but (a) enforce invariants in the type system, (b) expose an API/SDK, (c) make beat-synced, footage-first, bespoke-look output the default rather than templated slides, and (d) evaluate the director's taste, not just the tools' contracts.
