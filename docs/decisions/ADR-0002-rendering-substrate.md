# ADR-0002: Rendering substrate — own IR, HTML/GSAP backend first, renderer abstracted

**Status:** Accepted · **Date:** 2026-07-14 · **Informed by:** docs/research/{remotion,hyperframes,landscape}.md

## Decision

1. **Chitra's core representation is its own Motion IR** (ADR-0003), not React code, not raw HTML, not a proprietary timeline.
2. **The v0 render backend compiles IR → HTML/CSS/GSAP**, rendered deterministically via headless Chrome (CDP BeginFrame frame-seeking) and encoded with FFmpeg.
3. **The renderer is behind an interface** (`render(ir, range) → frames`), so a WebCodecs/canvas backend can replace or join the Chrome backend without touching anything above it. A Remotion *adapter* (emit TSX for Remotion users) is an optional export target, never a dependency.

## Alternatives considered

- **Build on Remotion.** Rejected. License is fatal for an open ecosystem (source-available; free only ≤3-employee companies; no forks/derivatives — every commercial Chitra user would owe Remotion a license and we couldn't patch our own engine). Its own team is migrating off the Chrome-screenshot substrate (media-parser, webcodecs, unreleased web-renderer). We clean-room its *patterns*: frame-purity, `delayRender`-style async safety, Sequence context arithmetic, chunk-and-seamless-concat distributed rendering.
- **Raw HTML files as the source of truth (HyperFrames' model).** Rejected as the *primary* representation. It's what agents are fluent in, which is why it's our compile *target* — but as source of truth it produces HyperFrames' documented silent-failure classes (duplicate-id blank renders, transform-tween stacking, template-transport corruption) that lint can't catch and 372K words of prose only mitigate. Structure must make those states unrepresentable.
- **WebCodecs/canvas engine first (mediabunny, CanvasKit).** Deferred, not rejected. It's the endgame (everyone is converging there; no browser process; real color pipeline; motion blur becomes possible) — but building it first delays the taste layer, which is the product. The IR boundary keeps this a backend swap.
- **FFmpeg-only compositing (OpenMontage's floor).** Rejected as primary: no typography/layout engine worth the name. Retained for pure assembly ops (concat, audio mix, muxing).

## Why HTML/CSS/GSAP as first target

- Converged agent-native format: HyperFrames and EditFrame arrived at it independently; LLMs are natively fluent in it; CSS layout is the best free typography engine that exists.
- GSAP (fully free since April 2025, including all Club plugins) is the strongest timeline/easing engine ever built for the web — we get world-class easing, staggers, and choreography primitives for zero engineering cost.
- Deterministic rendering on this stack is proven in production by two independent codebases (HyperFrames: Puppeteer BeginFrame; Remotion: same family of techniques).

## Consequences

- We own no browser engine or codec work in v0 — engineering goes into IR, compiler, taste, and critique.
- Known ceiling: no motion blur, limited color management, per-frame screenshot cost. Acceptable for brand/product/social motion design (our v1 domain); the WebCodecs backend lifts it later.
- The compiler must guarantee: stable element IDs, one paused master timeline, no wall-clock time, seeded randomness — render determinism is a compiler obligation, not an agent instruction.
