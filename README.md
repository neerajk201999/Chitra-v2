# Chitra

**The AI-native operating system for cinematic video creation.**

Install into your coding agent — Claude Code, Codex, Cursor, Gemini CLI — and direct videos that approach the quality of the best brand and product films, not "AI videos."

## Thesis

Every existing tool solves *rendering*. Chitra solves **taste**:

```
prompt → direction → design → motion → render → critique → revision → video
```

- A **two-tier Motion IR**: directorial intent + an executable, schema-validated score. Diffable, patchable, deterministic. (ADR-0003)
- A **tokenized motion language**: easing families, duration scales, pacing rules, register-aware rubrics — encoded design judgment, enforced in code. ([docs/motion](docs/motion/motion-language.md))
- A **Quality Engine that watches the render**: structural validation → deterministic gates → isolated VLM critics over rendered evidence → surgical revision, bounded at 3 passes. (ADR-0004)
- A **deterministic core** (compile → render → gate) with all reasoning in your agent's LLM — no API keys, no hosted service. (ADR-0002, ADR-0005)

## Status

**v0.3.0 — references become measurable inputs.** `chitra decompose` creates validated, deterministic Style DNA: source identity, shot rhythm, palette, luminance/saturation, frame-difference motion energy, audio onset landmarks, and evidence frames. Its [generated-fixture benchmark](benchmarks/reference-decomposer/results.md) reproduces exact known cuts and colors with byte-identical repeated JSON. Semantic intent stays explicitly unmeasured, and exact reconstruction still awaits the comparator. The existing closed loop retains its **10/10 measured catch rate** on the [seeded-defect benchmark](benchmarks/seeded-defects/results.md) and exact authored transforms remain covered by the [keyframe benchmark](benchmarks/keyframe-track/results.md).

## Use it from your coding agent

Requirements: Node 22.12+, ffmpeg on PATH.

```bash
git clone <this repo> chitra && cd chitra/core && npm install && npx tsc
node dist/cli/index.js probe   # verify environment
```

Then, in Claude Code / Codex / Cursor, point your agent at the repo and ask for a video — the agent entry point is [AGENTS.md](AGENTS.md), which routes to the `create-video` and `critique-video` skills. Claude Code users can also install the plugin from [.claude-plugin/plugin.json](.claude-plugin/plugin.json).

```bash
# what the agent runs under the hood
chitra init --style night --register brand-film --title "My film"   # gate-passing starter
chitra decompose reference.mp4 -o style-dna.json # measurable reference facts + evidence
chitra validate score.json      # schema + static gates (fast)
chitra check score.json         # + rendered-frame gates: contrast, safe zones, overlap, blanks
chitra frame score.json -t 1800 -o peek.png   # one-frame preview in seconds
chitra render score.json -o out.mp4 -q high   # refuses P1 findings; only dirty scenes re-render
chitra evidence score.json -o evidence/       # contact sheet + hero frames + cut strips
chitra clean                     # remove work artifacts
```

## Repository memory

This repo is built AI-first: all context an agent needs lives in version-controlled markdown. Builders start at [CLAUDE.md](CLAUDE.md); users' agents start at [AGENTS.md](AGENTS.md).

Contributors use one acceptance contract locally and in CI: `node scripts/verify.mjs` (`--quick` while iterating). See [CONTRIBUTING.md](CONTRIBUTING.md).
