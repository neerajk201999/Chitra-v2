# Score and asset authoring

Load this file only after Direction, Storyboard, and production approach are
coherent.

## Build order

1. Acquire/create the assets on which the concept depends.
2. Author the hero scene only.
3. Run `chitra creative-check`, `chitra validate`, and sparse `chitra evidence`.
4. Inspect the hero at full size. Fix composition, type, palette, material/light,
   and brand fidelity before adding other scenes.
5. Complete causal transitions and supporting shots.
6. Run full checks, then sampled motion preview.

Do not dump `core/src/ir/schema.ts` into context. Copy the closest element from
`examples/` or a focused benchmark and let validator paths guide corrections.

## Native vocabulary

- text, shape, image, frame-extracted video;
- sanitized HTML `figure` UI with addressable inner IDs;
- cursor movement/click and type-in interaction;
- stat/chart primitives;
- particles with typed formations/custom points;
- curated card/coin/slab `scene3d` with bounded mesh/camera/light tracks;
- one-level transform groups;
- music bed, sparse choreography-bound SFX, beat landmarks;
- token presets and typed frame-addressed transform tracks.

This vocabulary is a ceiling, not permission to approximate unsupported work.
Consult the capability matrix whenever the hero relies on 3D, compositing,
generated media, narration, or advanced audio.

## Assets

Acquire real product/brand material before authoring decorative substitutes:

```bash
chitra fetch <image-url> -o assets/name.png
chitra snap <page-url> -o assets/site.png --width 1920 --height 1080
ffmpeg -ss <seconds> -i <video> -frames:v 1 assets/still.png
```

Crop recorder chrome and personal data. Never put remote URLs in Score. Host
image/video generation tools may create plates, textures, or footage when the
user authorizes it; freeze outputs locally and record model/prompt/rights.

## Composition and motion

- One hero hierarchy per scene; supporting motion must reveal or clarify it.
- Copy is shorter than the first draft. Typography is composed, not centered by
  default; spacing and line breaks are visible design decisions.
- A palette is roles and contrast, not “black plus neon.” Avoid unmotivated
  gradients, generic glows, equal card grids, and ambient motion added to satisfy
  a metric.
- Motion begins and resolves with composed states. A transition carries meaning
  between two shots; it is not decoration over a cut.
- Camera moves require an optical purpose: reveal form, change scale, transfer
  attention, or create parallax. Constant orbit/spin is a failure.
- Sound marks structure, material, scale, or interaction. Do not attach a whoosh
  to every movement.

Use motion tokens/presets. Raw timing/easing requires an `override.reason`.
Relational timing uses `at.after`. Exact transform tracks use typed keyframes;
they do not turn an unsupported compositor into a supported one.

## Figure and source integrity

Figures use token CSS and meaningful kebab-case IDs. Declare every nested local
asset. Source-assisted reconstruction declares asset lineage; clean-room scores
cannot render reference bytes. Run the complete boundary check:

```bash
chitra creative-check intake.lock.json direction.json storyboard.json score.json
chitra validate score.json
chitra evidence score.json -o out/evidence
```

Open the contact sheet and hero frames. Do not proceed because the commands are
green; proceed only when the stills carry the intended hierarchy and feeling.

