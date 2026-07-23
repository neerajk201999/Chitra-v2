# System Overview

Governing decisions: ADR-0002 (substrate), ADR-0003 (Motion IR), ADR-0004
(Quality Engine), ADR-0005 (distribution), ADR-0017 (Intake), ADR-0018
(creative ladder), ADR-0036 (still-first Direction selection), ADR-0042
(typed compositing and local compositions).

```
                        USER'S CODING AGENT (Claude Code / Codex / Cursor / Gemini CLI)
                        runs the skills layer; does all LLM reasoning
┌──────────────────────────────────────────────────────────────────────────────┐
│  SKILLS LAYER (installable, per-harness compiled)                            │
│                                                                              │
│  Router ──► Workflow (product-launch │ feature-demo │ social-short │ …)      │
│                │                                                             │
│    Direction pipeline (each stage emits/patches IR artifacts):               │
│    Research ► Creative Director ► Story Architect ► Design Director          │
│    ► Shot Planner ► Motion Director ► Sound Director                        │
│                │                                          ▲                  │
│                ▼                                          │ patches          │
│    Intake ► 2–4 Directions ► blind still selection ► Storyboard             │
│                │                              │                              │
│                │                              ▼                              │
│                │                 all-shot board ► animatic when useful       │
│                │                              │                              │
│                │                              ▼                              │
│                │                     hero motion test ► Score                │
│                │                                          ▲                  │
│                ▼                                          │ findings         │
│         ┌── deterministic core ──┐              Critics (isolated VLM        │
│         │ validate → compile →   │              or human pass; watch evidence│
│         │ render → gates →       │ ──────────►  sheets from the render)      │
│         │ evidence sheets        │              ≤3 revision passes           │
│         └─────────────────────── ┘                                           │
│                │                                                             │
│                ▼                                                             │
│        Release gate (0 hard defects; style flags audited) ─► export+receipt │
└──────────────────────────────────────────────────────────────────────────────┘

DETERMINISTIC CORE (CLI + library; no LLM calls; the only thing that touches pixels)
  intake/    multimodal source/provenance contract and deterministic locking
  brand/     reusable locked rules/palette/typography plus local-font evidence
  creative/  bounded Direction search, identity-free still evidence, blind
             selection receipts, review/calibration, and scoped revision memory
  editing/   locked word transcripts → compact phrase context → typed EDL →
             normalized audio-preserving plates + requested-range filmstrip/
             waveform/cut evidence + hash receipts
  ir/        Direction, Storyboard, and Score schemas, validation, versioning
  motion/    token registry: easing families, duration scale, stagger patterns,
             transition types, register definitions (machine-readable mirror of docs/motion/)
  compile/   IR → HTML/CSS/GSAP page (stable IDs, one paused master timeline,
             seeded randomness, font pinning, typed appearance layer, bounded
             local compositions) — determinism is a compiler obligation
  render/    backend interface; v0: system Chrome seek/capture → frame cache →
             FFmpeg encode; content hashes make sequential dirty-scene reuse possible
  gates/     Quality Engine layers 1–2 (ID-tagged rules, thresholds from motion/)
  evidence/  contact sheets: filmstrip @ cut boundaries + waveform + timing labels;
             per-scene hero frames (input for VLM critics)
  audio/     beat grid extraction, final-bus loudness, mix, and sync points
  assets/    fonts, images, footage ingest (hashing, license provenance)
```

The board and animatic reuse Score rather than introducing another planning IR:
`board.score.json` has final compositions and little or no choreography;
`score.json` adds proven motion. The animatic is optional because it retires
timing/editorial risk, not because every film needs a ceremony.

## Data flow invariants

1. Everything between stages is a **diffable text artifact** (IR JSON + markdown direction). No stage communicates through prose-only handoffs.
2. The renderer is designed as a function of IR, assets, seeds, compiler, browser,
   FFmpeg, and platform state. Same-machine repeated-frame identity is measured;
   cross-machine, interruption, and browser-version equivalence remain open.
3. Critics see **rendered evidence**, never only the spec; the Editor patches **IR spans**;
   content-addressed scene caches avoid recapturing unchanged scenes.
4. Creative hypotheses live in the constitution/craft/motion systems and remain
   distinct from calibrated evidence. Skills cite stable rules; they do not
   turn unvalidated taste opinions into automatic scores.
5. Gate priority and release policy are independent. P1/P2/P3 orders attention;
   `hard-defect` blocks delivery and `style-flag` never vetoes authored form.
   Required-copy context can promote a legibility symptom to a hard defect.

## Repository layout (target)

```
chitra/
├── CLAUDE.md / AGENTS.md      # session entry points (routing to memory)
├── VISION.md
├── docs/                      # repository memory (see ADR-0001)
├── core/                      # deterministic core (TypeScript; single package to start)
├── skills/                    # single-source skills → compiled per harness
│   ├── router/  workflows/  domain/  critics/
├── styles/                    # house styles / design presets (remixable)
├── benchmarks/                # ChitraBench: briefs, rubrics, scoring harness, results
└── examples/                  # flagship videos: brief → IR → render, reproducible
```

Monorepo splitting, plugin registry, and the WebCodecs backend are deliberately deferred (see roadmap).
