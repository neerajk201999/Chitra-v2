# Chitra

**The AI-native operating system for cinematic video creation.**

Install into your coding agent — Claude Code, Codex, Cursor, Gemini CLI — and direct videos that approach the quality of the best brand and product films, not "AI videos."

## Thesis

Every existing tool solves *rendering*. Chitra solves **taste**:

```
prompt + optional sources → intake → bounded direction search → storyboard → motion → render → critique → revision → video
```

- A **four-tier creative ladder**: locked Intake → Direction → Storyboard → an
  executable Motion IR Score, with deterministic conformance at every boundary.
  Diffable, patchable, and model-neutral. (ADR-0017, ADR-0018)
- A **tokenized motion language**: easing families, duration scales, pacing rules, register-aware rubrics — encoded design judgment, enforced in code. ([docs/motion](docs/motion/motion-language.md))
- A **Quality Engine that watches the render**: structural validation → deterministic gates → isolated VLM critics over rendered evidence → surgical revision, bounded at 3 passes. (ADR-0004)
- A **deterministic core** (compile → render → gate) with all reasoning in your agent's LLM — no API keys, no hosted service. (ADR-0002, ADR-0005)

## Status

**v0.6.0-rc.1 — native Frame Systems and role-safe production handoffs.**
`chitra intake` preserves objectives, mixed-source provenance, preferences,
anti-references, brand constraints, assumptions, and evidence as locked JSON;
the [intake benchmark](benchmarks/intake/results.md) verifies deterministic local
fingerprints and explicit unlocked URLs. `chitra decompose` creates deterministic
Style DNA and evidence; the [generated-fixture benchmark](benchmarks/reference-decomposer/results.md)
reproduces exact known cuts/colors with byte-identical JSON and frames. The same
Direction 0.3 and Storyboard 0.1 contracts preserve concept, capability fit, and shot intent; the
[creative-ladder benchmark](benchmarks/creative-ladder/results.md) catches three
seeded intent drifts across the complete chain. The same
`chitra compare` adds exhaustive frame-index evidence for compatible films and
explicitly non-exhaustive normalized comparison for unlike cuts; its
[generated benchmark](benchmarks/reference-comparator/results.md) proves
deterministic reports/diffs and catches visual drift. The same
canonical skills install through Claude Code, Codex, Cursor, Gemini CLI, or
`npx skills`, while an [isolated install benchmark](benchmarks/cold-start/results.md)
proves the packaged CLI through a real browser frame. Semantic intent and exact
reconstruction remain honestly open. ADR-0029 now makes multidisciplinary
creative judgment typed and evidence-bound; its contract benchmark passes, but
professional taste remains unproven pending independent calibration. The closed loop retains its **10/10
measured catch rate** on the [seeded-defect benchmark](benchmarks/seeded-defects/results.md).
ADR-0032 now retains explicit accepted/rejected/reverted revision outcomes at
project or brand scope and compiles only relevant guidance under a hard context
budget; its synthetic benchmark proves isolation and determinism, not taste lift.
ADR-0034/0035 add provider-neutral word-addressed footage editing and bounded
requested-range filmstrips, waveforms, adjacent-cut strips, and neutral
discontinuity facts. These make exact editorial decisions inspectable without
loading whole videos; they do not prove semantic cut quality. ADR-0036 adds a
still-first search transaction: compare two to four materially different
Directions through identity-free probes before paying to animate one. Its
contract and integrity benchmark pass; its creative choices remain uncalibrated.
ADR-0045 adds deterministic free/stack/grid frame composition, bounded optical
type treatments, rendered focal/reading/alignment/gap contracts, and staged
board→motion→sound ownership over one Score. Its browser benchmark proves
geometry, drift rejection, and backward-seek identity—not professional taste or
general HyperFrames superiority.

## Use it from your coding agent

Requirements: Node 22.12+, FFmpeg on `PATH`, and Chrome/Chromium/Edge.

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
npm install --prefix ./core
npm pack ./core --pack-destination .
npm install -g ./chitra-video-0.6.0-rc.1.tgz
npx skills add . --skill '*' --copy --global --yes
chitra probe
```

Open your video project in the coding agent. npm supplies the deterministic CLI;
the skills installer supplies the progressive creative workflow. Clone the full
repository only for development/examples. See [Install and use Chitra](docs/INSTALL.md)
for explicit Claude Code, Codex, Cursor, and Gemini CLI commands, or [run the
friend test](docs/quickstarts/README.md) with two ready-to-use prompts and a
compact feedback checklist.

The source-matched command above is the supported ADR-0045 test path until the
exact protected-main `0.6.0-rc.1` package is published and independently
reinstalled. The older SHA-256-verified
[`0.5.0` artifact](https://github.com/neerajk201999/Chitra-v2/releases/download/v0.5.0-rc.4/chitra-video-0.5.0.tgz)
must not be paired with current-main skills: it has no Frame System fields or
`stage-check`.

Then ask for the outcome in your own language. A plain direction prompt is
enough; references, images, links, screenshots, footage, audio, brand material,
preferences, and anti-references are optional inputs—not mandatory ceremony.

```bash
# what the agent runs under the hood
chitra intake intake.json -o intake.lock.json # validate + fingerprint supplied sources and evidence
# optional, only when the user wants reusable evidence-backed brand constraints:
chitra brand-lock brand.json --project . -o brand.lock.json # lock only the supplied/approved rules, palette, type, and font bytes
chitra brand-conform brand.lock.json intake.lock.json direction.json score.json # prove those chosen brand facts reach Score
chitra transcript-lock transcript.json -o transcript.lock.json --project . # bind word timing to exact footage
chitra transcript-pack transcript.lock.json -o transcript-pack.md --project . # compact agent reading surface
chitra edit-check transcript.lock.json edit.json --project . # quote/word/source conformance
chitra edit-render transcript.lock.json edit.json --project . -o assets/edit.mp4 -q draft # preserve clip audio
chitra edit-evidence transcript.lock.json edit.json --project . -o edit-evidence --segment opening proof # targeted picture/sound evidence
chitra direction-search-lock intake.lock.json search.json --project . -o search.lock.json # bind 2–4 candidate Directions
chitra direction-probes intake.lock.json search.lock.json --project . -o direction-probes # identity-free comparable stills
chitra direction-select direction-probes/SEARCH_DIGEST/manifest.json selection.json -o selection-receipt.json # re-hash evidence and resolve exact winner
chitra creative-check intake.lock.json direction.json storyboard.json score.json # preserve intent across every tier
chitra stage-check board.score.json motion.score.json --transition board-to-motion # motion cannot redesign approved frames
chitra stage-check motion.score.json score.json --transition motion-to-master # sound cannot retime/redesign motion
chitra init --style night --register brand-film --title "My film"   # gate-passing starter
chitra decompose reference.mp4 -o style-dna.json # measurable reference facts + evidence
chitra compare reference.mp4 out.mp4 -o comparison.json --evidence comparison-evidence
chitra validate score.json      # schema + static gates (fast)
chitra capabilities --json      # feasibility truth before Direction
chitra check score.json         # + rendered-frame gates: contrast, safe zones, overlap, blanks
chitra frame score.json -t 1800 -o peek.png   # one-frame preview in seconds
chitra evidence score.json -o evidence/       # contact sheet + hero frames + cut strips
chitra render score.json -o draft.mp4 -q draft # 12fps half-resolution diagnostic; only dirty scenes re-render
chitra review-validate creative-review.json   # validate isolated, evidence-bound judgment
chitra review-score labels-v2.json creative-review.json --case uniform-monotony
chitra review-calibrate study.json -o calibration-result.json # independent panel/candidate agreement
chitra memory-validate revision-memory.json # validate accepted/rejected outcome history
chitra memory-context revision-memory.json --brand acme --max-chars 6000 # bounded relevant memory
chitra release intake.lock.json direction.json storyboard.json score.json -o out/final.mp4 -e out/evidence -r out/release.json # add --brand brand.lock.json for brand-bound Scores
chitra verify-release out/release.json         # reject changed inputs, assets, output, or evidence
chitra clean                     # remove work artifacts
```

Start from [examples/intake/intake.json](examples/intake/intake.json) when an
agent needs the complete Intake shape, and
[examples/brand-system/brand.json](examples/brand-system/brand.json) when brand
rules, palette, or typography must remain reusable and enforceable.

## Repository memory

This repo is built AI-first: all context an agent needs lives in version-controlled markdown. Builders start at [CLAUDE.md](CLAUDE.md); users' agents start at [AGENTS.md](AGENTS.md).

Contributors use one acceptance contract locally and in CI: `node scripts/verify.mjs` (`--quick` while iterating). See [CONTRIBUTING.md](CONTRIBUTING.md).
