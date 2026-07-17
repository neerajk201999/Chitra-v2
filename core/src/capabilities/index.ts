export const CAPABILITY_MATRIX_VERSION = "0.1.0";
export type CapabilitySupport = "native" | "asset-assisted" | "unsupported";
export const CAPABILITY_IDS = [
  "typography-layout", "image-ui", "video-plates", "transform-motion", "particles",
  "curated-3d", "arbitrary-3d", "environment-reflections-shadows",
  "masks-blends-deep-comps", "motion-blur-dof", "music-sfx",
  "voiceover-word-sync", "reference-analysis", "generated-media", "professional-taste",
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
  { id: "video-plates", support: "native", mechanism: "deterministic frame extraction", boundary: "clip audio does not pass through" },
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
];
