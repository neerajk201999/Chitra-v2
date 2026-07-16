# Current State — read this after VISION

**Verified:** 2026-07-16 · **Package:** 0.3.0 · **Motion IR:** 0.1.0 · **Style DNA:** 0.1.0

This is the compact handoff for a fresh builder. It records current truth, not
history or aspiration. Detailed history belongs in the roadmap, ADRs, research,
and CHANGELOG.

## What is shipped

- Deterministic Score → HTML/GSAP → seek-driven browser frames → FFmpeg video.
- Direction and Score IRs, conformance gates, static/frame quality gates,
  evidence generation, content-addressed scene cache, and agent-facing skills.
- Images, frame-extracted video, sanitized UI figures, cursor/type interaction,
  particles, curated Three.js primitives, music/SFX, beat detection, and
  `at.onBeat` choreography.
- ADR-0013 frame-addressed transform tracks: typed X/Y, scale, 3-axis rotation,
  opacity, perspective, origin, and token easing.
- ADR-0015 Reference Decomposer: `chitra decompose` emits validated Style DNA
  with source hash/media facts, hard-cut rhythm, quantized palette,
  luminance/saturation, frame-difference energy, audio onsets, and shot evidence.
- Package 0.3.0 has valid `main`/`types`/`exports`; global-style tarball install
  and `chitra probe` have been exercised locally.
- Canonical skills are exposed through Claude Code, Codex, and Cursor manifests,
  `AGENTS.md`/`GEMINI.md`, and the cross-harness `npx skills` installer.

## Evidence, not claims

- Unit suite: 40 tests.
- Seeded deterministic defects: 10/10 caught.
- Keyframe browser benchmark: 3/3 exact authored states, backward seek passes,
  repeated same-frame PNG is byte-identical.
- Reference benchmark: generated 3-shot film finds both exact cut times and all
  three colors; bounded sampling holds; repeated Style DNA JSON and all three
  evidence frames are byte-identical.
- Both supplied references decomposed locally: the 274-frame card film produced
  1 continuous shot; the 81.6s Claude Design film produced 12 detected shots.
- Skill manifest and package dry-run are verified by the repository contract.
- Isolated tarball install proves the installed CLI can probe, initialize,
  validate, and capture a real browser frame.
- Claude Code and Codex marketplace installs pass in isolated config homes;
  `npx skills` places all three canonical skills for Claude Code, Codex,
  Cursor, and Gemini CLI.

Run `node scripts/verify.mjs` before merge. Use `--quick` only while iterating.

## Active product objective

Turn a prompt and any optional mix of references, images, links, screenshots,
footage, audio, brand material, preferences, and anti-references into explicit,
evidence-backed creative decisions and a gated film. Then prove competitive
quality through neutral ChitraBench runs. Creative Intelligence (ADR-0012)
remains the center of gravity; renderer work requires a specific target-film gap.

Ordered next slices:

1. Typed multimodal Brief/Intake IR → source ledger, user objective,
   preferences/anti-references, brand constraints, and evidence links.
2. Creative Director + Storyboard tiers with conformance gates, so planning and
   direction—not renderer improvisation—own the film.
3. Automated reference comparator → aligned frame/audio metrics plus visual
   diff artifacts; no “exact” claim without it.
4. Card Vault reconstruction benchmark → 274 authored frames and published
   metric results, exposing only capabilities the target proves missing.
5. Then, evidence-led compositor additions: masks/mattes, nested compositions,
   blend modes, motion blur, internal 3D tracks, and richer audio.

## Claim boundaries

- Chitra does not yet “beat Remotion/HyperFrames/EditFrame/Replit Video.” No
  neutral head-to-head benchmark has established that.
- Same-machine repeated-frame determinism is measured. Cross-machine golden
  equivalence, interrupted-render equivalence, and broad critic calibration are
  still open.
- Exact reconstruction of either supplied reference is not yet achieved.
- GitHub is private and `chitra-video` is unpublished; native manifests and
  isolated installs are verified, but public and three-harness outside-user
  installation are not.

## Invariants for every change

- ADR before architecture; schema before compiler; gate and benchmark with every
  new law/capability; compiler cache version changes with compiler output.
- No LLM calls in `core/`; no network access in render; no silent degradation.
- One coherent change per commit, with tests/evidence and memory updated in the
  same commit. Preserve user changes and keep rollback possible with `git revert`.

## Resume protocol

Read `VISION.md` → this file → roadmap → relevant ADR/code. Confirm the active
objective, run quick verification, write a bounded plan, and change the shared
root rather than patching callers. At handoff, update this file only when current
truth changed; do not turn it into a session diary.
