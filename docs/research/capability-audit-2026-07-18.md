# Capability audit — current competitive surface and Chitra decisions

**Evidence cut:** 2026-07-18. **Chitra:** `80c9932` plus ADR-0032 branch.
**Primary sources:** current repositories, package manifests, published npm
metadata, official documentation, and executable Chitra registries. Product
behavior that could not be inspected is labelled unverified.

## Executive conclusion

Chitra is now easier and lighter than its failed Cursor run, but public `0.5.0`
is not yet proven because npm authentication expired. The local package installs
in 1.4 seconds with a warm cache, occupies 62.8 MiB, downloads no browser,
launches a real system-browser frame within a 6.5-second end-to-end install
check, and renders a 9.6-second 1080×1920 12fps preview
in 8.1 seconds. Those are measured local facts, not a universal cold-network
claim. Public npm remains `0.4.0`.

Chitra does not have every capability of Remotion, HyperFrames, EditFrame, or
video-use. Literal parity would be the wrong architecture: Remotion alone has a
decade of renderer, player, cloud, media, effects, and framework integration
work. The correct program is parity at important user jobs, narrow mature
adapters where the substrate is solved, and differentiated control over intent,
evidence, revision, and memory.

## Source status

| Project | Verified current source | Important qualification |
|---|---|---|
| HyperFrames | `heygen-com/hyperframes`, 0.7.62, Apache-2.0, 35,983 stars | Full CLI + producer installs are large: published CLI content is 23.1 MB before dependencies; producer is 74.0 MB before dependencies and declares Puppeteer. |
| Remotion | `remotion-dev/remotion`, npm 4.0.490, 53,534 stars | Package licensing is mixed/custom; adoption requires file/package license review. Breadth is much larger than Chitra. |
| video-use | `browser-use/video-use`, MIT, 17,061 stars | Focused raw-footage editor, not a general motion renderer. Its compact transcript representation is excellent. |
| EditFrame | npm 0.58.4 packages and official product surface | Published metadata points to `github.com/editframe/elements`, but that repository returned 404 and packages say `SEE LICENSE`. Conceptual behavior is inspectable; implementation is not treated as open source. |
| Replit Video | no authoritative repository found | GitHub searches in and outside the Replit org found no canonical project. No implementation claim is made without a URL. |

## Capability matrix

`Decision` means **adopt**, **improve**, **replace**, or **omit**. Priority is
about blocked user work, not competitor prestige.

| Capability / user job | Why it exists and conceptual implementation | Verified leader(s) | Chitra status and gap | Decision | Priority |
|---|---|---|---|---|---:|
| Frame-pure deterministic animation | Random seek, repeatable renders, safe parallelization; derive state from a clock/frame | Remotion, HyperFrames | Typed tracks and seek clock; same-machine evidence only | improve cross-machine/interruption proof | P0 |
| Fast browser-free installation | Users abandon large downloads and brittle setup | System browser or WebCodecs; lazy optional packs | 0.5 local after ADR-0033: 1.4s warm/62.8 MiB/no browser download; public proof pending | improve and measure network-cold installs | P0 |
| Diagnostic preview | Creative iteration cannot wait for release encoding | sampled frames/player/studio | ≤12fps JPEG preview is 8.1s for 9.6s fixture; no live player | improve streaming/player only after outside-user evidence | P0 |
| Full release rendering/codecs | Deliver MP4/WebM/GIF/audio with production controls | Remotion/HyperFrames/EditFrame | H.264 MP4 + FFmpeg; narrow format surface and ~2fps release capture | adopt backend adapters, preserve Score | P1 |
| Timeline/sequences/tracks | Place and overlap media predictably | all | Scenes, transitions, choreography, one-level groups | improve local/deeper compositions from measured residual | P1 |
| General property keyframes | Precise motion without preset coercion | Remotion/HyperFrames | Typed DOM and selected 3D tracks | improve property surface only with gates | P1 |
| Masks/mattes/blend modes | Reveals, compositing, material transitions, localized effects | Remotion effects/HTML canvas, HyperFrames shaders | pre-composited asset only | adopt a typed compositor abstraction | P1 |
| Motion blur/DOF/post | Perceptual continuity and premium CG finish | Remotion motion blur/effects, external CG | pre-rendered asset only | adopt as optional, benchmarked post/compositor passes | P1 |
| Transition families | Control how meaning/attention crosses a cut | Remotion/HyperFrames | cut/crossfade/fade-through-black | replace catalogs with motivated transition intent plus adapters | P2 |
| 2D effects/shaders | Expressive visual grammar and treatment | Remotion effects; HyperFrames shader transitions | shapes/gradients/particles, no general effect graph | adopt narrow effect nodes when a film residual demands them | P2 |
| Arbitrary HTML/CSS/JS composition | Escape hatch for bespoke motion | HyperFrames/Remotion | sanitized HTML figures; no arbitrary runtime scripts | intentionally constrain render trust boundary; allow vetted adapters | P2 |
| 3D/glTF/materials/lights | Product visualization and spatial storytelling | Remotion Three/R3F ecosystem, HyperFrames adapters | curated card/coin/slab with typed camera/light tracks | adopt glTF/PBR/shadows as optional pack after product-CG benchmark | P1 |
| Lottie/Rive/animation adapters | Reuse authored assets and designer workflows | Remotion, HyperFrames | asset-assisted video only | adopt seekable local adapters | P1 |
| Player/Studio/timeline UI | Scrub, review, edit and embed without rerendering | Remotion, HyperFrames, EditFrame | evidence sheets and files only | adopt a viewer; omit full GUI editor before quality proof | P2 |
| Cloud/distributed rendering | Scale long/high-res/batch jobs | Remotion Lambda/Cloud Run; HyperFrames cloud/Lambda/GCP | absent | adopt chunk plan/assemble after local throughput proof | P2 |
| Media import and clip seeking | Use user footage, not only generated scenes | all | deterministic video frames, no clip audio | improve with clip audio and edit timeline | P0 |
| Word-timed transcription | Edit speech by meaning rather than timecodes | video-use, HyperFrames | absent | adopt provider-neutral transcript IR | P0 |
| Transcript-addressed EDL | Remove filler/retakes and form a story with compact context | video-use | absent | improve: connect transcript spans to Direction/Storyboard/Score | P0 |
| On-demand filmstrip/waveform | Give agents targeted visual evidence without dumping frames | video-use | contact sheets/cut strips, no word-aligned view | improve with requested ranges and saliency/cut candidates | P0 |
| Cut-boundary self-evaluation | Catch jump cuts, pops, hidden captions | video-use | bounded whole-film release gates; no speech-cut specialization | adopt specialist gates, preserve ≤3-pass loop | P1 |
| Music/SFX/beat grid | Rhythm, emotional arc, synchronization | HyperFrames, Remotion SFX, Chitra | native beds/SFX/onsets/loudness; sparse automation | improve typed mix automation and energy curves | P1 |
| Voice/TTS/word sync | Narration-led explainers and accessibility | HyperFrames/video-use/provider ecosystems | supplied premix only | replace provider lock-in with typed narration + adapters | P0 |
| Asset resolver/provider catalog | Remove manual searching and freeze rights/provenance | HyperFrames | fetch/snap/local provenance; no catalog/ranking | improve provider-neutral acquisition and rights-aware ranking | P1 |
| Website capture and brand extraction | Turn existing product truth into usable visual input | HyperFrames | screenshot capture, typed Intake; shallow brand extraction | improve into brand system and evidence inventory | P0 |
| Figma import | Preserve designed source rather than redraw badly | HyperFrames/Remotion integrations | absent | adopt assets/tokens/states through a narrow adapter | P1 |
| Reference decomposition | Learn timing/palette/energy from examples | Chitra | native low-level Style DNA; no semantic shots/optical flow | improve targeted evidence, never copy blindly | P1 |
| Exact reference comparison | Diagnose residuals frame by frame | Chitra/Remotion regression tooling | exhaustive MAE/PSNR/global SSIM/ROI/audio envelope | improve local perceptual/flow metrics, keep pixels authoritative | P1 |
| Typed creative intent/provenance | Prevent a generated film from losing the user’s actual job and sources | Chitra | Intake→Direction→Storyboard→Score conformance | differentiated: deepen surgical revision addressing | P0 |
| Capability honesty | Block fake delivery when the renderer cannot produce a must-have | Chitra | versioned native/asset/unsupported registry | differentiated: expand registry granularity and acceptance probes | P0 |
| Storyboard checkpoints/sketch approval | Find bad hierarchy before expensive animation | HyperFrames current review loop | typed Storyboard but no automated still-first board | improve: render/compare hero-frame probes before motion | P0 |
| Aesthetic rendered-output critique | Judge watched result, not only source constraints | Chitra contract; no verified calibrated leader | evidence-bound review exists; independent corpus absent | differentiated only after ≥20-case calibration | P0 |
| Accepted revision/style memory | Stop repeating rejected ideas and compound approved brand choices | HyperFrames recipes/preferences partially solve reuse | ADR-0032 ships typed, scope-safe, bounded retrieval | differentiated: gather real outcomes; no silent global learning | P0 |
| Directorial search | Compare a few strong concepts before committing | no verified complete system | absent | differentiated: bounded alternatives + blind probe selection | P1 |
| Neutral quality benchmark | Make “better” falsifiable | none for motion-design agents | protocol direction exists; no real head-to-head | differentiated ChitraBench | P0 |
| Captions/social templates | High-volume social production | HyperFrames/video-use/Remotion | possible manually, no dedicated workflow | adopt only if real users demand it; avoid slop defaults | P2 |
| Hosted API/collaboration/publish URL | Operational convenience for teams/products | EditFrame, HyperFrames, Remotion cloud ecosystem | absent | omit until local product quality and demand are proven | P3 |

## What parity means for Chitra

Foundational parity is reached when a major user job is not blocked, not when
every competitor API name exists. The P0 parity gaps are therefore: public
first-use proof, footage/clip audio, transcript-addressed editing, narration
timelines, brand ingestion, still-first approval, calibrated judgment, and
neutral evaluation. Masks/deep comps and seekable imported animation are P1
because they block important premium film grammars. A hosted editor, every
codec, and every transition preset are not prerequisites for the product thesis.

## Claim boundaries

- No neutral benchmark proves Chitra beats any named project.
- Remotion remains the renderer/ecosystem breadth leader.
- HyperFrames remains the workflow/media/registry breadth leader and now has a
  sophisticated plan→sketch→build→preview user review loop. The older statement
  “nothing reviews output” is obsolete; the remaining distinction is calibrated,
  evidence-bound aesthetic judgment and accepted-revision outcomes.
- video-use currently has the best verified compact representation for raw
  speech footage: ~12 KB transcript plus on-demand timeline images.
- EditFrame implementation details and “Replit Video” claims remain unverified.
