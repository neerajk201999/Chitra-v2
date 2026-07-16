# Known Issues (v0.4.0 release candidate — 2026-07-17)

Honest ledger. Each item is scheduled (milestone) or explicitly accepted. Fixed items move to the adversarial review record ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).

1. **Render speed ~2 fps/worker** (screenshot mode, single browser, PNG disk round-trip). Scheduled: per-scene parallel sessions + static-frame dedup + Linux BeginFrame mode (M5). Mitigated by the per-scene cache (only dirty scenes re-render).
2. **No paint-settle guarantee** between `seek()` and screenshot beyond empirical determinism on macOS; Linux/CI golden-frame verification pending (M5). Determinism claims are same-machine only.
3. **Audio covers music + SFX + detected beat timing** (ADR-0007/0011/0027) — still no narration/voiceover timeline, energy-envelope property tracks, or clip-audio pass-through. Music-led final muxes are two-pass normalized and measured at −14 ±0.5 LUFS with true peak ≤−1.5 dBTP; beat detection, `at.onBeat`, and beat-cut gates are live. (M2 remainder.)
4. **VLM critic unproven**: ADR-0029 provides the review contract and ADR-0030
   provides blind-panel provenance, consensus, disagreement, consent, coverage,
   and separate agreement metrics. The four existing cases remain author-
   labelled and mostly static; the ≥20-case independent motion/audio study is
   not collected. The core validates declarations but cannot prove a reviewer
   was genuinely independent, expert, or blind (M2/M4).
5. **Expressiveness ceiling (partly closed)**: figures, video-in-scene,
   cursor/type choreography, real 3D primitives, DOM frame tracks, ADR-0028
   textured internal mesh/camera/light/exposure tracks, custom particles,
   one-level parent groups, and rights-gated source-assisted assets are built.
   Card Vault is still not exact: motion blur remains a measured gap, while
   local-coordinate/deeper comps, masks/mattes, blend modes, back/side textures,
   custom geometry/materials, and richer motif vocabulary remain typed-IR gaps.
6. **Temporal gates are bounded, not exhaustive.** ADR-0027 samples output
   frames at ≤250ms intervals plus animation/cut/transition neighborhoods.
   Shorter violations between those frames can still slip through; every-frame
   QA remains reserved for a benchmark that proves the added cost is necessary.
7. **Public distribution is not released yet.** The v0.4.0 release candidate,
   source/tarball installation, native Claude/Codex/Cursor manifests, `npx
   skills`, and an isolated install through a browser frame are verified;
   public access, registry installation, and three-harness outside-user timing
   remain release evidence (M3 exit).
8. **Distribution/parallel rendering unimplemented** (design in ADR-0002 consequences; M5).
9. **Ctrl-C mid-render** may briefly orphan the vendored Chrome process (no explicit signal handler).
10. **Example corpus is 2 scores**; agents compose better from a gallery (M3).
11. **Reference analysis is intentionally low-level.** FFmpeg scene scoring can
    miss soft edits or treat large motion as a cut; palette is quantized RGB;
    frame-difference energy is not optical flow; and ADR-0011 onset peaks can
    over-count musical beats in dense or continuous audio. Thresholds and
    analyzer methods are recorded in Style DNA, but ChitraBench accuracy and a
    separate evidence-linked semantic pass remain open (M4). Comparator 0.2 now
    adds exhaustive/sampled RGB MAE, PSNR, global-luma SSIM, named ROI summaries
    and cropped diffs, and audio-energy envelopes, but not local-window
    perceptual features, optical flow, semantic equivalence, speech/music
    understanding, automatic tracking, or calibrated preference.
12. **Creative conformance is structural, not semantic.** ADR-0018 now catches
    dropped sources/preferences/brand constraints, unresolved blockers,
    invented or reordered beats, missing shots/copy/heroes, and timing drift.
    It cannot prove that a governing idea, narrative, composition, or copy is
    professionally good. That requires calibrated Creative QA and blind labels.
13. **GitHub governance is only partly enforceable.** Vulnerability alerts are
    enabled, but branch protection is unavailable while this repository remains
    private on the current GitHub plan. Local and CI verification are green;
   public-repository branch protection must be re-evaluated after release.
14. **Asset provenance validates declarations, not ownership independently.**
    ADR-0023 binds rendered paths to locked Intake sources and blocks
    `reference-only`/`unknown` bytes, but it cannot verify whether a user's
    `owned` or `licensed` claim is legally correct or detect manually redrawn
    vector paths hidden in authored HTML. Human/legal review remains required.

## Integrity findings from the 2026-07-16 due-diligence audit (docs open until fixed)
- **A1. ✅ Figure text gate bypass fixed 2026-07-16 (ADR-0024).** Rendered figure DOM text now enters size, bounded-sample pixel contrast, safe-zone, reading-time, and overlap gates. The browser benchmark triggers all five and leaves a compliant control green. Rasterized text and sub-interval defects remain item 6.
- **A2. ✅ Three-instant sampling fixed 2026-07-16 (ADR-0027).** Release gates
  sample ≤250ms output-frame intervals plus choreography and transition
  neighborhoods, including cross-scene overlap and over-media contrast. This
  remains bounded rather than exhaustive as recorded in item 6.
- **A3. ✅ Bypassable final export fixed 2026-07-16 (ADR-0027).** `chitra release`
  enforces creative/static/rendered gates, stages target-safe outputs, renders,
  generates evidence, and writes a hash-bound receipt; `render` is diagnostic.
- **A4. ✅ Packaging launch blocker fixed 2026-07-16:** `main`/`types` point at `dist`, an `exports` map is present, and package/README/plugin identity is 0.4.0. Publishing and outside-tester install verification remain item 7.
- **A5. ✅ Final-mux audio invariant fixed 2026-07-16 (ADR-0027).** Music/SFX
  are losslessly premixed, two-pass normalized, AAC encoded, then measured;
  releases refuse music-led mixes outside −14 ±0.5 LUFS or above −1.5 dBTP.
- **A6. Determinism is same-machine-uninterrupted only.** Interrupted/resumed renders diverged slightly (SSIM 0.9987); two current Card Vault reruns are byte-identical, but an earlier same-day artifact differs at MAE 0.000095/SSIM 0.999909 with no isolated cause. Cold/warm and cross-machine equivalence remain unproven. Scope the claim; add clean-environment, interruption, and golden-frame CI (M5).
- **A7. Critic/study contracts fixed; critic quality remains unvalidated
  (ADR-0029/0030).**
  Reports now bind subject, method, evidence, domains, findings, principles,
  severity, and uncertainty; hidden labels penalize spam. The four cases remain
  author-biased. The independent-study path is executable, but needs ≥20 real
  labelled cases with motion and sound before any aesthetic-quality claim.
- **A8. Figure token-only CSS is not structurally enforced.** The sanitizer strips executable/external content and ADR-0024 gates rendered text, but raw CSS colours/fonts remain possible despite the authoring convention. Add a real CSS parser/token validator before claiming theme purity.
