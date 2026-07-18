# Known Issues (v0.5.0 release candidate — 2026-07-18)

Honest ledger. Each item is scheduled (milestone) or explicitly accepted. Fixed items move to the adversarial review record ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).

1. **Release render speed remains ~2 fps/worker** (screenshot mode, single
   browser, PNG disk round-trip). ADR-0031 makes diagnostic preview a separate
   ≤12fps JPEG profile: the 9.6s fixture renders 115 frames in 8.1s with 3.0 MiB
   cache. Full-fps release still needs streaming/chunking or a new backend (M5).
2. **No paint-settle guarantee** between `seek()` and screenshot beyond empirical determinism on macOS; Linux/CI golden-frame verification pending (M5). Determinism claims are same-machine only.
3. **Audio covers music + SFX + detected beat timing and transcript-edited clip
   audio** (ADR-0007/0011/0027/0034). `edit-render` preserves source audio,
   synthesizes silence for mixed silent clips, applies cut fades, and normalizes
   its bus; Score video elements remain visual-only. There is still no TTS/
   narration generation adapter, energy-envelope property track, or automatic
   word-aligned overlay sync. Music-led release muxes remain measured at −14
   ±0.5 LUFS with true peak ≤−1.5 dBTP. (M2 remainder.)
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
7. **Outside-user cold starts are only partly measured.** The first Cursor run
   exposed sandbox clone retries, a 539 MB Puppeteer cache/corrupt extraction,
   non-executable CLI, false-green probe, five-minute draft, and disk exhaustion.
   ADR-0031 fixes those paths in the 0.5.0 release candidate; ADR-0033 then
   reduces the local isolated install from 93.7 to 62.8 MiB. The local warm-
   cache install is 1.4s with zero browser bytes and the complete first-frame
   check is 6.5s. ADR-0037's public GitHub preview downloads, SHA-verifies, and
   installs in 3.9s/62.9 MiB, then completes the real first-frame transaction in
   11.7s on this machine with warm npm dependencies.
   A cold public-registry retest and independent cross-OS/harness runs remain.
   Public GitHub access, `chitra-video@0.4.0`, an unauthenticated clone,
   isolated registry install/probe, SHA-pinned 0.5.0 preview install, native
   Claude/Codex/Cursor manifests, and `npx skills` are verified.
   Three independent users across three harnesses remain the M3 exit gate.
8. **Distribution/parallel rendering unimplemented** (design in ADR-0002 consequences; M5).
9. **Ctrl-C mid-render** may briefly orphan the launched system-browser process
   (no explicit signal handler).
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
13. **GitHub governance has a single-maintainer ceiling.** Vulnerability alerts
    and private reporting are enabled. Protected `main` requires current
    `verify` CI and resolved conversations, enforces rules for admins, and
    blocks force pushes/deletion; independent review and maintainer redundancy
    remain unavailable with one maintainer.
14. **Asset provenance validates declarations, not ownership independently.**
    ADR-0023 binds rendered paths to locked Intake sources and blocks
    `reference-only`/`unknown` bytes, but it cannot verify whether a user's
    `owned` or `licensed` claim is legally correct or detect manually redrawn
    vector paths hidden in authored HTML. Human/legal review remains required.
15. **Revision Memory has a proven contract, not proven taste lift.** ADR-0032
    isolates project/brand scope, requires evidence for accepted revisions, and
    compiles bounded deterministic context, but its benchmark is synthetic. No
    outside-user corpus yet shows that retrieval improves watched work.
16. **Major user-job parity gaps remain.** ADR-0034/0035 close the first
    transcript/clip-audio EDL and requested visual/audio evidence slices, but
    Chitra has no bundled transcription, deterministic semantic cut judgment,
    visual-event addressing outside transcript tokens, TTS/narration generation,
    Lottie/Rive import, masks/mattes/blend modes/deep
    local comps, mature player/studio, or distributed renderer. “All competitor
    capabilities” is not a current claim.
17. **Directorial search has integrity evidence, not taste evidence.** ADR-0036
    enforces two to four distinct locked Directions, comparable probe roles,
    identity-free packets, complete selection records, evidence re-hashing, and
    duplicate detection. Questions can still be paraphrased to hide conceptual
    sameness; RGB MAE only detects near-identical pixels; declarations cannot
    prove a reviewer was blind; stills cannot prove motion or sound; and no
    independent corpus shows that the selected Direction is professionally good.

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
