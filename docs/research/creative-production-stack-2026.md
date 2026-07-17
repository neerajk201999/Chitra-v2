# Creative production stack — adoption map (2026-07-17)

This is a routing map, not a dependency wishlist. A resource enters Chitra only
when a benchmark proves that it improves watched output, speed, or reliability
enough to justify install weight, licensing, and agent context.

## Motion direction and timelines

| Resource | What is solved | Chitra decision |
|---|---|---|
| [GSAP](https://gsap.com/) | Seekable timelines, easing, choreography, SVG/DOM motion | Keep as the default compiled timeline. Chitra owns presets and constraints. |
| [Theatre.js](https://github.com/theatre-js/theatre) (Apache-2.0) | Authorable property sheets, sequences, interpolation, 3D bindings | Study its property/sequence model for a future editor and nested tracks; do not add its studio/runtime to the core yet. |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) (MIT) | Generator-driven Canvas animation, scene composition, deterministic preview | Benchmark as a Canvas backend/reference implementation after first-use recovery. Its authoring model is less agent-legible than Chitra IR. |
| [Rive runtime](https://github.com/rive-app/rive-runtime) (MIT) | Compact state-machine vector animation across platforms | Add only as an imported seekable asset type; do not recreate its editor. |
| [dotLottie](https://github.com/LottieFiles/dotlottie-web) / [Lottie](https://github.com/airbnb/lottie-web) (MIT) | Portable authored vector animation | Candidate imported asset adapter with explicit licensing/provenance. Not a general compositor. |
| [HyperFrames](hyperframes.md) | Agent routing, named recipes, frame-worker contracts, lazy skills | Adopt progressive disclosure and role boundaries; beat it with typed feasibility and watched-output review. |
| [Impeccable](impeccable.md) | Anti-slop doctrine and deterministic/static design checks | Continue adapting principles to temporal evidence; never import a generic coding-minimalism philosophy into art direction. |

## 2D, 3D, compositing, and color

| Resource | What is solved | Chitra decision |
|---|---|---|
| [Three.js](https://github.com/mrdoob/three.js) (MIT) | Web 3D scene graph, glTF, PBR materials, cameras, lights | Already used. Next measured 3D slice is glTF + environment lighting, not more curated slabs. |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) (zlib) | Three.js bloom, depth of field, SMAA, tone mapping | Reference for typed cinematic passes; adopt only with deterministic golden-frame evidence. |
| [PixiJS](https://github.com/pixijs/pixijs) (MIT) | High-throughput WebGL/WebGPU 2D sprites, filters, masks | Benchmark for particle/2D compositor throughput and masks; avoid React coupling. |
| [Skia Canvas](https://github.com/samizdatco/skia-canvas) (MIT) and [Skia](https://skia.org/) (BSD) | Native 2D rasterization, typography, filters | Candidate non-browser backend. Native binaries and HTML/CSS parity are the costs. |
| [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) | Direct frame/video encode/decode in browser runtimes | Preferred throughput direction after a parity corpus exists. Does not itself provide layout or a scene graph. |
| [OpenColorIO](https://github.com/AcademySoftwareFoundation/OpenColorIO) (BSD-3-Clause) + [ACES](https://acescentral.com/) | Reproducible display transforms and professional color pipelines | Use as external color-management references; add a core dependency only when HDR/wide-gamut becomes an accepted target. |
| [Blender](https://www.blender.org/) (GPL application) + glTF 2.0 | General geometry, materials, lighting, simulation, camera, render | Treat Blender as an optional external asset/render worker, never a linked core library. Import its glTF/renders with provenance. |

## Asset understanding and construction

| Resource | What is solved | Chitra decision |
|---|---|---|
| [SAM 2](https://github.com/facebookresearch/sam2) (Apache-2.0) | Image/video segmentation and tracking | Optional provider/tool adapter for masks and cutouts; never mandatory npm weight. |
| [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2) (code Apache-2.0; verify model license) | Monocular depth maps for 2.5D parallax and relighting | Useful asset-preparation worker. Model-specific licenses must be recorded. |
| [OpenCV](https://github.com/opencv/opencv) (Apache-2.0) | Tracking, geometry, optical flow, image processing | Prefer external CLI/Python workers for analysis; keep native binaries out of the default install. |
| Host image/video tools | Product concepts, textures, plates, footage | Provider-neutral: use capabilities already exposed by Claude/Codex/Cursor, freeze outputs locally, and record prompt/model/rights. Chitra must not require one vendor. |

## Image/video quality and creative evaluation

| Resource | What is solved | Chitra decision |
|---|---|---|
| [VMAF](https://github.com/Netflix/vmaf) | Full-reference perceptual video quality | Add as an optional comparator metric when FFmpeg/libvmaf is available; it measures fidelity, not taste. |
| [LPIPS](https://github.com/richzhang/PerceptualSimilarity) | Learned perceptual image distance | Candidate offline comparator; Python/model weight keeps it optional. |
| [NIMA](https://arxiv.org/abs/1709.05424) and [MUSIQ](https://arxiv.org/abs/2108.05997) | Learned image aesthetic/quality assessment | Research signals for hero-frame ranking, never sole release judges. Domain calibration is required. |
| [FAST-VQA](https://github.com/VQAssessment/FAST-VQA-and-FasterVQA) and [DOVER](https://github.com/VQAssessment/DOVER) | No-reference technical/aesthetic video quality | Candidate offline ChitraBench features. Validate licenses/weights and correlation on motion-design clips first. |
| [Q-Align](https://arxiv.org/abs/2312.17090) | Language-aligned image/video quality levels | Reference for calibrated ordinal judgments and explanation, not a drop-in taste oracle. |
| [VBench](https://arxiv.org/abs/2311.17982) | Multi-dimensional generated-video evaluation | Reuse benchmark methodology: separated dimensions, fixed prompts, published protocol. Its text-to-video dimensions do not directly define motion-design quality. |
| Chitra blind panel (ADR-0030) | Preference, principle, and severity agreement on actual outputs | Remains authoritative for “better.” Automated metrics are features to calibrate against humans. |

## Sound, music, rhythm, and mix

| Resource | What is solved | Chitra decision |
|---|---|---|
| [FFmpeg](https://ffmpeg.org/) | Decode, mix, loudness, filters, encoding | Keep as required substrate; expose richer typed automation rather than shell snippets in skills. |
| [librosa](https://github.com/librosa/librosa) (ISC) | Beat, onset, spectral, harmonic/percussive analysis | Optional Python analysis worker/reference; avoid forcing Python into base install. |
| [Meyda](https://github.com/meyda/meyda) (MIT) | Lightweight JavaScript audio features | Candidate for richer in-process analysis if FFmpeg facts are insufficient. |
| [aubio](https://github.com/aubio/aubio) (GPL-3.0) and Essentia | Mature onset/beat/music descriptors | Research/optional external tools; licensing blocks embedding in the permissive core without review. |
| [Tone.js](https://github.com/Tonejs/Tone.js) and [Tonal](https://github.com/tonaljs/tonal) | Web audio scheduling and music theory | Reference/generation helpers; final mix remains rendered and measured by FFmpeg. |

## Immediate build order

1. **First-use recovery:** no browser download, executable CLI, truthful probe,
   disk preflight, sampled JPEG preview, install/preview benchmarks.
2. **Context and decision recovery:** compact router, on-demand references,
   capability matrix, still-before-motion approval, no full schema dumps.
3. **Creative floor recovery:** a small curated corpus of excellent/failed
   hero frames and motion clips, blind human labels, accepted-revision memory,
   and reference-conditioned review prompts.
4. **3D hero capability:** glTF import, environment maps/PBR, shadows, typed
   camera/light/post tracks, and a product-film benchmark. Do not claim premium
   industrial CGI before that benchmark wins blind review.
5. **Renderer throughput:** stream/chunk capture, then compare BeginFrame,
   WebCodecs, Pixi, Motion Canvas, and Skia against deterministic parity.
6. **Audio direction:** narration/clip audio, word timing, energy envelopes,
   typed mix automation, and calibrated audio-motion review.

The rule for adoption is simple: licenses are verified, install weight is
measured, deterministic parity is tested, and watched output improves on a
pre-registered case. Popularity alone is not evidence.

