# Critic Calibration (M2 exit, aesthetic half)

Measures whether the VLM critic (`skills/critique-video`) catches defects the deterministic gates **cannot**: motion monotony, category-guessable slop aesthetics, intent/hierarchy failures — while staying quiet on a clean control.

## Protocol

1. `node benchmarks/critic-calibration/build.mjs` — regenerates the 4 cases and their evidence (each case passes deterministic gates by construction; the builder fails loudly if a P1 leaks in).
2. For each case in `cases/<name>/`, run a **fresh, isolated** critic session following `skills/critique-video/SKILL.md` on the render/evidence (+ Direction/Storyboard where present). The critic must not see either labels file, other cases' results, or this README's case descriptions. Save a Creative Review 0.1 JSON and validate it with `chitra review-validate`.
3. Score each report against the matching hidden case in `labels-v2.json` using `chitra review-score labels-v2.json <review.json> --case <case-id>`. Principle IDs, severity, verdict, maximum severity, and finding budget are deterministic. Record the critic model/version and date in `runs/run-NNN.md`.

`labels.json` is the legacy semantic-gist contract retained for run-001 history;
new runs use `labels-v2.json`.

## Interpreting runs

- **mustFind hits < 4/4** → the rubric under-detects; sharpen the relevant dimension in the skill and re-run.
- **False positives on the control** → the rubric over-triggers; recalibrate ("most competent videos deserve revise with 2–6 findings" may need tightening).
- Finding-budget or severity-budget failure catches critic spam/over-triggering.
- Improvements to the skill must cite run numbers — rubric changes without measurement are vibes.

## Known limitations (be honest when quoting numbers)

- 4 cases is a smoke test, not a benchmark. Grow toward ~20 cases across registers before publishing agreement stats.
- Labels are **author-labeled** (the case designer wrote the ground truth). Independent human labels are required before any public claim about critic reliability.
- Static evidence cannot expose easing *feel* or sound craft; new cases need motion clips and audio evidence.
