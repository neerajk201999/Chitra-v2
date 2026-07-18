export const CAPABILITY_MATRIX_VERSION = "0.3.0";
export type CapabilitySupport = "native" | "asset-assisted" | "unsupported";
export const CAPABILITY_IDS = [
  "typography-layout", "image-ui", "video-plates", "transform-motion", "particles",
  "curated-3d", "arbitrary-3d", "environment-reflections-shadows",
  "masks-blends-deep-comps", "motion-blur-dof", "music-sfx",
  "voiceover-word-sync", "reference-analysis", "generated-media", "professional-taste",
  "clip-audio", "transcript-edl", "imported-animation", "player-studio",
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
  { id: "image-ui", support: "native", mechanism: "local image and sanitized figure elements", boundary: "rasterized text has reduced structural inspection" },
  { id: "video-plates", support: "native", mechanism: "deterministic frame extraction plus transcript-addressed edit plates", boundary: "Score video elements remain visual-only; use edit-render to preserve clip audio" },
  { id: "transform-motion", support: "native", mechanism: "presets, typed tracks, one-level groups", boundary: "no deep local-coordinate compositions" },
  { id: "particles", support: "native", mechanism: "typed formations, custom points, morphs", boundary: "no general physics simulation" },
  { id: "curated-3d", support: "native", mechanism: "card, coin, slab with typed camera/light tracks", boundary: "curated geometry and synthetic lights only" },
  { id: "arbitrary-3d", support: "asset-assisted", mechanism: "owned/licensed pre-rendered still or video", boundary: "no glTF or custom mesh import" },
  { id: "environment-reflections-shadows", support: "asset-assisted", mechanism: "owned/licensed pre-rendered still or video", boundary: "no environment map or cast-shadow pipeline" },
  { id: "masks-blends-deep-comps", support: "asset-assisted", mechanism: "owned/licensed pre-composited plate", boundary: "not first-class in Score" },
  { id: "motion-blur-dof", support: "asset-assisted", mechanism: "owned/licensed pre-rendered plate", boundary: "browser screenshot backend has no temporal blur" },
  { id: "music-sfx", support: "native", mechanism: "music bus, choreography SFX, beat landmarks", boundary: "sparse mix automation" },
  { id: "voiceover-word-sync", support: "asset-assisted", mechanism: "pre-mixed supplied track", boundary: "no typed narration or word timeline" },
  { id: "reference-analysis", support: "native", mechanism: "decompose and compare", boundary: "no semantic equivalence or optical flow" },
  { id: "generated-media", support: "asset-assisted", mechanism: "host-agent image/video tools with local provenance", boundary: "no provider bundled" },
  { id: "professional-taste", support: "unsupported", mechanism: "requires calibrated independent human evidence", boundary: "review contract exists; calibration corpus does not" },
  { id: "clip-audio", support: "native", mechanism: "edit-render preserves source audio, synthesizes mixed-source silence, fades cuts, and normalizes the bus", boundary: "Score video elements remain visual-only; edited footage enters as a rendered plate" },
  { id: "transcript-edl", support: "native", mechanism: "locked provider-neutral word timeline, compact phrase pack, typed quote-conformed EDL", boundary: "no bundled transcription provider or word-aligned visual timeline yet" },
  { id: "imported-animation", support: "asset-assisted", mechanism: "owned/licensed pre-rendered still or video", boundary: "no seekable Lottie, Rive, or glTF adapter" },
  { id: "player-studio", support: "unsupported", mechanism: "evidence and rendered files only", boundary: "no embeddable player or timeline editor" },
  { id: "distributed-render", support: "unsupported", mechanism: "single local render worker", boundary: "no chunk plan, remote workers, or deterministic assembly" },
  { id: "brand-system", support: "asset-assisted", mechanism: "locked brand sources and explicit Direction constraints", boundary: "no automated brand token, motif, or motion-personality IR" },
  { id: "accepted-revision-memory", support: "native", mechanism: "typed scoped ledger and deterministic bounded context compiler", boundary: "no real outside-user taste-lift evidence yet" },
  { id: "directorial-search", support: "unsupported", mechanism: "single authored Direction/Storyboard path", boundary: "no bounded blind concept-probe comparison" },
];
