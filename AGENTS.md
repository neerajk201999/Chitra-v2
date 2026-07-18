# Chitra — Agent Entry Point

Chitra creates cinematic motion-design videos: you direct through four JSON artifacts, a deterministic core validates/renders/gates, then you critique the rendered evidence and revise.

**To create a video:** follow [skills/create-video/SKILL.md](skills/create-video/SKILL.md) exactly — `intake.json` → locked provenance → `direction.json` → `storyboard.json` → `score.json` → draft render → evidence → critique (≤3 passes) → `chitra release` + verified receipt.

**To critique a render:** follow [skills/critique-video/SKILL.md](skills/critique-video/SKILL.md) — watch before reading intent or gates; emit an evidence-bound Creative Review 0.1 with `CR-*` principles, fixes, expected effects, and uncertainty.

**Toolchain:** use installed `chitra <capabilities|intake|transcript-lock|transcript-pack|edit-check|edit-render|edit-evidence|decompose|compare|plan|board|conform|creative-check|review-validate|review-score|review-calibrate|memory-validate|memory-context|validate|check|render|evidence|release|verify-release|probe>`. Repository development may use `node core/dist/cli/index.js`. Requires FFmpeg and a system Chromium-family browser.

**The law:** [docs/motion/motion-language.md](docs/motion/motion-language.md) — tokens and MO-rules cited by ID. IR reference: [core/src/ir/schema.ts](core/src/ir/schema.ts) (zod, authoritative). Working example: [examples/launch-film/score.json](examples/launch-film/score.json).

If you are developing Chitra itself (not using it), read [CLAUDE.md](CLAUDE.md) instead.
