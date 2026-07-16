# Chitra

**The AI-native operating system for cinematic video creation.**

Install into your coding agent — Claude Code, Codex, Cursor, Gemini CLI — and direct videos that approach the quality of the best brand and product films, not "AI videos."

## Thesis

Every existing tool solves *rendering*. Chitra solves **taste**:

```
prompt + optional sources → intake → direction → storyboard → motion → render → critique → revision → video
```

- A **four-tier creative ladder**: locked Intake → Direction → Storyboard → an
  executable Motion IR Score, with deterministic conformance at every boundary.
  Diffable, patchable, and model-neutral. (ADR-0017, ADR-0018)
- A **tokenized motion language**: easing families, duration scales, pacing rules, register-aware rubrics — encoded design judgment, enforced in code. ([docs/motion](docs/motion/motion-language.md))
- A **Quality Engine that watches the render**: structural validation → deterministic gates → isolated VLM critics over rendered evidence → surgical revision, bounded at 3 passes. (ADR-0004)
- A **deterministic core** (compile → render → gate) with all reasoning in your agent's LLM — no API keys, no hosted service. (ADR-0002, ADR-0005)

## Status

**v0.3.0 — typed intake, measurable references, and portable agent workflows.**
`chitra intake` preserves objectives, mixed-source provenance, preferences,
anti-references, brand constraints, assumptions, and evidence as locked JSON;
the [intake benchmark](benchmarks/intake/results.md) verifies deterministic local
fingerprints and explicit unlocked URLs. `chitra decompose` creates deterministic
Style DNA and evidence; the [generated-fixture benchmark](benchmarks/reference-decomposer/results.md)
reproduces exact known cuts/colors with byte-identical JSON and frames. The same
Direction 0.2 and Storyboard 0.1 contracts preserve concept and shot intent; the
[creative-ladder benchmark](benchmarks/creative-ladder/results.md) catches three
seeded intent drifts across the complete chain. The same
canonical skills install through Claude Code, Codex, Cursor, Gemini CLI, or
`npx skills`, while an [isolated install benchmark](benchmarks/cold-start/results.md)
proves the packaged CLI through a real browser frame. Semantic intent and exact
reconstruction remain honestly open. The closed loop retains its **10/10
measured catch rate** on the [seeded-defect benchmark](benchmarks/seeded-defects/results.md).

## Use it from your coding agent

Requirements: Node 22.12+, ffmpeg on PATH.

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
npm install -g ./core
chitra probe
```

Open this repository directly in your agent, or from another project run
`npx skills add /absolute/path/to/Chitra-v2 --skill '*' --copy --yes`.

The repository is currently private and the npm package is not published; the
source commands require GitHub access. See the honest, tested platform matrix in
[Install and use Chitra](docs/INSTALL.md), including Claude Code and Codex plugin
commands, Cursor/Gemini skills installation, sample prompts, and release blockers.

Then ask for the outcome in your own language. A plain direction prompt is
enough; references, images, links, screenshots, footage, audio, brand material,
preferences, and anti-references are optional inputs—not mandatory ceremony.

```bash
# what the agent runs under the hood
chitra intake intake.json -o intake.lock.json # validate + fingerprint supplied sources and evidence
chitra creative-check intake.lock.json direction.json storyboard.json score.json # preserve intent across every tier
chitra init --style night --register brand-film --title "My film"   # gate-passing starter
chitra decompose reference.mp4 -o style-dna.json # measurable reference facts + evidence
chitra validate score.json      # schema + static gates (fast)
chitra check score.json         # + rendered-frame gates: contrast, safe zones, overlap, blanks
chitra frame score.json -t 1800 -o peek.png   # one-frame preview in seconds
chitra render score.json -o out.mp4 -q high   # refuses P1 findings; only dirty scenes re-render
chitra evidence score.json -o evidence/       # contact sheet + hero frames + cut strips
chitra clean                     # remove work artifacts
```

Start from [examples/intake/intake.json](examples/intake/intake.json) when an
agent needs the complete Intake shape.

## Repository memory

This repo is built AI-first: all context an agent needs lives in version-controlled markdown. Builders start at [CLAUDE.md](CLAUDE.md); users' agents start at [AGENTS.md](AGENTS.md).

Contributors use one acceptance contract locally and in CI: `node scripts/verify.mjs` (`--quick` while iterating). See [CONTRIBUTING.md](CONTRIBUTING.md).
