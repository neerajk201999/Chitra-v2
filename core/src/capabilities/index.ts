export const CAPABILITY_MATRIX_VERSION = "0.6.0";
export type CapabilitySupport = "native" | "asset-assisted" | "unsupported";
export const CAPABILITY_IDS = [
  "typography-layout", "frame-design-system", "image-ui", "video-plates", "transform-motion", "particles",
  "curated-3d", "arbitrary-3d", "environment-reflections-shadows",
  "masks-blends-deep-comps", "motion-blur-dof", "music-sfx",
  "voiceover-word-sync", "narration-generation", "reference-analysis", "generated-media", "professional-taste",
  "clip-audio", "transcript-edl", "footage-evidence", "lottie-animation",
  "rive-animation", "imported-animation", "player-studio",
  "distributed-render", "brand-system", "accepted-revision-memory", "directorial-search",
] as const;
export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export interface Capability {
  id: CapabilityId;
  support: CapabilitySupport;
  mechanism: string;
  boundary: string;
}

export const CAPABILITIES: Capability[] = [
  { id: "typography-layout", support: "native", mechanism: "text, shapes, figures, browser layout", boundary: "no calibrated professional optical-spacing guarantee" },

  { id: "frame-design-system", support: "native", mechanism: "free/stack/grid local compositions, bounded optical type treatments, rendered focal/reading/alignment/gap contracts, staged Frame→Motion→Sound ownership", boundary: "no automatic taste guarantee, constraint solver, large template gallery, or token-pure arbitrary figure CSS" },
  { id: "image-ui", support: "native", mechanism: "local image and sanitized figure elements", boundary: "rasterized text has reduced structural inspection" },
  { id: "video-plates", support: "native", mechanism: "deterministic frame extraction plus transcript-addressed edit plates", boundary: "Score video elements remain visual-only; use edit-render to preserve clip audio" },
  { id: "transform-motion", support: "native", mechanism: "presets, typed tracks, and bounded local-coordinate compositions", boundary: "composition depth is 8; no nested time remapping or independent timelines" },
  { id: "particles", support: "native", mechanism: "typed formations, custom points, morphs", boundary: "no general physics simulation" },
  { id: "curated-3d", support: "native", mechanism: "card, coin, slab with typed camera/light tracks", boundary: "curated geometry and synthetic lights only" },
  { id: "arbitrary-3d", support: "asset-assisted", mechanism: "owned/licensed pre-rendered still or video", boundary: "no glTF or custom mesh import" },
  { id: "environment-reflections-shadows", support: "asset-assisted", mechanism: "owned/licensed pre-rendered still or video", boundary: "no environment map or cast-shadow pipeline" },
  { id: "masks-blends-deep-comps", support: "native", mechanism: "typed clips, alpha/luminance and gradient mattes, blend/filter/isolation controls, nested local groups", boundary: "static compositing parameters; no animated mask paths, shaders, or arbitrary CSS/runtime" },
  { id: "motion-blur-dof", support: "asset-assisted", mechanism: "owned/licensed pre-rendered plate", boundary: "browser screenshot backend has no temporal blur" },
  { id: "music-sfx", support: "native", mechanism: "music, narration side-chain ducking, choreography SFX, beat landmarks, measured final bus", boundary: "no general multitrack automation or DAW effect graph" },
  { id: "voiceover-word-sync", support: "native", mechanism: "provider-neutral frozen narration, exact word clock, word-addressed choreography, music ducking", boundary: "no phoneme/lip sync, voice-quality judgment, or automatic caption art direction" },
  { id: "narration-generation", support: "asset-assisted", mechanism: "authorized host TTS or supplied recording frozen locally with exact word timing", boundary: "no TTS model, voice cloning, credentialed provider, or ASR bundled in core" },
  { id: "reference-analysis", support: "native", mechanism: "decompose and compare", boundary: "no semantic equivalence or optical flow" },
  { id: "generated-media", support: "asset-assisted", mechanism: "host-agent image/video tools with local provenance", boundary: "no provider bundled" },
  { id: "professional-taste", support: "unsupported", mechanism: "requires calibrated independent human evidence", boundary: "review contract exists; calibration corpus does not" },
  { id: "clip-audio", support: "native", mechanism: "edit-render preserves source audio, synthesizes mixed-source silence, fades cuts, and normalizes the bus", boundary: "Score video elements remain visual-only; edited footage enters as a rendered plate" },
  { id: "transcript-edl", support: "native", mechanism: "locked provider-neutral word timeline, compact phrase pack, typed quote-conformed EDL", boundary: "no bundled transcription provider or visual-event addressing outside transcript tokens" },
  { id: "footage-evidence", support: "native", mechanism: "bounded EDL-selected filmstrips, waveforms, adjacent-cut strips, neutral discontinuity metrics, hash cache", boundary: "semantic cut quality still requires evidence-bound review and calibration" },
  { id: "lottie-animation", support: "native", mechanism: "typed project-local vector JSON, pinned SVG runtime, scene-time frame mapping, normal/reverse/alternate playback", boundary: "vector-only JSON; no expressions, external images/fonts, dotLottie, Canvas renderer, or arbitrary runtime" },
  { id: "rive-animation", support: "asset-assisted", mechanism: "owned/licensed pre-rendered still or video", boundary: "no .riv runtime or state-machine/data-binding adapter" },
  { id: "imported-animation", support: "asset-assisted", mechanism: "typed Lottie is native; other owned/licensed animations enter as pre-rendered still or video", boundary: "generic import does not imply Rive, dotLottie, glTF, arbitrary scripts, or every After Effects feature" },
  { id: "player-studio", support: "unsupported", mechanism: "evidence and rendered files only", boundary: "no embeddable player or timeline editor" },
  { id: "distributed-render", support: "unsupported", mechanism: "single local render worker", boundary: "no chunk plan, remote workers, or deterministic assembly" },
  { id: "brand-system", support: "native", mechanism: "locked Brand System IR, exact rule/palette/type conformance, local WOFF2 rendering, and cache/provenance binding", boundary: "host agent still interprets evidence; no automatic semantic brand extraction or professional-expression guarantee" },
  { id: "accepted-revision-memory", support: "native", mechanism: "typed scoped ledger and deterministic bounded context compiler", boundary: "no real outside-user taste-lift evidence yet" },
  { id: "directorial-search", support: "native", mechanism: "locked 2–4 Direction search, comparable still probes, identity-free packet, blind selection receipt", boundary: "process and integrity are measured; selection quality and reviewer blindness are not independently proven" },
];
