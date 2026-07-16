# Remotion — Competitive Reverse-Engineering Report (for Chitra)

**Analyzed:** [remotion-dev/remotion](https://github.com/remotion-dev/remotion)
at commit `ae327ffe05aa4ca47fe20e2a6e440180ceb17ae5` (2026-07-14).
All paths below are repository-relative. ~130 packages, Turborepo + Bun, v5
breaking changes in flight (`packages/core/src/v5-flag.ts`).

---

## 1. Core mental model: video = deterministic function of frame

The entire framework rests on one contract: **a composition is a pure React render of `(frame, props) → DOM`**. Time never advances via wall-clock; it is dependency-injected through React context.

- `packages/core/src/use-current-frame.ts` — `useCurrentFrame()` is ~35 lines: it reads the global timeline position from `TimelineContext` (`packages/core/src/timeline-position-state.ts`) and subtracts the enclosing Sequence's offset (`context.cumulatedFrom + context.relativeFrom`). That subtraction is the whole timeline model: **time-shifting is achieved by nesting contexts, not by a scheduler.**
- `packages/core/src/Composition.tsx` — a `<Composition>` registers `{id, width, height, fps, durationInFrames, defaultProps, schema (zod), calculateMetadata}`. `calculateMetadata` lets duration/dimensions be computed asynchronously from props (e.g. from a video file's length) — this is how data-driven durations work without a timeline editor.
- `packages/core/src/Sequence.tsx` — `<Sequence from={} durationInFrames={}>` clips children in time and re-bases their frame 0. Notable maturity features: `premountFor`/`postmountFor` (mount early with opacity 0 so assets/videos buffer before their cue), `trimBefore`, `freeze`, per-sequence `width/height` overrides, and timeline display metadata (`showInTimeline`, names, stack traces via `packages/core/src/sequence-stack-traces.ts` so the Studio timeline can deep-link to source code). `Series` (`packages/core/src/series/`), `Loop`, `Freeze`, `Still` are thin sugar over Sequence.
- **Determinism plumbing:** `packages/core/src/random.ts` (seeded PRNG — `Math.random()` is banned), `delayRender()`/`continueRender()` (`packages/core/src/delay-render.ts`) which is the async-readiness contract: components take a handle, the renderer will not screenshot until `window.remotion_renderReady === true` and all handles are cleared, with timeouts, retries, and labeled diagnostics. This one small API is what makes "render a React app frame-perfectly" actually reliable — fonts, images (`Img.tsx` auto-delays), data fetches, video seeks all route through it.

Why frame-purity matters: it makes rendering **embarrassingly parallel** (any machine can render frames 80–99 without knowing frames 0–79), makes preview == render, and makes the output reproducible. Every Remotion subsystem (multi-tab concurrency, Lambda chunking, retries) is a dividend of this single design decision. **This is the number-one thing Chitra must copy.**

Timing is modeled exclusively in integer frames at a fixed per-composition `fps`; seconds are always derived (`useVideoConfig()`). There is no variable-fps or time-based model — simple, but it pushes fps-independence onto the user (`spring()` takes `fps` explicitly for this reason).

## 2. Rendering pipeline end-to-end

Flow (native path): **bundle → serve → headless Chrome → seek/settle/screenshot per frame → ffmpeg encode → audio mixdown → mux**.

1. **Bundle:** `packages/bundler` wraps Webpack 5 (an Rspack config also exists, `packages/bundler/src/rspack-config.ts`; esbuild-loader for TS). Produces a static site ("serve URL") that can be served locally or from S3 — the same artifact drives local, SSR, and Lambda rendering.
2. **Browser:** `packages/renderer/src/browser/` is a **vendored, trimmed Puppeteer fork** talking CDP to a pinned Chrome Headless Shell downloaded by `ensure-browser.ts` (own binary management, `--gl=angle` GPU flags, `test-gpu.ts`). No dependency on the user's Chrome — a decade of "works on my machine" lessons.
3. **Frame loop:** `render-frames.ts` opens N pages (default ≈ half the cores, `get-concurrency.ts`) into a tiny work-stealing `Pool` (`packages/renderer/src/pool.ts`, ~30 lines). Per frame: `seek-to-frame.ts:206` calls `window.remotion_setFrame(f)`, `waitForReady` polls `remotion_renderReady` + delayRender handles, then screenshots via CDP (`puppeteer-screenshot.ts`, `screenshot-task.ts`) as JPEG (quality-configurable) or PNG (transparency).
4. **Encode:** when the codec is h264/h265, frames are **piped directly into a pre-spawned ffmpeg** (`prespawn-ffmpeg.ts`, gated by `can-use-parallel-encoding.ts`) so encoding overlaps capture and no image sequence hits disk; otherwise `stitch-frames-to-video.ts` runs afterward. ffmpeg binaries are shipped (`call-ffmpeg.ts`).
5. **Audio:** media components don't play audio in the page; they *register assets* (`packages/core/src/RenderAssetManager.tsx`, `packages/renderer/src/assets/`). Audio is assembled out-of-band with ffmpeg complex filters (`create-ffmpeg-complex-filter.ts`, `merge-audio-track.ts`, `seamless-aac-trim.ts`) then muxed. Volume curves are evaluated per frame in JS and serialized.
6. **OffthreadVideo — the crown jewel:** browser `<video>` seeking is flaky and non-deterministic under headless capture. `<OffthreadVideo>` (`packages/core/src/video/OffthreadVideoForRendering.tsx`) swaps the video element during rendering for an `<Img src="http://localhost:{proxyPort}/proxy?src=...&time=...">` (`offthread-video-source.ts`). That proxy (`packages/renderer/src/offthread-video-server.ts`) is backed by a **native Rust compositor** (`packages/compositor/rust/` — ffmpeg-based frame extraction with `frame_cache.rs`, LRU memory budgeting `max_cache_size.rs`, `tone_map.rs` for HDR→SDR, rotation handling), shipped as 7 prebuilt platform binaries (`packages/compositor-*`). Exact-frame decode of embedded footage, off the browser thread.

**Performance characteristics / bottlenecks:** cost per frame = React commit + layout/paint + CDP screenshot encode + transfer; a full Chromium per worker (hundreds of MB RSS each); screenshotting is the classic bottleneck, mitigated only by tab-level parallelism. No motion blur or supersampling in the pipeline itself (faked in userland via `packages/motion-blur`). This is why a 60s 1080p30 render takes minutes locally and why Lambda exists.

**The non-Chrome escape hatch (their next decade):** `packages/media-parser` (pure-TS container parser: MP4/WebM/AVI/M3U8, seeking hints, keyframe indexes), `packages/webcodecs` (browser-side conversion), `packages/media` ("Experimental WebCodecs-based media tags" — `media-player.ts`, audio iterators; replaces `<OffthreadVideo>` on the web path), and `packages/web-renderer` ("Render videos in the browser (not yet released)") which composites DOM→canvas (`drawing/`, `html-in-canvas.ts`) and encodes via WebCodecs/mediabunny — no server, no Chrome download. They are actively de-risking their own biggest weakness. Chitra should assume browser-native WebCodecs rendering is table stakes by 2027.

## 3. Animation primitives

- **`interpolate()`** (`packages/core/src/interpolate.ts`, 950 lines, lineage credited to React Native's AnimatedInterpolation): multi-stop range mapping, per-segment easing arrays, `extrapolateLeft/Right: 'extend'|'clamp'|'identity'|'wrap'`, `posterize`, and (newer) string interpolation of CSS transforms (`scale/translate/rotate` with units). This is the workhorse — 90% of Remotion animation is `interpolate(frame, [a,b],[c,d])`.
- **`spring()`** (`packages/core/src/spring/index.ts`): damped-oscillator physics, `measureSpring` computes natural duration by simulation, plus `durationInFrames` (time-stretch a spring — physically fake, ergonomically great), `delay`, `reverse`, `from/to`.
- **`Easing`** (`packages/core/src/easing.ts`, 166 lines): the standard RN set (bezier, elastic, bounce, poly, in/out/inOut composition).
- **`@remotion/transitions`** (`packages/transitions/src/`): `<TransitionSeries>` with 18 presentations (fade, wipe, slide, flip, iris, GL-style crosswarp/film-burn/dreamy-zoom...) and pluggable timings (linear, spring). This is the closest thing to a motion-design layer, and it's only scene-to-scene.
- Support satellites: `animation-utils`, `noise`, `paths`, `shapes`, `layout-utils`, `motion-blur`, `effects` (new: `EffectDefinition` piped through `Sequence` props — `packages/core/src/effects/`).

**Limits:** everything is an *instantaneous scalar function*; there is no keyframe/track abstraction, no timeline sequencer object, no choreography DSL (stagger/follow-through/overlap are hand-rolled arithmetic on frame offsets), no cross-property coordination, no serialized animation document an editor or an LLM could manipulate structurally — the program *is* the animation. Expressive for engineers, opaque for tools. This is Chitra's biggest open lane: a motion language above the frame function.

## 4. What's great vs. where it feels like infrastructure

**Worth stealing (10 years of edge cases):** the frame-purity + `delayRender` contract; Sequence-as-context-arithmetic; `calculateMetadata`; OffthreadVideo's proxy-to-native-decoder pattern; parallel encode-while-capturing; seamless-concat trick (§5); vendored browser + shipped ffmpeg (zero-setup reliability); zod-schema'd props enabling the Studio's visual editor and typed parametrization; `premountFor`; seeded randomness; error symbolication from the page back to user source (`symbolicate-stacktrace.ts`); the Player (`packages/player`) sharing 100% of composition code with the renderer.

**Where it's infrastructure, not a creative tool:** open the Studio and you get a blank `<AbsoluteFill>`. No asset/style opinion, no layout intelligence, no typography/color system for video (the `packages/design` package is their *website's* design system), no pacing/rhythm guidance, no audio-reactive scaffolding beyond FFT utils. Taste lives entirely in ~20 `template-*` packages and paid remotion.pro templates. The new **interactivity** direction (`packages/core/src/Interactive.tsx`, `with-interactivity-schema.ts`, Studio `visual-controls/`, skill `packages/skills/skills/remotion-interactivity/`) lets Studio edits write back to code — impressive engineering, still developer-first. Remotion is Rails for video rendering; nobody has built the Figma or the "sensible defaults" layer on top. That gap is Chitra's thesis.

## 5. Distributed rendering (Lambda / serverless)

Architecture generalized in v5 into a provider-agnostic core: `packages/serverless` + `packages/serverless-client`, with AWS (`packages/lambda`, thin: `functions/`, `pricing/`), GCP (`packages/cloudrun`), plus client SDKs in Go/PHP/Python/Ruby (`lambda-go`, `lambda-php`, `lambda-python`, `lambda-ruby`) — evidence the render API is a de facto SaaS protocol.

- **Chunking:** `packages/serverless/src/plan-frame-ranges.ts` splits the frame range into fixed-size chunks; `DEFAULT_FRAMES_PER_LAMBDA = 20` (`packages/lambda-client/src/constants.ts`), capped by `MAX_FUNCTIONS_PER_RENDER` (launch handler `packages/serverless/src/handlers/launch.ts` errors on "Too many functions... diminishing returns").
- **Orchestration:** one *launch* function fans out renderer invocations (each optionally running multiple browser tabs via `concurrencyPerLambda`), streams progress back (`stream-renderer.ts`, `streaming/`, `overall-render-progress.ts` on S3), fires webhooks, detects leaks (`leak-detection.ts`).
- **Stitching — the clever bit:** each worker encodes its chunk to h264/AAC, and `packages/renderer/src/can-concat-seamlessly.ts` allows **bitstream-level concat without re-encoding** when codec is h264 + AAC (with `seamless-aac-trim.ts` handling AAC priming samples). Merge cost is therefore ~I/O-bound (`merge-chunks.ts`, `concat-videos.ts`), so total render time ≈ slowest chunk + concat. Non-h264 codecs fall back to re-encode.
- **Cost model:** first-class — `packages/lambda-client/src/estimate-price.ts` with per-region ARM pricing tables (`price-per-1s.ts`); the CLI prints an estimated dollar cost per render. Trade-off surface: `framesPerLambda` small → more parallel/faster/more overhead+cold starts; large → cheaper/slower. Real-world scale: ~1080p in seconds-to-a-minute for typical short videos, bounded by Lambda's 15-min/10GB limits.

This whole design only works because of frame-purity (§1). Chitra should copy the *shape* (stateless chunk workers + seamless concat + streamed progress + cost estimator) regardless of substrate.

## 6. AI story

Surprisingly far along — Remotion is positioning as the *rendering target for coding agents*:

- **`packages/skills`** — Claude-style agent skills, published for install: `remotion-best-practices` (router skill), `remotion-create`, `remotion-markup` (28 docs: timing, sequencing, transitions, audio-viz, maps, 3D, fonts, measuring text...), `remotion-captions`, `remotion-interactivity`, `remotion-render`, `remotion-saas`, `mediabunny`. Plus **`packages/skills-evals`** — an eval harness with scenarios to regression-test agent output quality. They are treating prompt/skill content as tested product code.
- **`packages/mcp`** — MCP server exposing docs search against a hosted endpoint (`packages/mcp/src/index.ts`, `mcp.remotion.dev`).
- **Docs as agent API:** `packages/docs/docs/ai/` — official system prompt + `llms.txt`, `.md` content negotiation on every docs URL, guides for Bolt/coding agents/dynamic compilation; `AGENTS.md`/`CLAUDE.md` in-repo; `packages/codex-plugin`.
- **Templates:** `template-prompt-to-video` (OpenAI + ElevenLabs story pipeline), `template-prompt-to-motion-graphics`.

But note the ceiling: their AI strategy is "LLMs write Remotion code." There is no structured intermediate representation of a video an agent can safely edit — the agent must round-trip through TSX. Chitra can differentiate with an agent-native scene graph / motion IR with schema'd, diffable edits.

## 7. Licensing (critical)

`LICENSE.md`: **source-available dual license, not OSI open source.** Free only for individuals, companies ≤3 employees, and nonprofits; everyone else needs a paid Company License (remotion.pro, per-developer + render seats). Explicitly: *"It is not allowed to copy or modify Remotion code for the purpose of selling, renting, licensing, relicensing, or sublicensing your own derivate of Remotion."* License changing again in 5.0 (PR #3750 referenced). `packages/licensing` phones usage events home for license accounting.

**Implications for Chitra:** (a) we cannot fork or vendor any of it; (b) if Chitra depends on `remotion`/`@remotion/renderer`, every Chitra user with >3 employees owes Remotion a license — fatal for an open-source framework's adoption funnel and arguably makes Chitra itself a "derivate" sales channel; (c) even optional integrations must keep Remotion in the user's own dependency tree with clear license disclosure. MIT-licensed **mediabunny** (used by their own web-renderer) is not Remotion-encumbered and is fair game.

## 8. Scores (1–10)

| Subsystem | Score | Notes |
|---|---|---|
| Core model (frame-pure React) | 9.5 | Near-perfect abstraction; only weakness is fps-rigidity and React lock-in |
| Renderer | 9 | Vendored browser, Rust decoder, parallel encode; capped by inherent Chrome cost |
| Animation primitives | 6 | interpolate/spring/Easing are solid but low-level; no keyframe/track/choreography layer |
| DX / Studio / CLI | 8.5 | Hot-reload studio, zod props editor, render queue, benchmark cmd, write-back interactivity |
| Distributed rendering | 9 | Chunk + seamless-concat design is best-in-class; multi-cloud abstraction, cost estimator |
| AI-nativeness | 7 | Skills+evals+MCP+llms.txt is ahead of everyone; but code-only representation, no motion IR |
| Taste / design guidance | 3 | Blank canvas; taste outsourced to templates and paid marketplace |
| Licensing / openness | 4 | Source-available, well-run business, but hard friction for OSS builders |

## 9. Steal list & the substrate decision

**Steal (concepts, re-implemented clean-room):**
1. Frame-pure component contract + `delayRender` readiness protocol.
2. Sequence-as-context time arithmetic; premount; `calculateMetadata`.
3. OffthreadVideo pattern: never trust `<video>` seeking; proxy to an exact-frame native/WebCodecs decoder with frame cache + tone mapping.
4. Chunked serverless rendering with seamless h264/AAC bitstream concat + streamed progress + cost estimator.
5. Encode-while-capture ffmpeg piping.
6. Zod-schema'd props → visual controls → write-back-to-code loop.
7. Skills + **skills-evals** + MCP + llms.txt as a tested product surface.
8. Player/renderer code-sharing so preview is pixel-identical to output.

**Build on Remotion vs. build our own renderer — recommendation: do NOT build Chitra on Remotion as a hard dependency; adopt its architecture, target WebCodecs-native rendering, and offer Remotion as an optional adapter.**

Evidence:
- *For building on it:* ~10 years of edge cases (browser pinning, seeking, AAC priming, HDR tone-mapping, error symbolication) that would take 1–2 engineer-years to re-earn; the ecosystem (transitions, captions, player, lambda) is real leverage.
- *Against (decisive):* (1) **License** — a hard dependency taxes every commercial Chitra user and forbids us from modifying the engine (§7); an open-source framework cannot sit on a source-available core it can't patch. (2) **The Chrome substrate is Remotion's own admitted dead end** — they are building `web-renderer`/`media-parser`/`webcodecs`/`media` to escape it; building Chitra on the part of Remotion they're migrating away from buys their past, not their future. (3) Headless-Chrome capture caps cinematic quality (no motion blur, no color pipeline, screenshot bottleneck) and caps AI-nativeness (code-only representation).
- *Path:* Chitra defines its own **motion IR / scene graph** (the layer Remotion lacks) with a compiler to renderers. Renderer #1: WebCodecs + canvas/Skia compositing on MIT foundations (mediabunny, CanvasKit) — the same bet Remotion's web-renderer validates, but Apache/MIT-licensed and agent-editable. Ship a **Remotion export adapter** (generate TSX) for teams already licensed, keeping us interoperable without inheriting the license.

## 10. Weaknesses to exploit

- **Cinematic ceiling:** DOM/CSS rendering, sRGB-ish color, no native motion blur/supersampling, screenshot-per-frame cost; 3D only via three.js/Skia add-ons.
- **Hard for AI agents beyond codegen:** no diffable scene document; timing choreography is scattered arithmetic; an agent can't "move scene 2 earlier" without whole-program reasoning.
- **Blank-canvas problem:** zero taste layer — no typography/layout/pacing defaults; every video starts from nothing.
- **Licensing friction:** blocks OSS ecosystems, forks, and embedding; creates a permanent wedge for a genuinely open alternative.
- **React lock-in & fps-rigidity:** compositions are TSX-only; integer-frame model resists variable frame rate and audio-sample-accurate work.
