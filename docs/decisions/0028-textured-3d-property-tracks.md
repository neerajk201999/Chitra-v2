# ADR-0028 — Textured 3D products need typed internal tracks

**Status:** shipped · 2026-07-16

## Context

ADR-0010 gives Chitra deterministic curated Three.js card, coin, and slab
primitives, but their mesh, camera, and lights follow one fixed oscillation.
ADR-0013 can animate the canvas layer only. The measured Card Vault residual
still identifies product artwork, travelling light, and internal 3D state as
material gaps, while Remotion and HyperFrames can drive arbitrary Three.js
state. Adding rotation controls without artwork would not address that evidence.

The missing capability is not arbitrary script execution. It is a local,
rights-traced product texture plus a bounded frame track over the internal
subject, camera, two studio lights, and exposure.

## Decision

1. `scene3d` card and slab elements may declare one project-local
   `frontTexture` and optional `frontTextureAssetUse`. Texture bytes participate
   in provenance conformance, render-input hashing, and cache invalidation.
   Coin textures remain unsupported until a concrete target needs cylindrical
   UV authoring.
2. Add a `three-keyframe-track` choreography preset with a separate typed
   `threeKeyframes` field. Tracks begin at frame zero, use increasing integer
   output-frame indices, derive duration from the final frame, and require an
   `override.reason`.
3. Each keyframe may set bounded, nested properties for mesh position,
   rotation, and scale; camera position and field of view; key/fill light
   position and intensity; renderer exposure; and a named Chitra easing for the
   arriving segment. No arbitrary property names, raw curves, callbacks, or
   JavaScript enter the IR.
4. `MO-3D-2` requires a `scene3d` target, one internal track per target, no
   incompatible preset controls, and a final frame inside the scene. A DOM
   `keyframe-track` may independently animate the canvas layer because the two
   tracks own different state spaces.
5. The compiler serializes flattened numeric segments. The browser creates one
   paused GSAP state timeline per 3D subject and seeks it from Chitra's existing
   absolute clock before rendering. Backward and repeated seeks must be exact.
6. A browser benchmark uses generated owned artwork and verifies texture
   readiness, three authored internal states in non-monotonic seek order, and a
   byte-identical repeated frame.

## Consequences

- CRED/Apple-style product turns, camera pushes, and travelling highlights can
  be directed frame by frame without exposing Three.js as an escape hatch.
- Existing `scene3d` scores retain their fixed ambient oscillation and require
  no Motion IR version change; the new fields and preset are additive.
- This closes a measured expressiveness gap but does not prove Card Vault
  fidelity or competitive superiority. A rights-approved target rerun must show
  improvement before either claim.
- Back-face/side textures, GLTF, custom geometry/materials, depth of field,
  motion blur, masks, blend modes, and arbitrary shaders remain separate,
  evidence-gated capabilities.

## Verification

The generated-artwork browser benchmark resolves the project-local texture
before readiness, lands all three authored mesh/camera/light/exposure states in
seek order 30 → 0 → 15, and captures frame 15 byte-identically twice. Texture
bytes invalidate scene hashes. The focused unit suite covers invalid coin
textures and the `MO-3D-2` happy path. This verifies the mechanism only; no
Card Vault or competitor-quality claim follows without a measured rerun.
