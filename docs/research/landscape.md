# Chitra Landscape Research: EditFrame, the Programmatic Video State of the Art, Video Quality Evaluation, and Elite Motion Design Principles

*Research date: 2026-07-14. All claims sourced with URLs. Compiled for the Chitra open-source AI-native video creation framework ("Cursor for motion design").*

---

## PART A — EditFrame Deep Dive

### Positioning and history

EditFrame (https://editframe.com/) is a **closed-source, agent-native video creation platform** whose core tagline is *"Video is a web page that moves."* It positions video as declarative HTML + CSS — "the same syntax every model is trained on" — explicitly targeting AI agents (Claude, Cursor, Copilot, Gemini) as first-class authors, with developers second (https://editframe.com/).

The company has pivoted hard. A 2019 founder interview with Steve Lloyd describes EditFrame as a simple consumer video-resizing/music-overlay tool (https://davidandrewwiebe.com/steve-lloyd-of-editframe-shares-how-his-online-video-editing-platform-can-help-you-streamline-your-tasks/). It then became a developer video API (its 2024-era guides on Whisper/FFmpeg subtitling got 84 points on HN — its only meaningful HN presence ever, per Algolia search https://hn.algolia.com/api/v1/search?query=editframe&tags=story). Today it is fully repositioned around agents. Notably, **EditFrame has never had a big Show HN moment** — community traction appears thin relative to Remotion or HyperFrames.

### Product architecture and API design

From the docs (https://editframe.com/docs):

- **Composition = HTML web components (or React)**. Elements include media (`ef-video`, `ef-audio`, `ef-image`), content (`ef-text`, `ef-captions`, `ef-waveform`), and layout (`ef-surface`, `ef-timegroup`). Styling is plain CSS; animation via CSS animations, Anime.js, and SVG SMIL.
- **The time model is the crown jewel** (https://editframe.com/docs/composition/time-model). `ef-timegroup` is the single timing primitive with four modes:
  - `mode="sequence"` — children play one after another; total = sum of children.
  - `mode="fixed"` — children overlap; each has `duration` and optional `offset`.
  - `mode="contain"` — group duration auto-matches its longest child.
  - `mode="fit"` — group inherits parent duration (background music, watermarks).
  - Sequence groups take `overlap="1s"` for transitions, exposing CSS variables (`--ef-transition-duration`, `--ef-transition-out-start`) so plain CSS keyframes can synchronize cross-scene transitions. Durations are CSS time strings (`5s`, `500ms`); `fps` defaults to 30.
- **Three render targets**: browser (WebCodecs), CLI (local), and cloud (parallel encoding + webhooks) (https://editframe.com/docs/rendering/api).
- **Editor toolkit**: composable GUI web components — `ef-timeline`, `ef-preview`, `ef-trim-handles`, `ef-hierarchy`, `ef-workbench`, pan/zoom — so customers can assemble their own editors rather than getting a monolithic one (https://editframe.com/docs).
- **JIT video player** streams compositions in-browser without pre-encoding; **agent skills** ship for Claude Code/Cursor/etc. (https://editframe.com/, https://skills.rest/skill/editframe-api).
- A JS/TS SDK covers render creation, asset upload, and signed playback URLs (https://editframe.com/docs).

### Pricing (https://editframe.com/pricing)

- **Free**: $0 forever, orgs ≤3 employees; client-side SDK, browser (WebCodecs) + CLI rendering, commercial use allowed.
- **Team**: $49/mo (4–10 employees) — same SDK, bigger license.
- **Cloud**: $99/mo + usage (11–20 employees or anyone needing cloud): storage, CDN streaming, parallel cloud rendering. Usage: render minutes at $0.02/min (≤1080p), $0.04/min (2K), $0.07/min (4K); delivery at $0.0009/min.
- **Enterprise**: custom (21+ employees).

The model is essentially Remotion's employee-count license fused with Shotstack's metered cloud — local rendering free, cloud infrastructure monetized.

### What to learn from EditFrame

1. **HTML/CSS as the agent-native format is validated twice** — EditFrame and HeyGen's HyperFrames independently converged on "agents already speak HTML/CSS; don't invent a DSL." EditFrame's marketing explicitly frames this as hallucination-reduction: structured markup over API calls (https://editframe.com/).
2. **The timegroup model solves the real ergonomic problem.** Shotstack-style JSON forces absolute start/length on every clip; EditFrame's `sequence`/`contain`/`fit` semantics make timing relational and content-driven — the same insight json2video markets against Shotstack (https://json2video.com/how-to/shotstack-alternative/).
3. **Editor toolkit as primitives, not product.** Shipping `ef-timeline`/`ef-trim-handles` components means every customer's app can host a human-in-the-loop editing surface. For Chitra, an embeddable review/scrub UI is likely a bigger differentiator than a full editor.
4. **"Data-record renders"** — define the video as a component, pass a different record per render (https://editframe.com/). Template × data is the commercial workhorse use case.
5. **Weaknesses/gaps**: closed source (fatal for agent-ecosystem trust and contributions), no visible design/motion opinion (it renders what you write — nothing pushes output toward *good* motion design), and near-zero community. The whitespace Chitra can own is exactly the layer EditFrame lacks: an opinionated motion-design system plus quality feedback loop, in the open.

---

## PART B — State of the Art

### Code-driven animation frameworks

**Remotion** (https://www.remotion.dev/) — React-based, declarative, frame-as-function-of-state. Ecosystem superpower: any React library (Recharts, D3, shadcn) works inside compositions (https://www.pkgpulse.com/blog/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026). Source-available, **not** OSS: company license required for orgs >3 people, from $25/seat/mo, $100/mo minimum for automation (https://www.remotion.dev/docs/license). In January 2026 it launched **Agent Skills** — rule files teaching Claude Code/Codex/Cursor to write correct Remotion code, including Mediabunny-based media handling (https://www.remotion.dev/docs/ai/skills, https://www.remotion.dev/docs/ai/). Rendering (headless Chrome screenshotting) is its known cost center — HN cites 1–2 full-HD frames/sec (https://news.ycombinator.com/item?id=40646741).

**Motion Canvas** (https://motioncanvas.io/) — the philosophical counterpoint: imperative, generator-based (`yield* title().opacity(1, 0.5)`), canvas-rendered, with a real-time editor. Best-in-class for hand-choreographed explainer animation; truly OSS (https://www.remotion.dev/docs/compare/motion-canvas). **Critical 2026 status: effectively abandoned** — an HN comment (Feb 2026) reports the main site down, with the 2,800-member Discord community mirroring docs at archive.canvascommons.io (https://news.ycombinator.com/item?id=47191103). Its generator time model remains the best ergonomics ever shipped for choreography and is worth studying/borrowing.

**Revideo** (https://re.video/, YC S23) — Motion Canvas fork adding headless rendering, audio, and a parameterized render API; MIT-licensed (https://github.com/midrender/revideo, https://www.ycombinator.com/launches/Kq1-revideo-create-videos-with-code). The Show HN discussion (https://news.ycombinator.com/item?id=40646741) is a goldmine: users wanted "LangChain for video," praised generator syntax, worried about fork sustainability. That worry proved out: **the team pivoted to Midrender**, a commercial visual motion-graphics editor with AI + MCP integration; Revideo's engine "continues to be developed as part of Midrender, though recent changes have not yet been upstreamed" (https://midrender.com/revideo) — i.e., the open repo is now trailing a closed product.

**Diffusion Studio / core** (https://github.com/diffusionstudio/core) — TypeScript, 100%-client-side video compositing engine on **WebCodecs** (hardware-accelerated, no wasm/ffmpeg), Canvas 2D painting, architecture inspired by Pixi.js, built atop **Mediabunny** (https://github.com/diffusionstudio/core/blob/main/README.md). YC F24; partnered with re-skill on an AI editing agent launched at AI Engineering Summit NYC (https://re-skill.io/blog/ai-video-editing-agent-re-skill-diffusion-studio). Key infrastructure lesson: WebCodecs + Mediabunny makes serverless/browser rendering viable — the same stack behind EditFrame's free browser tier.

**Theatre.js** (https://www.theatrejs.com/) — animation *tooling*: a timeline/sequence editor you embed in your own app, driving any JS state (great with React Three Fiber). Apache-2.0, ~12.5k stars-adjacent community but **low bus factor — roughly three active contributors in recent 30-day windows** (https://github.com/theatre-js/theatre, https://dev.to/opensauced/game-development-and-multimedia-theatrejs-unleashing-creativity-in-animation-and-motion-design-gc7). The idea to steal: a GUI timeline that round-trips with code.

**GSAP** (https://gsap.com/) — the gold standard of web tweening/timelines. **As of April 30, 2025, 100% free including all formerly-paid Club plugins (SplitText, MorphSVG, DrawSVG, ScrollTrigger), commercial use included**, after Webflow's acquisition (https://webflow.com/blog/gsap-becomes-free, https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/). Its timeline (nesting, labels, position parameters, stagger, ease library) is the most battle-tested motion API in existence and is already the primary animation adapter in HyperFrames. Chitra should treat GSAP timelines as a first-class animation runtime rather than reinventing easing/sequencing.

**Rive** (https://rive.app/) — designer tool + cross-platform runtime for **state-machine-driven interactive animation**; 2025 data binding lets designers own behavior via View Models while developers bind data, shipping compact `.riv` files (https://rive.app/blog/how-state-machines-work-in-rive, https://rive.app/features). It targets interactive runtime animation, not rendered video — but its designer/developer contract (stable bindings, iterable visuals) is a model for how Chitra's "design system" layer could stay stable while agents iterate on visuals.

**Manim** (https://github.com/ManimCommunity/manim) — Python framework behind 3Blue1Brown-style math animation; precise, code-driven, huge pedagogical corpus, steep learning curve and heavy manual effort (https://docs.manim.community/en/stable/, https://arxiv.org/abs/2507.14306). Now the substrate of the most important agentic-video research (Code2Video, below) — proof that a constrained, deterministic code target enables agent loops.

**MoviePy / raw ffmpeg** (https://pypi.org/project/moviepy/) — v2 rewrite landed with breaking changes; still slow for long renders and memory-hungry; best used as orchestration atop direct ffmpeg for performance paths (https://www.codeline.co/thoughts/repo-review/2025/moviepy-video-editing-with-python, https://github.com/Zulko/moviepy/issues/2231). Fine for cutting/concat/muxing; wrong layer for motion design.

### The anti-patterns: AI slop factories

**ShortGPT** and **MoneyPrinterTurbo** (https://github.com/harry0703/MoneyPrinterTurbo/blob/main/README-en.md) automate keyword → script → stock footage → TTS → burned subtitles → short. Reviews converge on the failure mode: outputs are homogeneous — "the pacing looks similar, the subtitles look similar, the hooks sound similar" — and both are at best "first-draft generators, not finished-video producers" (https://aifruit.app/blog/moneyprinterturbo-alternative, https://www.aithemag.com/guides/make-money-with-ai/moneyprinterturbo-review-2026-the-open-source-ai-video-tool-powering-faceless-channels). Lessons for Chitra: (1) assembly without a design system produces slop regardless of model quality; (2) no feedback loop = no quality floor; (3) template sameness is the death spiral. Chitra must be architecturally incapable of this: opinionated motion language + critique loop, not clip-stitching.

### JSON video APIs and their timeline schemas

- **Shotstack** (https://shotstack.io/) pioneered JSON-to-video: a timeline of tracks containing clips, each with **fixed `start` and `length`** — dynamic-length content forces the caller to precompute all timing (https://github.com/shotstack/json-examples, https://json2video.com/how-to/shotstack-alternative/). From $49/mo for 200 min at 720p.
- **json2video** (https://json2video.com/) counters with content-driven sizing: text elements grow to fit, "a scene lasts as long as the longest element inside it" (https://json2video.com/how-to/shotstack-alternative/) — the same insight as EditFrame's `contain` mode.
- **Creatomate** (https://creatomate.com/developers) has the richest schema: keyframes, responsive scaling, shadows, blend modes, vector shape animation, text animations, warping, 3D, grouping (https://creatomate.com/compare/shotstack-alternative).

Takeaway: JSON timelines are a fine *interchange/serialization* format but a poor authoring format — every vendor eventually reinvents relational timing (sequence/contain/fit) because absolute timing doesn't survive dynamic content. Chitra's intermediate representation should be relational from day one.

### 2025–2026 AI video-agent projects

- **HyperFrames** (https://github.com/heygen-com/hyperframes) — HeyGen's Apache-2.0 framework: "Write HTML. Render video. Built for agents." Plain HTML compositions with `data-start`/`data-duration`/`data-track-index` attributes; deterministic rendering by **seeking each frame in headless Chrome and encoding with FFmpeg**; ~34.9k stars, 296 releases, contributors from tldraw and TanStack. Ships **20 agent skills** (router + 10 creation workflows + 9 domain skills: composition rules, animation, keyframes, creative direction, Figma integration) and animation adapters for GSAP, CSS keyframes, Lottie, Three.js, Anime.js, WAAPI — all made seekable/frame-accurate. Its `frame.md` design system encodes camera-native composition conventions so agents don't guess layout (https://github.com/heygen-com/hyperframes/blob/main/README.md, https://silenceper.com/en/article/2026-05-02-hyperframes-html-video-rendering/).
- **Code2Video** (ICML 2026, showlab/NUS; https://github.com/showlab/Code2Video, https://arxiv.org/abs/2510.01174) — the canonical agentic-video result: **Planner → Coder → Critic** agents generating Manim educational videos. The Critic is a **VLM using visual anchor prompts to refine spatial layout**; the Coder has scope-guided auto-fix. Introduces the **MMMC benchmark** (117 3Blue1Brown-inspired topics) and **TeachQuiz** (does a VLM that "unlearned" a topic recover it by watching the video?). Results: code-centric generation beats pixel-based T2V by ~30% on TeachQuiz; the full pipeline adds ~40%; with Claude Opus 4.1, aesthetics +50%.
- **Kubrick** (https://arxiv.org/pdf/2408.10453) — multimodal agents scripting Blender, with a **VLM-Reviewer agent iteratively critiquing renders** until quality passes: the proposer/critic render loop pattern in its purest form.
- **ViMax** (https://github.com/hkuds/vimax) — "Director, Screenwriter, Producer, Video Generator all-in-one" agentic video generation with an interactive Agent Loop TUI; active through June 2026.
- **VQQA** (https://arxiv.org/html/2603.12310v1) — an *agentic* approach to video evaluation and quality improvement (evaluation as an agent loop, not a single score).
- **fal.ai's open-source AI video editor** (Show HN, Jan 2025: https://news.ycombinator.com/item?id=42806616) — React/Next/Remotion browser editor over fal's model APIs; HN verdict: polished UI but "a thin layer of UI" over proprietary backends, missing real editing fundamentals (scrub, trim, crossfades). Lesson: an "AI video editor" without deep editing primitives gets rejected by exactly the audience Chitra wants.
- **Midrender** (https://midrender.com/revideo, https://www.ycombinator.com/companies/midrender) — visual motion-graphics editor on Revideo's engine, with AI edit understanding and **MCP integration** for agents.
- **Figma Motion** — open beta **June 24, 2026** (https://www.figma.com/blog/introducing-figma-motion/): timeline in the Figma canvas, keyframes for position/scale/rotation/opacity, **an AI agent that generates real keyframes on the timeline while respecting design-system constraints**, motion variables with modes, export to MP4/GIF/SVG/WebM and CSS/JSON/React(motion.dev) code, plus MCP so coding agents can read animated frames. This is the incumbent-scale validation of "AI motion designer" — and a serious gravity well for designer attention.
- Smaller entrants: **HyperMotion** (Figma-style motion tool with semantic keyframes, MCP server, MP4/WebM export; https://github.com/psiddharthdesign/hypermotion), **Motionity** (web motion editor; https://github.com/alyssaxuu/motionity), **Open Design** (agents-in-canvas design engine; https://open-design.ai/alternatives/figma/).

---

## PART C — Automated Video/Design Quality Evaluation

**What exists:**

- **VBench / VBench-2.0** (https://www.emergentmind.com/topics/fvd-and-vbench-metrics) — the standard T2V benchmark: 16 dimensions rolled into quality/semantic/total scores; quality = weighted subject consistency, background consistency, **temporal flickering, motion smoothness, aesthetic quality, dynamic degree**. VBench-2.0 moves to a **multi-agent VLM system** judging human fidelity, controllability, creativity, physics, commonsense.
- **DOVER** — SOTA user-generated VQA, explicitly split into **technical** (artifacts, blur, distortion) and **aesthetic** branches, trained on large human-ranked video data (https://arxiv.org/pdf/2408.11481 — VE-Bench uses it; original: DOVER, ICCV'23).
- **Q-Align** — LMM-based scorer handling image/video quality via discrete-level alignment; usable off-the-shelf for VQA (https://arxiv.org/pdf/2404.16687).
- **LAION Aesthetics Predictor** — an MLP over CLIP embeddings scoring 1–10; cheap frame-level aesthetic signal, widely used as a reward model — but a 2026 FAccT audit documents strong dataset/taste biases, so treat it as a weak prior, not ground truth (https://arxiv.org/abs/2601.09896).
- **VLM-as-judge for video** — now the dominant pattern: VQ-Insight teaches VLMs AIGC video quality across visual quality, temporal consistency, dynamic degree, authenticity (https://arxiv.org/pdf/2506.18564); V2V-Bench scores 11 dimensions with VLM judges (https://arxiv.org/html/2606.05665v1); Code2Video's AES metric has a VLM judge score **element layout, attractiveness, logic flow, visual consistency, accuracy** (https://arxiv.org/pdf/2510.01174); Kubrick's VLM-Reviewer gates regeneration (https://arxiv.org/pdf/2408.10453); VQQA wraps evaluation in an agent loop (https://arxiv.org/html/2603.12310v1).
- **FVD** — distributional realism metric; irrelevant for scoring one rendered motion-graphics video (https://www.emergentmind.com/topics/fvd-and-vbench-metrics).

**What's usable today for Chitra's critique loop:**

1. **Frontier VLM-as-judge with a motion-design rubric** is the only tool that measures *design* quality (hierarchy, spacing, choreography, brand consistency). Feed keyframe grids + short clips; use Code2Video-style visual anchors for layout-precise feedback. This is proven to move quality (Code2Video's +40–50% gains).
2. **Cheap programmatic gates before the VLM**: deterministic renders enable objective checks — rendered-frame diffs, text overflow/safe-area detection, WCAG contrast, optical-flow motion smoothness, cut density, and (weakly) LAION aesthetics/DOVER as sanity floors.
3. **Task-grounded metrics** like TeachQuiz (comprehension after watching) generalize: for a product launch video, "can a VLM extract the value prop and CTA?" is measurable.

**The gap:** every benchmark above targets *camera or diffusion* video. **No public benchmark scores motion-graphics/design quality** (typography, layout, easing quality, choreography). Whoever ships "VBench for motion design" — rubric + anchors + eval harness — defines the category's quality bar.

---

## PART D — Encodable Principles of Apple/Stripe/Linear/CRED-Grade Motion

**Apple** (HIG Motion: https://developer.apple.com/design/human-interface-guidelines/motion; WWDC23 "Animate with springs": https://developer.apple.com/videos/play/wwdc2023/10158/):
- Motion must be purposeful — convey status, feedback, instruction; never gratuitous; honor Reduce Motion.
- **Springs over bezier curves** for anything interactive or physical: springs preserve velocity continuity and "do not assume the interaction is finished" (https://www.userinterface.wiki/to-spring-or-not-to-spring). Apple parameterizes springs by **duration + bounce** (perceptual), not mass/stiffness/damping.
- Ease-out for entrances; ease-in for exits (element accelerating away); springs with slight overshoot for rewarding moments (success states, playful touches) (https://www.userinterface.wiki/to-spring-or-not-to-spring).

**Material Design 3** (https://m3.material.io/styles/motion/easing-and-duration, https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md):
- **Tokenized durations**: 16 steps from 50ms (short1) through 500ms+ (long/extra-long families up to ~1000ms). Small components 150–200ms; larger/mobile transitions 300–400ms; desktop faster (150–200ms) than mobile; tablets ~400–450ms (https://m2.material.io/design/motion/speed.html, https://www.appypie.com/blog/mobile-app-animation-guide).
- **Two easing families**: *standard* for utilitarian moves, *emphasized* (steeper deceleration) for expressive, attention-bearing transitions; asymmetric accel/decel reads as natural (https://m1.material.io/motion/duration-easing.html).
- The perceptual window for UI motion is **200–500ms** (https://www.appypie.com/blog/mobile-app-animation-guide).

**Linear / Emil Kowalski** (design engineer at Linear; https://emilkowal.ski/ui/7-practical-animation-tips, https://animations.dev/learn/animation-theory/the-easing-blueprint):
- **ease-out for everything entering or exiting the screen**; never built-in `ease-in-out` for entrances; **linear only for marquee-style constant motion** (Linear's own site: all movement ease-out with varied delays/durations — https://blog.openreplay.com/advanced-animations-with-css-linear/).
- **Custom cubic-beziers always** — CSS built-ins are "not strong enough."
- **Keep UI animation under 300ms**; 180ms feels more responsive than 400ms.
- **Never scale from 0** — enter from scale(0.9+) for gentle, elegant motion.
- Animate **only transform and opacity** (compositor-friendly).
- His public framework: 43 rules across easing, timing, property selection, transforms, interaction patterns, strategic animation, accessibility (https://lobehub.com/skills/comeonoliver-skillshub-emilkowal-animations).

**Stripe** ("Connect: behind the front-end experience": https://stripe.com/blog/connect-front-end-experience):
- Define **global custom cubic-bezier CSS variables** and reuse them everywhere (one easing vocabulary per brand).
- Animate only cheap, GPU-offloadable properties (transform, opacity) to guarantee 60fps.
- Choreograph sequences with staggered delays sharing one curve family.

**CRED** (https://60fps.design/apps/cred, https://dribbble.com/cred-design):
- Premium feel = **deliberate pacing + consistent choreography as brand**: "smooth easing, well-timed animations, elegant pacing" reinforcing a luxury fintech identity; production pipeline runs After Effects → **Lottie** → app (Airbnb's format); public artifacts include "CRED 2.0 Motion Choreography."

### Distilled, machine-encodable rule set for Chitra

1. **Easing families**: entrances = strong ease-out (e.g. cubic-bezier(0.16, 1, 0.3, 1)); exits = ease-in; on-screen moves = asymmetric ease-in-out; playful/physical = springs (duration+bounce parameterization); linear reserved for loops/marquees/counters.
2. **Duration bands scale with size and distance**: micro-elements 150–250ms; component transitions 250–400ms; full-scene/hero moves 400–700ms; in *video* (non-interactive), stretch bands ~1.5–2× UI values but keep the same curve grammar.
3. **Choreography**: one hero motion per moment; supporting elements stagger 30–80ms behind on the same curve; shared global easing variables per brand; maintain velocity continuity across cuts (spring-like handoffs).
4. **Transforms discipline**: scale from 0.9–0.95 not 0; prefer translate+fade over property soups; opacity+transform only.
5. **Purpose test**: every animation must convey status, relationship, or emphasis — encodable as a critic-rubric question ("what does this motion communicate?").
6. **Tokenize everything** (Material's key insight): durations, easings, staggers as named tokens so an agent composes from a constrained palette instead of free-picking numbers — this is precisely what separates a motion *design system* from slop.

---

## Cross-cutting conclusions for Chitra

1. **Format**: HTML/CSS-with-relational-timing is the converged agent-native authoring layer (EditFrame + HyperFrames); GSAP is the free, canonical animation runtime; WebCodecs/Mediabunny enables free local/browser rendering, headless-Chrome+FFmpeg enables deterministic cloud rendering.
2. **The open-source graveyard is instructive**: Motion Canvas (abandoned), Revideo (absorbed into a closed product), Theatre.js (3 contributors). Sustainability design — governance + a cloud/hosted business that funds the open core — matters as much as architecture.
3. **Nobody owns the quality layer.** EditFrame renders what you write; HyperFrames adds composition conventions (frame.md) but no critic; slop factories prove what happens with neither. Code2Video/Kubrick prove VLM-critic loops work (+40–50%). The combination — **tokenized motion design system + VLM critic with a motion-design rubric + deterministic renders for cheap programmatic gates** — does not exist in open source. That is Chitra's wedge.
