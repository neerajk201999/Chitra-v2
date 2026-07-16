# Multimodal Intake benchmark

**Verified:** 2026-07-16 · **Intake IR:** 0.1.0

`node benchmarks/intake/run.mjs --check` builds a temporary project containing:

- an inline direction prompt;
- a project-local reference video with derived Style DNA evidence;
- an uncaptured webpage URL;
- a positive preference and an anti-reference.

The benchmark locks the same intake twice and asserts identical parsed output,
SHA-256 fingerprints for every local/inline source and evidence artifact, and no
fabricated content fingerprint for the uncaptured URL.

This proves deterministic inventory and provenance handling. It does not prove
that a model interpreted a source correctly or that the declared rights state is
legally sufficient.
