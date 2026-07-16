---
name: critique-video
description: Run an isolated design critique over a rendered Chitra video's evidence (contact sheet, hero frames, cut strips). Use when asked to review, critique, or QA a video or its evidence directory. Produces severity-tagged findings mapped to Motion IR paths.
---

# Chitra · Critique Video

You are an **isolated critic**. Judge the watched/rendered result before reading intent. Do **not** read gate output, prior critiques, calibration labels, or anyone else's findings before forming your own (anchoring destroys critique value). After the first visual judgment, read `direction.json` and `storyboard.json`—intent is the standard you judge execution against. Read `docs/creative/craft-model.md` for the multidisciplinary `CR-*` principles and use the typed contract in `core/src/creative/review.ts`.

## Inputs
A rendered video when available; its evidence directory (`contact-sheet.png`, `hero-*.png`, `cut-strips.png`); optionally audio evidence, `direction.json`, `storyboard.json`, and `score.json` (for IR paths only, after first watch). Record a SHA-256 digest of the reviewed video or canonical review bundle so the report cannot float away from its subject.

For a video file, a portable digest command is:

```bash
node -e 'const f=require("fs"),c=require("crypto");const h=c.createHash("sha256");h.update(f.readFileSync(process.argv[1]));console.log(h.digest("hex"))' path/to/video.mp4
```

## Method — in this order, one dimension at a time

**1 · First watch.** Watch the full film once without pausing. If the video is unavailable, read the contact sheet top to bottom once and record that limitation. Write one sentence: what is this film, and does it build to anything? If you can't tell, that's a P1 on narrative, not a style note.

**2 · Narrative & direction.** Is there one premise, causal tension/change/resolution, an earned payoff, and a governing idea that decides what belongs? Name what the film makes you feel before comparing it with the intended feeling.

**3 · Composition & hierarchy** (hero frames). One clear focal point per frame? Does the eye land where the scene's `heroMoment` says it should? Balance, breathing room, intentional asymmetry. Elements clipped by frame edges or crowding safe margins.

**4 · Typography.** Hierarchy legible at realistic viewing size? Line breaks sane (no widows/orphans in display type)? Does type carry the intended voice and reading cadence? Any text that needs squinting is a P1.

**5 · Color, light & material.** Palette coherent across scenes? Does brightness/saturation spend attention on the hero? Does light model depth and material, or flatten it? Text legible over every backdrop it crosses? Gradients smooth—no banding or effect seams?

**6 · Motion & camera** (watch clips; frame sequences are fallback evidence). Can you infer what moved and why? Do timing/physics fit property, distance, scale, and material? Does choreography vary energy and include rest? Is spatial continuity stable? “Everything fades in” is uniformity slop (P2). Anything still mid-animation at the cut is P1.

**7 · Edit** (video + cut strips). Judge emotion and story before rhythm, eye trace, and continuity. For each boundary: why this frame, where does the eye re-land, did the outgoing moment get air, is the next frame composed, and did sound lead/punctuate/bridge/drop out? Flag metronomic cutting, overcoverage, and decorative transitions.

**8 · Sound.** When audio is available, judge voice performance, music/voice/effect hierarchy, sync, sonic perspective, motifs, dynamics, silence, intelligibility, fatigue, and the emotional close. If audio is unavailable or the film is intentionally silent, mark sound `not-assessed` with the exact reason—never invent a pass.

**9 · Brand, truth & access.** Could this survive a logo swap? Are product behavior, claims, data, and demonstration truthful and readable? Does meaning survive reduced motion, limited hearing, and realistic channel size?

**10 · Two-altitude slop test.** First order: could you guess this aesthetic from the category alone? Second order: could you guess its fashionable evasion? Both yes → P1 under `CR-SLOP-1` with a named redirect.

**11 · Intent and holistic match.** For each shot: does the render deliver `shotIntent`, composition, planned hero, camera meaning, copy hierarchy, and feeling? Do narrative, image, motion, edit, and sound feel authored as one system?

## Output contract

Write `creative-review.json` conforming exactly to Creative Review 0.1 in
`core/src/creative/review.ts`, then run:

```bash
chitra review-validate creative-review.json
```

Requirements:

- Record the subject digest and critic model/run provenance.
- Keep `deterministicFindingsSeenBeforeVisual:false`; otherwise this was not an isolated review and must be rerun.
- Include every domain in `REVIEW_DOMAINS` exactly once. Use `not-assessed` plus a concrete reason when evidence cannot support judgment.
- Every assessed domain and finding cites evidence IDs from the report's evidence catalog.
- Every finding cites 1–3 `CR-*` principles and states observation, consequence, concrete fix, and expected effect. Never file “make it more polished.”
- Keep at most 12 findings and rank at most 5 priorities. More output is not more judgment.
- Record uncertainty; static contact sheets cannot prove easing feel, sound quality, or every-frame continuity.

Calibration: most competent videos deserve `revise` with a few prioritized findings. `ship` with zero findings is rare and suspicious—recheck distinctness and the two-altitude test. Never inflate: P1 means “block release.” `redirect` means the premise/direction is wrong enough that polishing the current execution wastes effort.
