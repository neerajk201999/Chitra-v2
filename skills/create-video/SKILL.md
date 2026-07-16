---
name: create-video
description: Direct and render a cinematic motion-design video from a prompt or any combination of reference videos, images, screenshots, links, brand assets, footage, audio, preferences, and anti-references. Use for launch films, product demos, promos, social clips, motion graphics, reference reconstruction, or end-to-end video creation. Runs intake, direction, storyboard, score, deterministic gates, render, evidence, and bounded critique.
---

# Chitra · Create Video

You are the **director**, not a generator. You produce four artifacts (Intake,
Direction, Storyboard, then Score), let the deterministic core validate and render them,
then **watch the evidence and revise**. Never skip the critique loop.

## Non-negotiables (violations are bugs, not style choices)

1. Every animation uses **preset + tokens**. Raw durations/easings require `override.reason` and must earn it.
2. Every scene and cut carries a real `reason` — if you can't say why a scene exists, cut it.
3. One hero moment per scene (`MO-CHOR-2`). Supporting elements support; they never compete.
4. Copy is shorter than you want. Reading time is gated (`MO-EDIT-1`); cut words, not hold time.
5. `chitra check` must be green before any render you show the user.
6. After rendering: generate evidence, critique it (see step 7), fix, re-render. **Max 3 revision passes**, then present remaining findings honestly.

## Pipeline

### 0 · Locate the toolchain
The Chitra repo provides `core/dist/cli/index.js` (invoke as `chitra` below via `node <repo>/core/dist/cli/index.js`). If `dist` is missing: `cd core && npm install && npx tsc`. Verify with `chitra probe`.

### 1 · Intake → Direction
Inventory what the user actually supplied; a reference is optional and never overrides the user's objective or preferences.

- Prompt only: infer a strong concept from the product, audience, objective, duration, and constraints; ask only for a missing decision that would materially change the film.
- Reference video: run `chitra decompose reference.mp4 -o style-dna.json`, inspect shot evidence, and separate transferable grammar from reference-specific content.
- Images/screenshots/brand assets: copy them into project-local `assets/`, inspect them directly, preserve logos/UI faithfully, and record provenance.
- Links: research them with the host agent; use `chitra snap` or `chitra fetch` only when the visual should enter the film. Never put a URL in Score IR.
- Footage/audio: probe first; transcribe speech when narrative depends on it; analyze audio landmarks before beat-addressed choreography.
- Preferences and anti-references: treat both as hard creative constraints and reflect them in Direction choices, not as a note appended after scoring.
- Rights are operational: `reference-only` and `unknown` sources may inform grammar but their bytes may not enter a render. Only `owned` or `licensed` local/captured sources can back a source-assisted asset; the user remains the authority for that claim.

Write `intake.json` first (ADR-0017; authoritative schema:
`core/src/intake/schema.ts`). Record the objective and single message, intended
deliverable, every source with its creative roles and rights state, preferences
and anti-preferences, brand constraints, assumptions, open questions, and local
evidence links. Inline prompts, project-relative files, and HTTP(S) URLs are
separate origin types. Never invent a hash or claim rights the user did not
state.

Run `chitra intake intake.json -o intake.lock.json`. This fingerprints inline
and project-local bytes, verifies existing hashes, and leaves uncaptured URLs
explicitly unlocked. If a URL matters to the film, capture it with `chitra snap`
or `chitra fetch`, add `capturedPath`, and lock again. Treat `intake.lock.json`
as durable project memory; update it when the user changes direction or inputs.
Resolve questions marked `blocksDirection: true` before planning.

Interrogate only what you cannot safely infer: subject, audience, **register** (`brand-film` | `product-demo` | `social-short`), duration target, brand constraints (colors/fonts/logo), the single message that must land.
Write Direction 0.2 as `direction.json`: stable `id`, logline, narrativeArc
(setup → tension → peak → release), tone, `creativeConcept` (emotional promise,
governing idea, tension, resolution, visual/sound thesis), and 4–8 directed
beats. Preserve the Intake objective and constraint statements verbatim in
`trace`, and copy the requested deliverable before interpreting it creatively.
The trace also cites Intake source/preference/brand/assumption IDs; every beat
cites the sources and preferences that shaped it. Never cite an ID that is not
in the locked Intake. Run `chitra conform intake.lock.json direction.json`;
resolve every P1 before showing the compact Direction to the user for approval.

Style DNA grounds timing, palette, luminance, motion-energy, and audio landmarks. Its semantic slots are deliberately `unmeasured`; annotate typography, camera intent, narrative, and emotion separately with evidence. Style DNA is not proof of an exact match—the comparator is a later release.

### 2 · Direction → Storyboard

Write `storyboard.json` (`storyboardVersion:"0.1.0"`). Turn each directed beat
into one or more shots. Every shot records `directionBeatId`, `reason`, `whyNow`,
shot intent, source/preference IDs, optional hero and element type, composition
(layout/hierarchy/negative space), camera move + reason, typography intent and
approved top-level `onScreenCopy`, color/audio intent, target duration, and
transition intent. The shot `id` becomes the Score scene `id`; order is binding.

This is the design approval boundary. Show the shot list before writing Motion
IR. Run `chitra board storyboard.json` and
`chitra conform direction.json storyboard.json`; fix P1/P2 drift. A reference
can inform camera or rhythm only when the shot cites that reference source.

### 3 · Storyboard → Score (Tier 2)
Write `score.json` (`tier:"score"`). Consult the motion language (`docs/motion/motion-language.md` in the Chitra repo) — cite rules by ID in your reasoning, never restate values.

Style: start from a house style in `styles/` (e.g. `night.json`, `paper.json`) and adapt palette to brand. Keep palettes ≤ 2 chromatic colors + neutrals. Fonts available: Space Grotesk / Instrument Serif / Inter (display), Inter (text).

Element vocabulary: `text` (textRole: display/headline/title/body/caption/kicker), `shape` (rect/line/circle/gradient-field), `image`, `video` (frame-extracted clips), `figure` (sanitized token-themed HTML mockups — start from core/figures-library/), `cursor`, `particles`, `scene3d` (curated card/coin/slab), `stat` (with count-up), `chart-bar`, and ADR-0021 one-level `group` parents for independently transforming sibling children. Particle formations are grid/ring/scatter or ADR-0020 ordered custom `{x,y}` points in the element's 0–100 box; `particle-morph` can target a same-count custom constellation, never arbitrary script.

**Complex UI & interaction (ADR-0008/0024).** Author product mockups as figure fragments (full HTML/CSS, styled ONLY via var(--bg|surface|primary|accent|text|text-dim) and var(--font-display|text|mono); scripts stripped; content clipped to the figure's bounds). Give every meaningful text/control container a kebab-case id: rendered figure text is measured from the real DOM for size, three-instant pixel contrast, safe zones, reading time, and overlap, and ids make findings/choreography addressable as `figureId/innerId`. Token-only CSS is still an authoring rule, not parser-enforced—do not use raw colours/fonts. Stage interactions with `cursor` + `cursor-move` (waypoints) + `cursor-click`, and `type-in` on text for typing moments. Cursor coordinates mean the pointer TIP (aim waypoints at the exact button center). Figure internals reset each scene: re-declare changed states across match cuts (`hide` at scene-start applies from first visibility, so transition overlap cannot ghost — IR-FIG-1 enforces this). Reactions (button responds to click) use `pulse`, never an enter preset (MO-CHOR-5). Attach sounds to motion via `sfx` on the animation (click.wav for cursor-click; kit in core/audio-library/sfx). Sparse by rule: MO-AUD-3.

**Assets from the world (ADR-0006).** When the brief references real material — a product, a site, a logo, photography — acquire it BEFORE writing the score, never by URL inside it:
- `chitra fetch <url> -o assets/name.jpg [--max-width 1600]` — download + normalize an image (strips metadata, logs provenance to `assets/sources.jsonl`).
- `chitra snap <url> -o assets/site.png [--width 1920 --height 1080] [--full-page] [--delay 2500]` — screenshot a live webpage with the vendored Chrome (product-UI scenes, references).
- Video reference? Extract stills: `ffmpeg -ss <sec> -i ref.mp4 -frames:v 1 assets/still.png`. (Downloading the video itself — e.g. yt-dlp — is the user's step; ask them.)
- Reference has a voiceover or narration? Transcribe it with timestamps before writing the direction: `ffmpeg -i ref.mp4 -ar 16000 -ac 1 audio.wav && whisper-cli -m ~/.cache/whisper-cpp/ggml-base.en.bin -f audio.wav -oj` (whisper.cpp via Homebrew; model auto-download documented in ADR-0006). The transcript is CONTEXT for copy and structure, never copy itself: launch-film copy comes from approved brand positioning, with the transcript telling you which product moments matter and where they live in the recording (timestamps → still extraction).
- Screen recordings carry recorder chrome (toolbars, share toasts) and personal data (account emails, balances). Crop them OUT — check every crop before it enters a score.
- Then reference by relative path: `{"type":"image","src":"assets/site.png","fit":"cover","radius":2,"scrim":0.35}`. Asset bytes are content-hashed into the render cache — editing a pixel re-renders exactly the scenes that show it. Obey MO-MED-1..4: scrim or on-media text, never untreated, one slow move max.

**Reconstruction provenance (ADR-0023).** Keep clean-room and source-assisted work visibly separate. A reconstruction Score declares `meta.reconstruction:{mode:"clean-room"|"source-assisted",referenceSourceIds:[...],reason:"..."}`. Every rendered image, video, background, music, or SFX then carries `assetUse:{sourceId,kind:"direct"|"derived",note}`. A figure that loads local media declares each dependency as `assets:[{src:"assets/card.png",assetUse:{...}}]`; undeclared, inline-data, traversal, and project-escaping dependencies fail before render, and nested bytes participate in scene hashes. `direct` means the Score path is the locked Intake path/capture; `derived` is a transformed output and must state the transformation. `chitra creative-check` blocks unplanned sources, unlocked origins, `reference-only`/`unknown` rendered bytes, a clean-room score that uses named reference bytes, or a source-assisted score that uses none. Passing this gate validates declared lineage, not ownership independently.
Preset vocabulary: enters `fade-up · fade-in · scale-settle · slide-in · wipe-reveal · line-reveal · blur-focus`; features `count-up · draw-line`; ambient `drift · scale-drift` (give ambient an `override.durationMs` = scene length, reason "ambient field travels the full scene length"); exits `fade-out · fade-down-out · scale-out`.
Relational timing: `at.after` chains animations (`{"after":"kicker-in","offsetMs":120}`). Stagger ≤ 60ms each (`MO-CHOR-1`).

**Exact reference shots (ADR-0013/0019/0022/0023).** When a measured reference cannot be expressed by a curated preset, use `preset: "keyframe-track"` with typed `keyframes` from `core/src/ir/schema.ts` and an `override.reason`; obey `MO-KEY-1`. Keyframe indices are relative output frames, so a 30fps shot can address frame 273 directly. The track exclusively owns its target and can author X/Y offsets, scale, 3-axis rotation, opacity, perspective, origin, and token easing. After rendering, run `chitra compare reference.mp4 out.mp4 -o comparison.json --evidence comparison-evidence --mode exact`. Exact mode refuses unequal dimensions/FPS/frame counts and compares every frame; MAE 0 and SSIM 1 mean decoded pixels match. To isolate a suspected element without hiding the whole-film result, add repeatable `--region id:x:y:width:height[:startPair:endPair]`; coordinates use the aligned reference canvas and pair bounds are inclusive. Regional metrics and cropped diffs diagnose where error concentrates but never establish exactness by themselves. Use `--mode normalized` only for style/rhythm iteration and never call its sampled result exact. Never improve a clean-room score by silently copying reference pixels—start a separately labelled source-assisted score after rights approval. Masks, local-coordinate/deeper comps, blend modes, motion blur, and internal Three camera/mesh tracks remain unsupported.

Craft rules that separate direction from slop:
- Vary composition scene-to-scene (`MO-EDIT-3` gates it): alternate centered/left-anchored, text/data, bg/surface.
- Choreograph toward each scene's `heroMoment`; give the hero ≥2× the motion amplitude of supports.
- Exits at 75% of entrance duration (`MO-DUR-2`); ensure exit + fade complete **before** scene end.
- Ambient motion in every scene ≥ its register's floor — a static frame is a dead frame (`MO-REG-1`).
- Text over media needs `scrim` ≥ 0.3 or it will fail the per-frame contrast gate (`MO-TYPE-2`).

### 4 · Gate
Run `chitra creative-check intake.lock.json direction.json storyboard.json score.json`
first. It checks all three intent boundaries; structural green is not a claim
that the concept is tasteful. Then `chitra validate score.json` (fast, static) →
fix all P1/P2. Finally `chitra check score.json` (rendered contrast/safe-zone/
overlap/blank gates). Green means 0 P1. Treat P2 as “fix unless you have a
stated reason.” P3s are review notes—read them.

### 5 · Draft render
`chitra render score.json -o out/draft.mp4 -q draft` (fast). Never present a draft as final.

### 6 · Evidence
`chitra evidence score.json -o out/evidence` → contact-sheet.png (3 samples/scene), hero-*.png (full-res per scene), cut-strips.png (every cut boundary pair).

### 7 · Critique — watch, then fix
Open and **look at** the evidence images (contact sheet first, then hero frames, then cut strips). Use the `critique-video` skill's rubric if installed; otherwise judge, per scene, in this order: composition & hierarchy → typography → color/contrast → motion legibility (compare in/mid/out states) → cut continuity (strips: does each cut land on a composed frame?) → the two-altitude slop test ("could you guess this look from the category alone? could you guess its evasion?").
File each finding as: scene id, IR path, severity (P1 blocks, P2 should fix, P3 note), one-line fix. Patch **only the cited IR spans** in score.json — the per-scene cache makes surgical edits cheap. Re-run from step 4. Max 3 passes.

### 8 · Final
`chitra render score.json -o out/final.mp4 -q high`. Deliver: final.mp4, the contact sheet, and a 3-line delivery note (what was directed, what the critique loop caught, any remaining P2/P3s).

## Failure honesty
If a gate stays red, a font/asset is missing, or critique keeps finding the same defect — say so plainly with the finding attached. A degraded render presented as success is the one unforgivable output.
