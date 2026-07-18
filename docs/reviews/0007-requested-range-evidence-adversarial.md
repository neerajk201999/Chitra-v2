# Requested-range footage evidence adversarial review

**Date:** 2026-07-18 · **Scope:** ADR-0035 request bounds, source/frame/audio
extraction, content-addressed cache, cut diagnostics, CLI, and claim boundaries.

## Verdict

The slice closes Chitra's verified representation gap for on-demand transcript
visual evidence without increasing install dependencies or whole-video context.
It creates useful evidence for editorial judgment; it does not automate taste or
establish video-use parity. The architecture is sound because requests bind the
existing Transcript/Edit IR rather than introducing a second timeline model.

## Findings and disposition

| Severity | Finding | Disposition |
|---|---|---|
| P1 | Sampling a range whose context ends at the exact media duration could ask FFmpeg for a nonexistent terminal frame. | Filmstrip samples clamp to `duration - frameDuration`. The generated fixture selects a token ending at exactly 4,000ms and proves the last sample is the decodable 3,958ms frame at 24fps. |
| P1 | Artifact hashes protected PNGs, but cached manifest metrics could be edited without recomputation. | Manifest 0.1 now carries a digest over its normalized complete body; cache reuse verifies manifest digest before artifact bytes. The benchmark mutates RGB MAE and rejects the cache. |
| P1 | Pixel discontinuity could become a false automatic “bad cut” threshold. | ADR, capability registry, skill, manifest, and research docs call RGB MAE/luma/RMS neutral diagnostics. Semantic judgment must cite strips/waveforms through existing Creative Review principles. |
| P2 | Whole-video defaults would recreate the token/compute failure this feature is meant to solve. | Requests require one to twelve explicit EDL segment IDs, three to nine samples, ≤2s context, and ≤60s resolved ranges. Unknown/duplicate/unbounded selections fail. |
| P2 | Silent footage could either break waveform generation or masquerade as missing evidence. | Every selected range receives a waveform artifact; sources without audio render an explicit `SILENT SOURCE` panel and retain `hasAudio: false`. Mixed cut RMS uses nullable sides rather than invented zero audio. |
| P2 | Re-running an identical request could overwrite arbitrary files or retain stale evidence. | Request digest selects a dedicated directory; generation stages then atomically renames. Existing directories require a valid manifest and exact artifact hashes. Root/cache symlinks and non-directory targets fail. |
| P2 open | Frame/audio extraction spawns FFmpeg repeatedly and is optimized for sparse decisions, not hundreds of segments. | Hard request limits are intentional. Batch decode is deferred until outside workflows prove this sparse path too slow. |
| P2 open | Word-nearest labels do not address untranscribed UI states, gestures, or silent events semantically. | Transcript event tokens are supported; a broader visual-event IR remains a measured future extension. No fabricated speech address is allowed. |
| P2 open | Cross-machine PNG/metric identity is unmeasured across FFmpeg/Sharp builds. | Manifest records actual bytes; determinism claim remains repeated fixed-environment cache identity. Golden cross-platform evidence is deferred to ChitraBench infrastructure. |

## Verification evidence

- 84 unit tests and quick repository verification pass.
- Generated inputs: one moving audiovisual 640×360/30fps source and one silent
  480×360/24fps source.
- Three of four EDL segments produce fifteen labeled frames, three waveforms,
  and all three adjacent four-frame cut strips.
- Visual inspection confirms readable source/word/time labels, explicit silence,
  an inspectable outgoing/incoming handoff, and safe source-end sampling.
- CLI and library manifests are identical; repeated generation reuses the exact
  content-addressed manifest.
- Unknown segment, stale edit digest, changed source bytes, changed manifest,
  and changed artifact bytes are rejected.

## Merge boundary

The local full verifier passed on 2026-07-18 in 62.4 seconds: 84 tests, isolated
package install/browser frame, generated footage evidence, browser/render/
release/reference benchmarks, skills, 10/10 seeded defects, and package dry-run
are green. The npm artifact is 574.7 kB compressed/2.1 MB unpacked with no new
dependency. Merge still requires protected CI; npm publication remains a
separate authenticated release transaction.
