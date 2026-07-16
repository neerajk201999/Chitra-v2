# video-use (browser-use) — Competitive Research for Chitra

Repo analyzed: [browser-use/video-use](https://github.com/browser-use/video-use).
33 files, ~5,600 lines total at the inspected revision. Python 3.10+,
MIT-style license, single-maintainer commits visible in the shallow clone.

## 1. What it actually is (correcting expectations)

Despite the browser-use pedigree, **video-use contains zero browser automation and zero screen recording**. It is a **conversation-driven video *editor* packaged as an agent skill** (Claude Code / Codex / any shell agent). The user drops raw footage (talking-head takes, interviews, montages) into a folder, opens their agent there, and says "edit these into a launch video." The agent — steered entirely by `SKILL.md` — transcribes, reasons over text, emits an edit decision list (EDL), renders with ffmpeg, and **self-evaluates the rendered output visually before showing the user**.

There is no application code in the traditional sense. The product is:

- **`SKILL.md` (322 lines)** — the "program" is a prompt: principles, 12 hard rules, process, sub-agent briefs, craft guidance.
- **6 Python helpers (~1,900 lines)** — deterministic tools the LLM calls: `transcribe.py`, `transcribe_batch.py`, `pack_transcripts.py`, `timeline_view.py`, `render.py`, `grade.py`.
- **A vendored second skill, `skills/manim-video/`** (~2,600 lines of markdown) — a full production pipeline for 3Blue1Brown-style generated animations, used for overlay slots.

This is a striking architectural bet: *the orchestrator is a markdown file interpreted by a coding agent; only the leaf operations are code.*

### End-to-end pipeline

```
Transcribe ──> Pack ──> LLM Reasons ──> EDL ──> Render ──> Self-Eval
                                                              │
                                                              └─ issue? fix + re-render (max 3)
```

1. **Inventory** — `ffprobe` every source; `transcribe_batch.py` (4-thread parallel ElevenLabs Scribe calls, cached per source) → `edit/transcripts/*.json`.
2. **Pack** — `pack_transcripts.py` collapses word-level JSON into `takes_packed.md`: phrase lines with `[start-end]` prefixes, broken on silences ≥ 0.5s or speaker change. ~12KB for an hour of takes.
3. **Converse + propose strategy** — the agent describes the material, asks material-shaped questions, proposes a 4–8 sentence plan, and **must wait for user confirmation** (Hard Rule 11).
4. **Edit** — an *editor sub-agent* reads `takes_packed.md` against a structural archetype (HOOK → PROBLEM → SOLUTION → …) and returns a JSON EDL of `{source, start, end, beat, quote, reason}` ranges. Ambiguities resolved by on-demand `timeline_view.py` PNGs.
5. **Animations** — N parallel sub-agents, one per overlay slot, each choosing an engine (HyperFrames / Remotion / Manim / PIL+ffmpeg) and rendering to `edit/animations/slot_<id>/render.mp4`.
6. **Render** — `render.py`: per-segment extract (grade + 30ms audio fades baked in) → lossless `-c copy` concat → one compositing pass (PTS-shifted overlays, subtitles applied LAST) → two-pass `loudnorm` to -14 LUFS.
7. **Self-eval** — the agent runs `timeline_view.py` **on the rendered output** at every cut boundary (±1.5s), reads the PNGs with its own vision, checks a defect rubric, fixes and re-renders, capped at 3 passes.
8. **Persist** — appends strategy/decisions/reasoning to `edit/project.md` for cross-session memory.

## 2. Architecture, models, prompts

### Models / services
- **ElevenLabs Scribe (`scribe_v1`)** — the only external AI API in code (`helpers/transcribe.py:30,58-87`): word-level timestamps, diarization, audio-event tagging (`(laughter)`, `(applause)`), verbatim (fillers preserved as editorial signal).
- **The host agent's LLM** (Claude, etc.) does all reasoning and all *vision* — reading `timeline_view` PNGs. No VLM is called programmatically; the agent harness *is* the VLM loop.
- Optional per-slot: Manim, Remotion, HyperFrames, PIL; optional TTS (ElevenLabs / manim-voiceover) inside the manim skill.

### The core representational idea (the headline insight)

From `README.md:73-92`:

> "The LLM never watches the video. It **reads** it… Naive approach: 30,000 frames × 1,500 tokens = **45M tokens of noise**. Video Use: **12KB text + a handful of PNGs**. Same idea as browser-use giving an LLM a structured DOM instead of a screenshot — but for video."

Two layers:
- **Layer 1 — packed transcript (always loaded).** `pack_transcripts.py:38-122` groups Scribe words into phrases on ≥0.5s silence or speaker change; output lines like `[002.52-005.36] S0 Ninety percent of what a web agent does is completely wasted.` This alone gives word-boundary cutting precision from text.
- **Layer 2 — visual composite (on demand).** `timeline_view.py` renders, for any `[start,end]`: a filmstrip of N evenly spaced frames + an RMS waveform ribbon + word labels + shaded silence bands + a time ruler, as one PNG. Explicitly documented as "an on-demand drill-down, not a background index" (`timeline_view.py:9-11`).

### Prompt engineering (SKILL.md is the prompt)

Key excerpts worth quoting:

- Hard rules framing (`SKILL.md:18-20`): *"These are the things where deviation produces silent failures or broken output. They are not taste, they are correctness. Memorize them."* — 12 rules covering filter-chain ordering, concat strategy, fades, PTS shifting, SRT offset math, word-boundary snapping, padding, caching, parallelism, confirmation gating, and output hygiene.
- Taste vs. correctness separation (`SKILL.md:14`): *"Every specific value, preset, font, color, duration… is a worked example from one proven video — not a mandate… The only things you MUST do are in the Hard Rules section."*
- The **editor sub-agent brief** (`SKILL.md:127-160`) is a reusable prompt template: inputs (packed transcript, 2-sentence context, speaker note, archetype, slip list, runtime budget), rules (word boundaries, 30–200ms padding, ≥400ms silences preferred), and a strict JSON-only output contract with `reason` fields and a self-correction clause: *"If over budget, revise: drop a beat or trim tails. Report total and self-correct."*
- The **animation sub-agent brief** (`SKILL.md:249-262`) is a 10-point checklist for parallel isolated workers, ending with: *"Do not ask questions. If anything is ambiguous, pick the most obvious interpretation and proceed."*
- An explicit **anti-patterns list** (`SKILL.md:306-322`) documenting failed approaches (see §6).

### Render engineering (helpers/render.py, 659 lines)

Genuinely production-grade ffmpeg craft:
- HDR→SDR tonemap chain auto-prepended when `ffprobe` detects PQ/HLG transfer (`render.py:95-131`) — with a comment explaining exactly *why* iPhone HLG footage looks blown out after naive bit-depth conversion.
- Quality ladder (draft 720p ultrafast / preview 1080p medium / final 1080p CRF 20), portrait detection, 30ms afades computed per segment, lossless concat, overlay `setpts=PTS-STARTPTS+T/TB` shifting, subtitles rendered last with libass `force_style`.
- The `MarginV=90` subtitle margin carries a comment worth stealing verbatim (`render.py:42-50`): *"MarginV is NOT taste — it is a platform safe-zone rule. TikTok / IG Reels / Shorts UI… covers roughly the bottom ~25–30% of a 1080×1920 frame."*
- Two-pass `loudnorm` to -14 LUFS / -1 dBTP (`render.py:387-490`) — social-platform loudness targets, with a 1-pass fallback.

### Auto color grade (helpers/grade.py)

`auto_grade_for_clip` (`grade.py:178-271`) samples frames via ffmpeg `signalstats`, normalizes by native bit depth, computes luma mean/range and saturation, and emits a *bounded* `eq=` correction — every axis clamped to ±8%, "make it look clean without looking graded." Creative looks (`warm_cinematic` teal/orange) are explicit opt-in presets. This is a nice pattern: deterministic math for correction, LLM judgment only for creative direction.

## 3. Techniques inventory (for Chitra)

**Video understanding**
- Transcript-as-DOM: audio-first indexing; word timestamps are the addressing scheme for all edits.
- Sparse, purposeful frame sampling: N evenly spaced frames only within a queried window; frames composited *with* waveform + word labels into a single dense PNG so one image answers "what is happening audio-visually at this cut."
- Silence-gap detection from Scribe `spacing` entries as cut-candidate generation (`pack_transcripts.py:89-99`, `timeline_view.py:135-148`); heuristic taxonomy: ≥400ms clean, 150–400ms needs visual check, <150ms unsafe.

**Agent-made editing decisions**
- EDL as the contract between reasoning and rendering — JSON with `beat`, `quote`, and `reason` per range (explainable edits, replayable renders).
- Structural archetypes as pitch scaffolds (launch, tutorial, interview, travel, documentary, music).
- Pre-scan for verbal slips fed into the editor brief as an avoid-list.

**Narration/voiceover sync**
- Payoff-word timing (`SKILL.md:224`): fetch the payoff word's timestamp; start the overlay `reveal_duration` earlier so the landing frame coincides with the spoken word.
- The manim skill recommends `manim-voiceover` with `<bookmark mark="x"/>` tags and `tracker.time_until_bookmark()` for word-level animation sync (`references/rendering.md:134-185`), and states the "see then hear" principle: visuals should land slightly *before* the narration names them (`references/animation-design-thinking.md:90-94`).

**Self-evaluation (the visual feedback loop)**
- `SKILL.md:91-99`: run `timeline_view` on the **rendered output** at every cut boundary and check: visual discontinuity/flash, waveform spike (audio pop that slipped past the fade), subtitle hidden behind overlay, overlay showing wrong frames. Plus sampled spot-checks (first 2s, last 2s, 2–3 midpoints) for grade consistency and readability, and an `ffprobe` duration-vs-EDL assertion. Fix → re-render → re-eval, **hard cap 3 passes**, then escalate to the user instead of looping.
- The manim skill has the offline analog: pre-code / pre-render / post-render checklists (`references/production-quality.md`), preview stills for text kerning, "watch at 1× — does it feel rushed anywhere?"

**Screen capture / demo ingestion**
- Absent. The nearest thing is HyperFrames ("website-to-video or mockup-to-video captures", `SKILL.md:205`) — an external HeyGen tool for deterministic HTML/CSS/GSAP frame capture used as an *animation source*, not an ingestion path.

## 4. Engineering quality assessment

The helpers are clean, dependency-light (requests/numpy/PIL; librosa is declared in `pyproject.toml` but deliberately avoided at runtime — `timeline_view.py:89` reads WAVs manually "avoid librosa as a hard dep"), well-commented with *reasoned* comments (HDR, MarginV, bit-depth normalization). No tests, no CI, no type checking config, one `--edl` flag stubbed "not yet implemented" (`timeline_view.py:351-356`), and minor cruft (unused `matplotlib`/`librosa` deps, `poster.html` marketing page in repo root). The markdown "code" (SKILL.md) is exceptionally disciplined — the hard-rules/worked-example split is the best prompt-spec structure I've seen in an OSS agent skill.

**Scores (1–10):**

| Axis | Score | Notes |
|---|---|---|
| Architecture | 8.5 | Skill-as-program + deterministic leaf tools + sub-agent fan-out is elegant and genuinely novel; docked for no tests/CI and agent-harness lock-in |
| AI integration | 9 | Token-economy representation, confirm-gated agency, self-eval loop, explainable EDL — state of the art for agentic editing |
| Output quality (plumbing) | 8 | HDR tonemap, loudnorm, fade/PTS/subtitle-ordering correctness encode real broadcast craft; unverifiable end-to-end without footage |
| Reusability of ideas for Chitra | 9 | Nearly every pattern transfers; almost no code needs to be taken wholesale (helpers are small enough to reimplement) |

## 5. Steal list for Chitra

1. **The self-eval loop, upgraded (a).** The single most transferable pattern: *render → generate a machine-readable composite view of the output → have the model critique it against an explicit defect rubric → bounded fix loop (≤3) → escalate.* Chitra should generalize `timeline_view` into a "render inspector": filmstrip + waveform + caption-track + cut markers in one PNG per checkpoint, checked against a named-defect checklist rather than "does this look good?". The boundedness and the escalate-to-human fallback are as important as the loop itself.
2. **Composite evidence images over raw frames.** One PNG carrying frames + waveform + word labels + silence shading answers multimodal questions a bare frame can't. For Chitra's VLM critic, always co-render the audio/timing context into the image the model sees.
3. **Transcript-as-DOM addressing.** Word-level timestamps as the universal coordinate system for edits; phrase-packing (silence ≥0.5s / speaker change) as the token-efficient reading view (~10× smaller than raw ASR JSON). Directly applicable to Chitra's ingestion of any speech-bearing source — including product demos and screen recordings (b): a demo walkthrough's narration transcript + sparse keyframes is exactly this representation.
4. **EDL as the reasoning/rendering contract** — with `beat`, `quote`, `reason` per range. Explainable, diffable, re-renderable, and testable independently of the LLM.
5. **Hard rules vs. worked examples** prompt structure: 12 correctness invariants ("not taste, correctness — memorize them") separated from style examples explicitly labeled non-mandates. Chitra's generation skills should adopt this split verbatim.
6. **Parallel sub-agent fan-out with self-contained briefs** for per-asset generation (one slot = one agent = one output file; "do not ask questions" clause; deliverable checklist including ffprobe self-verification).
7. **Payoff-word sync + bookmark-based narration sync** (`manim-voiceover` bookmarks; overlay landing frame timed to the spoken payoff word). This is the cheapest path to "professional-feeling" AI video.
8. **Deterministic bounded auto-correction** (grade.py): signalstats math with ±8% clamps for cleanup; LLM only for creative intent. Split correction from creativity everywhere in Chitra.
9. **Production-correctness plumbing to copy directly**: subtitles-last filter ordering, per-segment extract + lossless concat, 30ms afades, `setpts` overlay shifting, output-timeline SRT offset math, HDR→SDR tonemap detection, two-pass -14 LUFS loudnorm, platform caption safe-zones (MarginV=90 rationale).
10. **Session memory (`project.md`) + immutable caching** (never re-transcribe unchanged sources) — cheap, high-leverage UX.
11. **Evaluation approaches (c)**: `helpers/grade.py --analyze` style introspection commands on every tool; duration-vs-EDL ffprobe assertions; the manim skill's pre/post-render checklists as a static-analysis layer before the visual critic runs.

## 6. Weaknesses / dead-ends to avoid

- **Their own documented dead-ends** (`SKILL.md:306-322`) — free lessons: hierarchical pre-computed shot/tone codecs ("over-engineering — derive from the transcript at decision time"), hand-tuned moment-scoring heuristics ("the LLM picks better than any heuristic you'll write"), phrase-level/normalized ASR (loses gap data and filler signal), local CPU Whisper, single-pass filtergraphs with overlays, linear easing, sequential sub-agents.
- **Audio-first blindness.** The whole representation assumes speech. B-roll, music-driven montages, and *silent screen recordings* — a core Chitra content source — have no addressing scheme here. Chitra needs a visual-event index (scene changes, UI events, motion energy) as a peer to the transcript, not a fallback.
- **No programmatic pipeline.** Everything routes through an interactive agent harness; there is no library API, no headless mode, no way to run the pipeline in CI. Chitra should keep the skill-layer ergonomics but expose the pipeline as a real Python API first.
- **Zero tests / no golden outputs.** For a tool whose value is "correctness rules," nothing verifies the rules mechanically. Chitra should encode invariants (subtitle ordering, fade presence, duration match) as automated render checks, not prose.
- **Self-eval is spot-check-only and unmeasured.** Cut boundaries + a few midpoints; no full-timeline scan, no scoring, no regression tracking of critic accuracy. Fine for v1; Chitra should treat the visual critic as an evaluable component with its own labeled defect set.
- **Single-vendor ASR coupling** (ElevenLabs Scribe, hardcoded URL/model) with no abstraction seam.
- **Vendored skill drift risk**: `skills/manim-video/` duplicates conventions (fonts, palettes) that can diverge from the parent skill; keep shared style contracts in one place.
- **Misc**: unused declared deps (librosa, matplotlib), stubbed `--edl` timeline mode, marketing HTML in the repo root — signs the repo optimizes for demo velocity over maintenance.
