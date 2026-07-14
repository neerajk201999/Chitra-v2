# Impeccable — Deep Analysis for the Chitra Quality Engine

Repo analyzed: `scratchpad/repos/impeccable` (Paul Bakaus, Apache 2.0). All paths below are relative to that root.

---

## 1. What it is

**Impeccable is "design guidance for AI coding agents": one agent skill + 23 sub-commands + a deterministic anti-pattern detector + a live browser iteration mode.** It operates on **frontend code and rendered web UIs** (plus native iOS/Android via HIG/M3 reference variants) — HTML, CSS, JSX/Vue/Svelte/Astro source, and live pages via Puppeteer/browser injection.

Distribution (`README.md`):
- `npx impeccable install` — detects harness folders (`.claude`, `.cursor`, `.codex`, `.gemini`, `.github`, `.opencode`, `.pi`, `.qoder`, `.trae`, `.rovodev`, …) and installs the compiled skill payload into each. A single `skill/SKILL.src.md` source is compiled per-provider (build in `scripts/build.js`), with provider-conditional blocks (`<codex>`, `<gemini>`) targeting each model's *specific* known defects.
- Claude Code plugin (`plugin/`, `/plugin marketplace add pbakaus/impeccable`), git submodule, ZIP, or raw copy.
- Standalone CLI: `npx impeccable detect <dir|file|url>` — runs 46 deterministic rules with **no LLM and no API key** (`skill/scripts/detect.mjs`, engines under `scripts/detector/`).
- A **provider-native edit hook** (`skill/reference/hooks.md`, `scripts/hook.mjs`): after any Edit/Write on a UI file, the detector runs and injects findings back into the agent's context as a system reminder. On Cursor it runs `preToolUse` and **blocks bad writes before they land**.
- A Chrome extension (`extension/`) running the same detector on any page.

Invocation: `/impeccable <command> [target]`, e.g. `/impeccable critique landing`, `/impeccable audit blog`, `/impeccable polish settings`. `/impeccable pin audit` creates a standalone `/audit`.

**Setup protocol** (`skill/SKILL.src.md`): every session must (1) run `context.mjs` to load `PRODUCT.md`/`DESIGN.md` project context, (2) load the invoked command's reference file, (3) read actual project code/tokens, (4) load the matching **register** reference (`brand.md` vs `product.md`), (5) load platform reference for native, (6) for greenfield, run `palette.mjs` for a seeded brand color in OKLCH. Context capture is a first-class product feature: `init` writes `PRODUCT.md` (register, users, purpose, personality, **anti-references**) and `DESIGN.md` (google-labs DESIGN.md spec: YAML token frontmatter — colors, typography, rounded, spacing — plus prose). `.impeccable/design.json` extends this with machine-readable tonal ramps per color (see repo's own file for the format).

## 2. Critique methodology — the encoded judgment

### 2.1 The core stance

The skill is written in a design-director voice with zero hedging. From `critique.md`:

> "Be direct. Vague feedback wastes everyone's time. … Give concrete suggestions. Cut 'consider exploring...' entirely. Prioritize ruthlessly. If everything is important, nothing is. Don't soften criticism."

The master test (`SKILL.src.md`, "The AI slop test"):

> "If someone could look at this interface and say 'AI made that' without doubt, it's failed."

And crucially, it runs at **two altitudes** — this is the most sophisticated idea in the repo:

> "**First-order:** if someone could guess the theme + palette from the category alone, it's the first training-data reflex. … **Second-order:** if someone could guess the aesthetic family from category-plus-anti-references ('AI workflow tool that's not SaaS-cream → editorial-typographic', 'fintech that's not navy-and-gold → terminal-native dark mode'), it's the trap one tier deeper. The first reflex was avoided; the second wasn't."

The **register split** changes the test itself. Brand (`brand.md`): "The bar is distinctiveness; a visitor should ask 'how was this made?', not 'which AI made this?' … Restraint without intent now reads as mediocre. … Go big or go home." Product (`product.md`): "Not 'would someone say AI made this.' Familiarity is often a feature here. The test is: would a user fluent in the category's best tools (Linear, Figma, Notion, Raycast, Stripe) sit down and trust this interface, or pause at every subtly-off component? … The bar is earned familiarity. The tool should disappear into the task."

### 2.2 Rule taxonomy

Judgment is encoded at four layers, each individually addressable (every prose rule carries an ID comment like `<!-- rule:skill-ban-gradient-text -->`, verified by `tests/docs-integrity.test.js`):

1. **General rules** (always loaded): contrast math ("Body text must hit ≥4.5:1 … light gray 'for elegance' is the single biggest reason AI designs feel hard to read"), line length 65–75ch, font pairing "on a contrast axis (serif + sans, geometric + humanist)", hero clamp ≤6rem ("Above that the page is shouting, not designing"), tracking floor ≥ −0.04em, `text-wrap: balance`, "Cards are the lazy answer … Nested cards are always wrong", semantic z-index scale ("Never arbitrary values like 999"), and the motion block (§6 below).
2. **Absolute bans** — "Match-and-refuse. If you're about to write any of these, rewrite the element with different structure": side-stripe borders ("Never intentional"), gradient text ("Decorative, never meaningful"), glassmorphism-as-default, "the hero-metric template. Big number, small label, supporting stats, gradient accent. SaaS cliché", identical card grids, eyebrow kickers ("it appears on 55-95% of generations regardless of brief, which is the definition of a tell. One named kicker as a deliberate brand system is voice; an eyebrow on every section is AI grammar"), numbered section markers 01/02/03, text overflow ("The viewport is part of the design").
3. **Register rules + bans + permissions**: brand bans mono-as-costume, all-caps body, timid palettes ("Safe = invisible"), zero imagery on image-implying briefs, editorial-as-default; brand permissions grant ambitious first-load motion and per-section art direction ("Consistency of voice beats consistency of treatment"). Product bans decorative motion, inconsistent component vocabulary ("If the 'save' button looks different in two places, one is wrong"), display fonts in UI, reinvented affordances, "Modal as first thought. Modals are usually laziness."
4. **Provider-specific defect blocks** compiled per harness: Codex's ghost-card (1px border + ≥16px shadow), over-rounding (32px+ cards: "no brand wants 'insanely rounded'"), sketchy SVG ("If you can't render the scene with real assets, ship no illustration"), stripe/grid backgrounds, meta-criticism copy; Gemini's "hard ban" on image hover transforms ("your single most common motion tell").

Anti-monoculture procedure is fully proceduralized in `brand.md`: a mandatory 4-step font selection (write three physical-object brand-voice words → list reflex picks → reject if on list → browse a real foundry catalog → "If the final pick lines up with the original reflex, start over"), a **reflex-reject font ban list** (Fraunces, Playfair, Space Grotesk, Inter, DM Sans, Instrument…, ~22 faces), and a **reflex-reject aesthetic-lane list** (currently "Editorial-typographic … an italic Fraunces headline, lowercase track-spaced metadata, no imagery"), explicitly maintained "on the same cadence" as saturation shifts. Color has a commitment axis — Restrained / Committed / Full palette / Drenched — plus theme-by-"scene sentence": "write one sentence of physical scene: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, it's not concrete enough."

### 2.3 The critique flow (`skill/reference/critique.md`)

The flagship evaluation command; its architecture is the piece to steal wholesale:

- **Two isolated assessments, mandatory sub-agents.** Assessment A = LLM design review ("Think like a design director"). Assessment B = deterministic detector + browser overlay evidence. "They must not see each other's output. … Assessment A must finish before detector findings enter the parent synthesis context. Detector output is deterministic, but it still anchors judgment." Skipping isolation must print `⚠️ DEGRADED: single-context (<reason>)` — "A silent degraded critique is a failed critique."
- **Scoring**: Nielsen's 10 heuristics, each 0–4 with per-heuristic rubric tables, total /40 with rating bands (36–40 ship it … 0–11 redesign); "Be honest with scores. A 4 means genuinely excellent. Most real interfaces score 20-32."
- **Cognitive load**: intrinsic/extraneous/germane framing, an 8-item checklist (chunking ≤4, ≤4 visible options per decision point, working-memory rule from Cowan 2001), and 8 named violations ("The Wall of Options", "The Memory Bridge", "The Visual Noise Floor"…).
- **Personas**: 5 archetypes — Alex (impatient power user), Jordan (confused first-timer), Sam (accessibility-dependent), Riley (deliberate stress tester), Casey (distracted mobile user) — with a selection table per interface type, plus 1–2 project-specific personas synthesized from PRODUCT.md. "Name the exact elements and interactions that fail each persona. Don't write generic persona descriptions; write what broke for them."
- **Severity**: P0 blocking / P1 major / P2 minor / P3 polish. Tiebreak heuristic: "Would a user contact support about this? If yes, it's at least P1."
- **Persistence + trend**: report snapshot written to `.impeccable/critique/<slug>.md` via `critique-storage.mjs` with JSON metadata (score, p0/p1 counts); `trend <slug> 5` prints score history ("24 → 28 → 32 → 29 → 32"). `polish` later reads the snapshot as its backlog — the critique→fix→re-critique loop is closed.
- **Interactive close**: 2–4 targeted questions ("Every question must reference specific findings … Never ask generic 'who is your audience?' questions"), then a prioritized action plan mapping each issue to a command, ending with `polish`.

`audit.md` is the measurable sibling: 5 dimensions (A11y, Performance, Theming, Responsive, Anti-Patterns) each 0–4, /20 total; anti-pattern dimension scored bluntly: "0=AI slop gallery (5+ tells) … 4=No AI tells."

### 2.4 The deterministic detector (`skill/scripts/detector/`)

**46 rules** (`registry/antipatterns.mjs`: 27 `slop` + 19 `quality`; 10 advisory-severity; 5 gated behind `--gpt`/`--gemini`), executed by **four engines** declared per rule: `regex` (source text), `static-html` (jsdom + a real CSS cascade resolver, `engines/static-html/css-cascade.mjs`), `browser` (Puppeteer, computed styles + geometry), `visual` (screenshot pixel-diff contrast check, `engines/visual/screenshot-contrast.mjs`). Sample mechanics: purple detection is hue-window math (`hue >= 260 && hue <= 310` on headings, plus a curated hex list `#7c3aed|#8b5cf6|#667eea…` and Tailwind class regexes); bounce easing catches `animate-bounce`, animation names `/bounce|elastic|wobble|jiggle|spring/`, **and any `cubic-bezier` with y-values outside [0,1]** (overshoot math, not string match); em-dash overuse fires at ≥5; buzzwords are a 30-phrase list ("streamline your", "supercharge your", "enterprise-grade", "seamless experience"…); aphoristic cadence is a regex for "Not a X. A Y." / "X. Just Y." firing at ≥3; cream palette maps OKLCH L 0.84–0.97, C<0.06, hue 40–100. False-positive engineering is serious: safe-tag lists, brand-font domain allowlists (Roboto is fine on google.com), DESIGN.md-aware drift rules (font/color/radius/size "outside DESIGN.md"), config + inline `impeccable-disable` waiver system with reasons, and a large HTML fixture test matrix (`tests/detect-antipatterns-*.test.mjs`).

The **repo eats its own dogfood**: `CLAUDE.md` documents a `validateProse` build step that hard-fails the build on em dashes, "seamless", "robust", "delve", "elevate", "let's dive in", etc., in its own docs.

## 3. Multi-pass structure

- **Passes**: dual isolated assessments (LLM + detector) → synthesis ("Do NOT simply concatenate. Weave the findings together, noting where the LLM review and detector agree, where the detector caught issues the LLM missed, and where detector findings are false positives") → user priority interview → action plan → fix commands → `polish` final pass → re-critique with trend.
- **Personas** as parallel viewpoints inside Assessment A (2–3 selected by surface type).
- **Severity levels** P0–P3 everywhere; heuristics 0–4; dimension scores 0–4.
- **Directional refinement pairs**: `bolder`/`quieter`, `colorize`/`distill` — critique verdicts route to opposing intensity commands. `bolder.md` opens by rejecting the AI notion of bold: "cyan/purple gradients, glassmorphism, neon accents … These are the opposite of bold" and locks changes inside the design system ("A bolder pass should usually change emphasis, proportion, rhythm, density, contrast, copy … while staying inside the documented system"). `quieter.md`: "Quiet design is harder than bold design. Subtlety needs precision. … Think luxury, not laziness."
- **Isolation discipline** repeats in `typeset.md`/`layout.md`: "Isolation is the point: detector output anchors visual judgment toward what the scan can see" — and on fallback, *assessment before scan*, "so the deterministic findings can't anchor the visual judgment." Also: "A clean scan is a floor, not a verdict: a generic font stack at a flat scale passes every detector rule, which is exactly what the assessment exists to catch."

## 4. Named slop patterns (complete list)

**Detector slop rules (27)**: side-tab accent border; border accent on rounded element; overused font (Inter, Roboto, Open Sans, Lato, Montserrat, Fraunces, Geist, Mona Sans, Plus Jakarta Sans, Space Grotesk, Recoleta…); single font for everything; flat type hierarchy (<1.25 ratio); gradient text; AI color palette (purple/violet gradients, cyan-on-dark, neon-on-dark); cream/beige palette ("the default 'tasteful' AI surface, reached for by reflex"); nested cards; monotonous spacing; bounce/elastic easing; dark mode with glowing accents; icon tile stacked above heading ("the universal AI feature-card template"); italic serif display headline; hero eyebrow/pill chip; repeated section kickers; numbered section markers; em-dash overuse; marketing buzzwords; aphoristic cadence; oversized hero headline; crushed letter spacing; plus gated provider tells — hairline border + wide shadow, repeating-gradient stripes, decorative grid-line background, "theater" framing copy, image hover transform.

**Prose-only bans on top**: glassmorphism-as-default; hero-metric template; identical card grids; gray-on-color text; pure-black/gray untinted neutrals; warm-tint-by-default token names (`--paper`, `--cream`, `--linen`, `--parchment` "are tells in themselves"); scroll-fade-rise reveal on every section ("the uniform reflex … one identical entrance applied to every section"); orchestrated page-load choreography in product UI; mono-as-technical-costume; editorial-lane-by-default; emoji-in-UI heuristics (detector has emoji char classes for icon contexts); reflex-rejected fonts and aesthetic lanes; "Not a feature. A platform." copy cadence; forced modals; custom scrollbars/weird form controls.

**Quality rules (19)**: broken/placeholder images, gray-on-color, low contrast (WCAG math incl. large-text px thresholds), layout-property animation, line length, cramped padding, body text at viewport edge, tight leading (<1.3), skipped headings, justified text, tiny text (<12px), all-caps body, wide body tracking, content overflow, clipped positioned children, and four DESIGN.md-drift rules.

## 5. Scores (1–10)

- **Critique quality: 9.** The two-altitude slop test, register split, reflex-reject lists with explicit saturation-maintenance, and anti-anchoring dual-agent isolation are genuinely novel encodings of taste. Language is specific, quotable, and calibrated ("Most real interfaces score 20-32").
- **Coverage: 8.** Type, color, layout, motion, copy, a11y, perf, i18n/hardening, onboarding, interaction states, native platforms. Thin: data-viz, imagery/art-direction quality beyond "ship imagery", sound, and (relevant to us) anything temporal beyond easing/duration.
- **Actionability: 9.** Every finding maps to a fix command; P0–P3; per-finding `ignore-value` commands; score trends; critique snapshots feed `polish`. Closed loop.
- **Engineering: 8.5.** Four-engine detector with real CSS cascade resolution, screenshot contrast diffing, hook integration in 4 harnesses (including pre-write blocking on Cursor), provider-compiled skill builds, rule-ID integrity tests, fixture matrices, benchmark script. Docked half a point for JS/heuristic sprawl (2,700-line `checks.mjs`) and the inherent brittleness of hue-window/hex-list detection.

## 6. Transfer plan: static UI critique → motion/video critique

Impeccable already contains the seed of a motion taste system — `animate.md`'s **100/300/500 duration table** (100–150ms feedback / 200–300ms state / 300–500ms layout / 500–800ms entrance), named easing tokens (`--ease-out-quart/quint/expo` with exact cubic-beziers, bounce/elastic banned as "dated and tacky"), "Exit animations are faster than entrances. Use ~75% of enter duration", stagger caps ("10 items at 50ms each = 500ms total"), the perceived-performance section (80ms instant threshold, peak-end rule, "Ease-in … makes tasks feel shorter because the peak-end effect weights final moments heavily"), motion-materials palette (blur/clip-path/mask as legitimate, layout props banned), and register timing (product 150–250ms, brand earns choreography). The detector's overshoot-bezier math check is directly reusable on animation curves.

**What ports directly to Chitra:**
1. **The architecture, verbatim**: register-aware context (PRODUCT.md analog for a video brief: audience, platform, tone, anti-references), deterministic detector + isolated LLM critique with anti-anchoring, P0–P3 severities, scored rubrics with honest bands, snapshot + trend storage, fix-command routing, and an edit-hook that lints every render/timeline write.
2. **The two-altitude slop test**, re-aimed: first-order = "could you guess this video's look from the category alone" (SaaS explainer → lo-fi music + flat character animation + purple gradient endcard); second-order = the evasion cliché (e.g. "not-corporate → kinetic-typography-on-black").
3. **Rule encoding style**: match-and-refuse absolute bans, reflex-reject lists maintained on saturation cadence, register permissions, per-generator defect blocks (each video model has signature tells exactly as Codex/Gemini do).

**New rule families a video Quality Engine needs (Impeccable has no concept of these):**
- **Timing & pacing over a timeline**: shot/beat duration distributions (the "monotonous spacing" analog is *monotonous cut rhythm* — every shot 2.0s); pacing curves matched to narrative arc; dead air and rushed holds (text on screen shorter than reading time = detectable: word count × WPM vs hold duration); breathing room after information peaks.
- **Easing & physics in time**: velocity/acceleration continuity across cuts and keyframes (jerk detection); uniform-easing tells (everything ease-out-expo is the video version of scroll-fade-rise); spring parameters vs brand register; frame-rate consistency, judder, duplicated/dropped frames.
- **Typography-in-motion**: reading-speed compliance, safe-area and caption placement, tracking/scale during animation (crushed tracking mid-animation), text-over-busy-background contrast *per frame* (the screenshot-contrast engine generalizes to sampled frames), subtitle style drift between scenes.
- **Composition-over-time**: continuity of eye-trace (where attention lands at cut N vs where action starts at N+1); 180°-rule and axis breaks; center-of-mass jumps; headroom/lead-room; identical-template shot grammar (the "identical card grid" analog: every scene = centered title + icon burst).
- **Temporal consistency**: palette/LUT drift between shots; character/object identity drift (the AI-video tell #1); lighting direction flips; token drift vs a "DESIGN.md for motion" — a motion spec declaring duration scale, easing tokens, transition vocabulary, type ramp, palette — with drift rules exactly like `design-system-color/font/radius`.
- **Audio-visual sync** (no Impeccable analog at all): cuts on/off beat, mix levels, music-emotion vs scene-emotion mismatch, sting-and-swoosh overuse (the bounce-easing of audio).
- **AI-video slop registry (v1 candidates)**: morphing hands/faces, texture shimmer/boiling, floaty physics, uniform slow-motion drift shots, crossfade-as-only-transition, lens-flare/particle abuse, "epic orchestral swell" default scoring, letterbox-for-no-reason, gratuitous drone-orbit establishing shots, subtitle emoji abuse, endcard hero-metric templates.
- **Register split for video**: brand film / title sequence (choreography earns its place, distinctiveness bar) vs product demo / tutorial (state-conveying motion, 150–250ms UI transitions inside the recording, "the cut should disappear into the task") vs social short (platform grammar, hook-in-2s).
- **Persona viewing passes**: sound-off viewer (captions carry it?), 2x-speed viewer, mid-scroll viewer (first 1.5s hook), accessibility viewer (flash/strobe limits — WCAG 2.3.1 three-flashes rule is the video P0 analog, plus `prefers-reduced-motion` equivalents), retention-curve stress tester.
- **Detector engines**: regex/static → parse timeline/scene-graph source (Chitra compositions, Remotion-style code, AE JSON); browser → headless render sampling; visual → per-frame + optical-flow analysis; plus an audio engine.

## 7. Weaknesses / gaps

1. **No temporal model** — timing rules are single-transition; nothing evaluates sequences, rhythm, or sync (our whitespace).
2. **Trend-chasing treadmill**: ban lists ("cream is the saturated AI default of 2026") encode a snapshot of saturation and require constant curation; there's no data pipeline for measuring saturation, just editorial judgment.
3. **Heuristic brittleness**: hue windows and hex lists will both false-positive (legit purple brands) and miss (novel palettes); mitigated but not solved by the waiver system.
4. **Prompt-compliance risk**: the elaborate sub-agent isolation and degraded-banner protocol depends on the model following instructions; nothing enforces it mechanically.
5. **LLM-only aesthetic judgment is unscored ground truth**: no eval harness comparing critique output to human design-director judgments; tests cover the detector, not the taste.
6. **Web-centric**: native references exist but detector, hook, and live mode are HTML/CSS-only.
7. **Scoring rubrics (Nielsen /40) skew product-usability**; brand-surface "distinctiveness" has tests but no numeric rubric, so trend tracking is weaker exactly where the taste bar is highest.
8. **Single-author taste**: opinionated is the point, but there's no mechanism for a team to encode *their* divergent taste beyond PRODUCT.md anti-references and ignore lists.

### Key files
- `skill/SKILL.src.md` — master prompt, rules, bans, slop tests, routing
- `skill/reference/critique.md` — dual-assessment protocol, heuristics rubric, cognitive load, personas
- `skill/reference/{brand,product}.md` — registers; reflex-reject lists
- `skill/reference/{animate,typeset,layout,bolder,quieter,polish,audit,interaction-design}.md` — domain judgment
- `skill/scripts/detector/registry/antipatterns.mjs` — the 46-rule registry
- `skill/scripts/detector/rules/checks.mjs` + `engines/` — detection math
- `skill/scripts/{critique-storage,context,context-signals,hook,palette}.mjs` — persistence, context, hook, palette seed
- `PRODUCT.md`, `.impeccable/design.json` — live examples of the context format
