# Reference analysis and reconstruction

Load only when a reference video materially informs the film or exact
reconstruction is requested.

## Separate evidence from imitation

Run:

```bash
chitra decompose reference.mp4 -o style-dna.json
```

Inspect shot evidence. Record transferable rhythm, luminance, palette roles,
motion energy, camera grammar, typography behavior, and audio landmarks.
Annotate semantics separately; Style DNA does not measure intent.

Never transfer identity, branding, copy, pixels, audio, or distinctive assets
without permission. `reference-only` evidence informs decisions but cannot be
rendered. Source-assisted work requires locked `owned`/`licensed` sources and
declared direct/derived lineage.

## Exactness

Typed DOM keyframe tracks own X/Y, scale, 3-axis rotation, opacity, perspective,
origin, and token easing. Curated 3D tracks own bounded mesh, camera, key/fill
light, and exposure properties. Typed compositing owns static clips,
alpha/luminance and gradient mattes, blend/filter/isolation controls, and nested
local-coordinate groups to depth eight. It does not provide animated mask/filter
tracks, shaders, nested time remapping, arbitrary geometry/materials,
environment reflections, cast shadows, or motion blur.

Compare equal geometry/FPS/frame-count renders with:

```bash
chitra compare reference.mp4 out.mp4 -o comparison.json \
  --evidence comparison-evidence --mode exact
```

Exact means decoded-pixel MAE 0 and SSIM 1. Named ROI diagnostics localize a
residual but never override the whole-film result. Normalized-progress sampling
is for style/rhythm iteration and cannot be called exact.

If the requested reference grammar requires an unsupported capability, stop at
the production approach gate. Obtain an authorized pre-rendered asset/plate,
build the capability against a benchmark, or approve a different concept.
