export * from "./ir/schema.js";
export * from "./motion/tokens.js";
export * from "./capabilities/index.js";
export { compile, resolveSceneTimeline, totalDurationMs, type CompileResult } from "./compile/index.js";
export { openSession, renderScore, renderInputFiles, sceneHash, scoreHash, type RenderSession, type RenderResult, type TextRegion, type Quality } from "./render/index.js";
export {
  RULE_POLICIES,
  applyGatePolicies,
  applyStyleAcceptances,
  runStaticGates,
  runFrameGates,
  frameGateSampleTimes,
  FRAME_GATE_INTERVAL_MS,
  runConformance,
  runIntakeDirectionConformance,
  runDirectionStoryboardConformance,
  runStoryboardScoreConformance,
  runAssetProvenanceConformance,
  runBrandConformance,
  runCreativeConformance,
  summarize,
  type Finding,
  type ClassifiedFinding,
  type GatePolicy,
  type GatePolicyContext,
  type StyleAcceptance,
} from "./gates/index.js";
export { generateEvidence, type EvidenceResult } from "./evidence/index.js";
export { measureAudio, audioInvariantIssues, type AudioMeasurement } from "./audio/measure.js";
export {
  assertReleaseTargets,
  releaseFingerprint,
  makeReleaseReceipt,
  verifyReleaseReceipt,
  ReleaseReceiptSchema,
  LegacyReleaseReceiptSchema,
  sha256File,
  type ReleaseArtifacts,
  type ReleaseFingerprint,
  type ReleaseReceipt,
  type LegacyReleaseReceipt,
  type StoredReleaseReceipt,
} from "./release/index.js";
export { STYLE_DNA_VERSION, StyleDNA, type StyleDNAT } from "./reference/schema.js";
export { decomposeReference, type DecomposeOptions } from "./reference/decompose.js";
export { COMPARISON_VERSION, ReferenceComparison, type ReferenceComparisonT } from "./reference/comparison-schema.js";
export { compareReference, type CompareMode, type CompareOptions, type CompareRegion } from "./reference/compare.js";
export { INTAKE_VERSION, Intake, IntakeSource, validateIntake, type IntakeT, type IntakeSourceT } from "./intake/schema.js";
export { materializeIntake } from "./intake/materialize.js";
export { BRAND_SYSTEM_VERSION, BUNDLED_FONT_FAMILIES, BrandSystem, validateBrandSystem, materializeBrandSystem, brandSystemDigest, type BrandSystemT } from "./brand/index.js";
export { CREATIVE_REVIEW_VERSION, CRAFT_PRINCIPLES, REVIEW_DOMAINS, CreativeReview, CalibrationCaseLabel, validateCreativeReview, scoreCreativeReview, type CreativeReviewT, type CalibrationCaseLabelT, type CraftPrincipleId } from "./creative/review.js";
export { INDEPENDENT_CALIBRATION_VERSION, IndependentCalibrationStudy, validateIndependentCalibrationStudy, scoreIndependentCalibrationStudy, type IndependentCalibrationStudyT } from "./creative/calibration.js";
export { REVISION_MEMORY_VERSION, REVISION_CONTEXT_VERSION, RevisionMemory, validateRevisionMemory, validateRevisionContextQuery, compileRevisionContext, type RevisionMemoryT, type RevisionEntryT, type RevisionContextQuery } from "./creative/memory.js";
export { DIRECTORIAL_SEARCH_VERSION, DIRECTION_SELECTION_VERSION, DirectorialSearchDraft, LockedDirectorialSearch, BlindProbePacket, DirectorialProbeManifest, BlindDirectionSelection, DirectionSelectionReceipt, intakeDigest, directionDigest, scoreDigest, directorialSearchDigest, lockDirectorialSearch, verifyLockedDirectorialSearch, generateDirectorialProbes, validateBlindDirectionSelection, makeDirectionSelectionReceipt, type DirectorialSearchDraftT, type LockedDirectorialSearchT, type BlindProbePacketT, type DirectorialProbeManifestT, type BlindDirectionSelectionT, type DirectionSelectionReceiptT } from "./creative/search.js";
export { TRANSCRIPT_VERSION, EDIT_VERSION, EDIT_RECEIPT_VERSION, TranscriptDraft, LockedTranscript, EditDecisionList, validateTranscript, validateEditDecisionList, lockTranscript, transcriptDigest, editDigest, packTranscript, resolveEdit, verifyTranscriptSources, resolveEditArtifactTarget, renderEdit, type TranscriptDraftT, type LockedTranscriptT, type EditDecisionListT, type ResolvedEditSegment, type EditRenderReceipt } from "./editing/index.js";
export { FOOTAGE_EVIDENCE_VERSION, FootageEvidenceRequest, FootageEvidenceManifest, generateFootageEvidence, type FootageEvidenceRequestT, type FootageEvidenceManifestT } from "./editing/evidence.js";
