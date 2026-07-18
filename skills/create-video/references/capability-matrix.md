# Capability matrix — production truth

Run `chitra capabilities --json` for the machine-readable registry. This file
adds the production interpretation needed during Direction.

| Requirement | Native | Asset-assisted | Boundary |
|---|---:|---:|---|
| Typography, layouts, shapes, gradients | yes | yes | No calibrated professional optical-spacing guarantee. |
| Images, screenshots, product UI | yes | yes | Rasterized text has weaker structural inspection. |
| Video plates/footage | yes | yes | `edit-render` preserves clip audio; Score video elements remain visual-only. |
| Cursor/type interactions | yes | yes | Not arbitrary website execution. |
| Particles and motif morphs | yes | yes | No general physics simulation. |
| 2D/2.5D transform keyframes | yes | yes | One-level groups; no deep local compositions. |
| Masks, mattes, blend modes, deep comps | no | pre-rendered plate | Not first-class in Score/compiler. |
| Motion blur, depth of field, filmic post | no | pre-rendered plate | Screenshot backend has no temporal blur. |
| Curated 3D card/coin/slab | yes | textures | Bounded geometry and synthetic camera/lights. |
| Arbitrary product geometry/glTF | no | pre-rendered still/video | No glTF/custom mesh import. A slab is not a custom product. |
| Environment reflections/cast shadows | no | pre-rendered still/video | No environment-map or shadow pipeline. |
| General character/physics simulation | no | pre-rendered still/video | External 3D/video production required. |
| Music bed and sparse SFX | yes | yes | Limited automation; final loudness measured. |
| Voiceover generation/sync | no provider | supplied recording | Transcript IR has word timing; no TTS or narration-generation adapter. |
| Transcript-addressed footage EDL | yes | transcription provider | Locked word timeline, compact pack, quote-conformed EDL, rendered audio-preserving plate. |
| Requested footage/cut evidence | yes | — | EDL-selected filmstrips, waveforms, cut strips, and neutral diagnostics; semantic quality still needs review. |
| Seekable Lottie/Rive/glTF import | no | pre-rendered plate | No deterministic runtime adapter. |
| Beat/onset choreography | yes | yes | Dense audio can over-count. |
| Reference decomposition/comparison | yes | yes | No semantics, optical flow, or taste measurement. |
| Website/image acquisition | yes | yes | Uses installed system browser; freeze assets locally. |
| Image/video generation | no provider bundled | host tools | Record model, prompt, provenance, and rights. |
| Structural/temporal QA | yes | — | Bounded sampling; green is a measurable floor, not taste. |
| Professional taste guarantee | no | human panel | Independent calibration corpus is not collected. |
| Accepted-revision memory | yes | — | Contract/compiler is measured; real taste lift is not. |
| Directorial alternative search | yes | — | Bounded still probes and receipt integrity are measured; reviewer blindness and selection quality are not independently proven. |
| Embeddable player/studio | no | external review tools | Chitra emits evidence and rendered files. |
| Distributed/cloud render | no | external infrastructure | Single local worker only. |

For every brief-critical requirement, Direction records the capability ID,
registry support, approach, acceptance test, and planned project-local path for
asset-assisted work. Unsupported must-haves block validation. Asset-assisted
must-haves block creative conformance until that exact path reaches the Score.
