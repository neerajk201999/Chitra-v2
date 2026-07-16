# Known Issues (v0.3.0 — 2026-07-16)

Honest ledger. Each item is scheduled (milestone) or explicitly accepted. Fixed items move to the adversarial review record ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).

1. **Render speed ~2 fps/worker** (screenshot mode, single browser, PNG disk round-trip). Scheduled: per-scene parallel sessions + static-frame dedup + Linux BeginFrame mode (M5). Mitigated by the per-scene cache (only dirty scenes re-render).
2. **No paint-settle guarantee** between `seek()` and screenshot beyond empirical determinism on macOS; Linux/CI golden-frame verification pending (M5). Determinism claims are same-machine only.
3. **Audio covers music + SFX + detected beat timing** (ADR-0007/0011) — still no narration/voiceover timeline, energy-envelope property tracks, or clip-audio pass-through. Loudness (−14 LUFS target), beat detection, `at.onBeat`, and beat-cut gates are live. (M2 remainder.)
4. **VLM critic unproven**: no calibration set or measured human-agreement rate for `critique-video`; the deterministic layer's 10/10 seeded catch rate does not cover aesthetic judgment (M2/M4).
5. **Expressiveness ceiling (partly closed)**: figures, video-in-scene, cursor/type choreography, real 3D primitives, reason-gated frame tracks, and ADR-0020 custom particle constellations are built. Card Vault clean-room 0.6 proves all 274 frames can be authored, but not exactly: parent-scale + child-morph nesting, internal 3D/light tracks, and motion blur remain measured gaps. Masks/mattes, blend modes, and richer motif vocabulary also remain typed-IR gaps.
6. **Gate sampling is instant-based** (3 instants/scene): transient overlap or contrast dips between samples can slip through (M2: per-cut + interval sampling).
7. **Public distribution is not released.** The npm registry returns 404 and
   GitHub is private. Source/tarball installation, native Claude/Codex/Cursor
   manifests, `npx skills`, and an isolated install through a browser frame are
   verified; public access and three-harness outside-user timing still require
   owner release actions and independent testers (M3 exit).
8. **Distribution/parallel rendering unimplemented** (design in ADR-0002 consequences; M5).
9. **Ctrl-C mid-render** may briefly orphan the vendored Chrome process (no explicit signal handler).
10. **Example corpus is 2 scores**; agents compose better from a gallery (M3).
11. **Reference analysis is intentionally low-level.** FFmpeg scene scoring can
    miss soft edits or treat large motion as a cut; palette is quantized RGB;
    frame-difference energy is not optical flow; and ADR-0011 onset peaks can
    over-count musical beats in dense or continuous audio. Thresholds and
    analyzer methods are recorded in Style DNA, but ChitraBench accuracy and a
    separate evidence-linked semantic pass remain open (M4). Comparator 0.1 now
    adds exhaustive/sampled RGB MAE, PSNR, global-luma SSIM, diff images, and
    audio-energy envelopes, but not local perceptual features, optical flow,
    semantic equivalence, speech/music understanding, or calibrated preference.
12. **Creative conformance is structural, not semantic.** ADR-0018 now catches
    dropped sources/preferences/brand constraints, unresolved blockers,
    invented or reordered beats, missing shots/copy/heroes, and timing drift.
    It cannot prove that a governing idea, narrative, composition, or copy is
    professionally good. That requires calibrated Creative QA and blind labels.
13. **GitHub governance is only partly enforceable.** Vulnerability alerts are
    enabled, but branch protection is unavailable while this repository remains
    private on the current GitHub plan. Local and CI verification are green;
    repository visibility was not changed.

## Integrity findings from the 2026-07-16 due-diligence audit (docs open until fixed)
- **A1. Figure text bypasses the text gates (P1 integrity).** `textRegions()` only reads top-level IR text; text authored inside a `figure` fragment is NOT size/contrast/safe-zone/reading-time/overlap checked. This contradicted ADR-0008's "gates run on its pixels" wording (now corrected). The moat is "measurable quality" — this is a real hole. Fix: register figure DOM text after sanitization, enforce token-only styling with a real CSS parser. (M4 Creative QA.)
- **A2. Three-instant gate sampling misses transient violations (P1).** Frame gates sample 3 instants/scene; a headline can enter off-safe-zone and settle, passing green. Fix: sample animation boundaries + interval checks.
- **A3. `chitra render` doesn't run frame gates unless the user ran `check` (P2).** Add a `chitra release` that enforces validate→check→render→evidence with a hash-keyed receipt.
- **A4. ✅ Packaging launch blocker fixed 2026-07-16:** `main`/`types` point at `dist`, an `exports` map is present, and package/README/skill-manifest identity is 0.3.0. Publishing and outside-tester install verification remain item 7.
- **A5. Audio −14 LUFS is a target, not a verified invariant** — normalizes the bed, doesn't measure the final mux. Add two-pass final-loudness measurement/gate.
- **A6. Determinism is same-machine-uninterrupted only.** Interrupted/resumed renders diverged slightly (SSIM 0.9987); cross-machine untested. Scope the claim; add interruption + golden-frame CI (M5).
- **A7. Critic is unvalidated** — 4 author-biased cases. Needs ≥20 independent-labelled cases before any aesthetic-quality claim.
