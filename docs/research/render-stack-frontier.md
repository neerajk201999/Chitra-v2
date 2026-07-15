# Render-stack frontier (July 2026 survey)

Focused check before ADR-0007: is anyone rendering browser-composited video better than screenshot-mode Puppeteer, and how does the market source audio?

## Moving media inside browser compositions
- **HeyGen/HyperFrames**: pre-extract every `<video>` to numbered JPEGs with ffmpeg at target fps, swap per frame during capture. Verdict: browser-native video playback in headless is non-deterministic; extraction is the production answer. **Adopted in ADR-0007.**
- **Replit**: "lie to the browser about time" — virtualized clock + WebCodecs decode (mp4box.js demux, LibAVWebCodecs fallback). Stronger for arbitrary user pages; more moving parts than we need for IR-compiled pages.
- **BeginFrame control** (`--deterministic-mode`, `HeadlessExperimental.beginFrame`): full clock control, Linux-centric, and Chrome ≥120 split `chrome-headless-shell` from the main binary (fully removed in 132) — a real compatibility cliff to plan for in M5's golden-frame CI. Our seek-driven GSAP timeline already gives us the determinism these flags buy others.

## Audio sourcing norms
- Remotion ships `@remotion/sfx` (bundled starter sounds); music is user-supplied files in `public/` or AI-generated (ElevenLabs text-to-music is the pattern in current Claude+Remotion tutorials). Nobody bundles licensed music.
- Chitra's answer (ADR-0007): deterministic ffmpeg-synthesized SFX kit + ambient bed (zero licensing, reproducible), user/AI tracks via the same `music.src` path.

## Standing conclusions
1. Screenshot-mode + frame pre-extraction is the current production-grade ceiling for determinism; WebCodecs in-browser *encode* is the M5 speed play, not a correctness play.
2. The expressiveness frontier (keyframes, masks, nested comps) stays gated behind curated presets — raw escape hatches are how HyperFrames inherits slop.

Sources: [Remotion audio docs](https://www.remotion.dev/docs/using-audio) · [@remotion/sfx](https://www.remotion.dev/docs/audio/sfx) · [Claude+Remotion+ElevenLabs walkthrough](https://adeelhere.com/blog/2026-03-30-ai-landing-page-video-claude-remotion-elevenlabs) · [HeyGen: HTML to video](https://www.heygen.com/research/html-to-video) · [Replit: browsers don't want to be cameras](https://blog.replit.com/browsers-dont-want-to-be-cameras) · [Chrome WebCodecs](https://developer.chrome.com/articles/webcodecs)
