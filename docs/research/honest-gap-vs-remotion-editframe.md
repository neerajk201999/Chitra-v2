# Honest gap analysis: Chitra vs Remotion, EditFrame, HyperFrames, Replit Video

Written 2026-07-15 after a user gave a 3D-rendered fintech reference and Chitra
could only approximate it. No self-congratulation. What they can do that we
cannot, sorted by whether it is a *fundamental* gap or a *self-imposed* one.

## The rendering model — NOT a gap (explaining "why decide a number of frames")

Every one of these tools renders the same way we do: pick an fps, and for each
frame index N compute/paint the scene at time N/fps and capture it. Remotion:
`useCurrentFrame()` → you compute state → screenshot. Chitra: seek the GSAP
timeline to N/fps → screenshot. Both are frame-accurate and deterministic. We
render at 30fps because that is the delivery standard; it is a choice, not a
limitation, and it matches what they do. This is not where we lose.

## Fundamental gaps (real capability we do not have)

### 1. Real 3D (WebGL / Three.js). CLOSED 2026-07-15 (ADR-0010).
The reference card is a 3D render — true perspective, specular highlights that
travel as it rotates, depth of field, soft shadows. The original Chitra attempt
faked it with CSS `perspective`; ADR-0010 closed that substrate gap.
- **Remotion**: `@remotion/three` embeds a real Three.js canvas, frame-driven.
- **Us**: figures still strip scripts; a separate curated `scene3d` element owns
  vetted Three.js code and is driven only by Chitra's seek clock.
- **Status**: BUILT. `scene3d` element (card/coin/slab primitives), Three.js
  inlined and driven by our seek clock, SwiftShader software-GL for
  cross-hardware determinism. Same-machine byte-identical render verified.
  Cross-machine golden-frame CI remains M5. Remaining 3D work is curated-
  primitive breadth (more shapes, GLTF import), not architecture.

### 2. Audio-reactive / scored motion. PARTLY CLOSED (ADR-0011).
The reference's every hit lands on a beat.
- **Remotion**: `useAudioData` + `visualizeAudio` — read the waveform, drive any
  visual property off audio energy; motion is literally a function of the music.
- **Us today**: `chitra analyze-audio` detects a deterministic beat grid and
  `at.onBeat` snaps choreography to it. MO-AUD-4 rejects missing grids.
- **Remaining gap**: no energy-envelope property tracks, narration timeline,
  clip-audio pass-through, or full multitrack automation.

## Self-imposed gaps (we CHOSE these to prevent slop; can add a gated pro tier)

### 3. Arbitrary keyframes / custom easing curves. PARTLY CLOSED (ADR-0013/0028).
Remotion: `interpolate(frame,[0,15,30],[0,1,.4],{easing:bezier(...)})` — any
property, any curve, per frame. Chitra now exposes reason-gated, typed
frame-addressed X/Y, scale, 3-axis rotation, opacity, perspective, origin, and
token easing. The browser benchmark lands 3/3 authored states and reproduces a
same-frame PNG byte-identically. ADR-0028 separately adds typed mesh, camera,
key/fill-light, and exposure tracks plus card/slab front textures. It remains
intentionally bounded rather than arbitrary JavaScript, properties, or curves.

### 4. Layered/continuous audio (multi-track, ducking, volume automation).
We have one bed + SFX at delays. Remotion/EditFrame have full audio timelines.
Medium effort, no architectural risk. Roadmap, not urgent.

## Not gaps (parity or better)
- Determinism / byte-identical re-render: **we are stronger** (Remotion does not
  promise this; it is our moat).
- Quality gates + critique loop: **nobody else has this at all.**
- HTML/CSS/SVG rendering, fonts, images, video-in-scene, cursor/type/figures,
  particles: parity for 2D motion-graphics work.

## The honest bottom line
For flat/2D motion-graphics launch films, Chitra now has a credible parity
surface and wins on deterministic gates. It also has curated real 3D and
beat-addressed motion. It does **not** yet match Remotion's unrestricted
composition surface: masks/mattes, nested compositions, blend modes, motion
blur, full audio, broad 3D geometry/materials, and a mature player/studio are
open. No
"beats Remotion" claim is valid until ChitraBench publishes neutral,
head-to-head results.
