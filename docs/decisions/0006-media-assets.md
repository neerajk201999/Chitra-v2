# ADR-0006 — Media assets: local-first references, deterministic by content hash

**Status:** accepted · 2026-07-15

## Context

Scores need real-world material — product screenshots, brand marks, photography, stills from reference video. The IR already has an `image` element (src, fit, scrim, radius) and the compiler renders it, but three gaps make it unusable in production: asset bytes don't participate in scene hashes (stale-cache hazard), there is no sanctioned way to acquire/normalize assets from the internet, and nothing gates text legibility over media.

## Decision

1. **Local-first, always.** A score references assets only by project-relative path. Nothing in the render path touches the network — `src: "https://…"` is a schema error. This preserves ADR-0002's determinism: a repo checkout renders identically forever, offline.
2. **Acquisition is a separate, explicit step** owned by the agent, via two CLI commands:
   - `chitra fetch <url> -o assets/x.jpg [--width N]` — download, normalize (strip metadata, optional resize via ffmpeg, already a hard dependency), report dimensions + sha256.
   - `chitra snap <url> -o assets/site.png [--width/--height/--full-page]` — webpage screenshot via the already-vendored puppeteer Chrome (this is our "playwright"; ffmpeg is our "pillow"; no new dependencies).
   - Video references: extract stills with `ffmpeg -ss <t> -i ref.mp4 -frames:v 1`. Video-*in*-scene stays out of scope (known-issues #5); tools like yt-dlp remain the user's own acquisition step, documented, never invoked by us.
3. **Asset bytes are part of the scene hash.** `sceneHash` digests the content of every asset referenced by the scene and its neighbors. Editing a pixel re-renders exactly the affected scenes; the auto-pruner reclaims the old frames.
4. **Legibility is gated.** New MO-MED rules (motion-language §media); statically enforced: text positioned over a media rect with `scrim < 0.3` and color ≠ `on-media` is a P2.

## Consequences

- Agents can pull real references/assets from the internet in one command each, but a committed repo stays hermetic.
- Missing asset files fail loudly at hash time (P1), not silently as broken-image frames.
- Sets up M5 brand ingestion (logo + palette extraction) on the same local-first path.
