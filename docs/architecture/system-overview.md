# System Overview

Governing decisions: ADR-0002 (substrate), ADR-0003 (Motion IR), ADR-0004
(Quality Engine), ADR-0005 (distribution), ADR-0017 (Intake), ADR-0018
(creative ladder).

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
│    Intake ► Direction ► Storyboard ► Score          Editor (surgical)        │
│                │                                          ▲                  │
│                ▼                                          │ findings         │
│         ┌── deterministic core ──┐              Critics (isolated VLM        │
│         │ validate → compile →   │              sub-agents; watch evidence   │
│         │ render → gates →       │ ──────────►  sheets from the render)      │
│         │ evidence sheets        │              ≤3 revision passes           │
│         └─────────────────────── ┘                                           │
│                │                                                             │
│                ▼                                                             │
│        Release gate (0 P0/P1 + gates green) ──► export + delivery report     │
└──────────────────────────────────────────────────────────────────────────────┘

DETERMINISTIC CORE (CLI + library; no LLM calls; the only thing that touches pixels)
  intake/    multimodal source/provenance contract and deterministic locking
  editing/   locked word transcripts → compact phrase context → typed EDL →
             normalized audio-preserving footage plates + hash receipts
  ir/        Direction, Storyboard, and Score schemas, validation, versioning
  motion/    token registry: easing families, duration scale, stagger patterns,
             transition types, register definitions (machine-readable mirror of docs/motion/)
  compile/   IR → HTML/CSS/GSAP page (stable IDs, one paused master timeline,
             seeded randomness, font pinning) — determinism is a compiler obligation
  render/    backend interface; v0: headless Chrome CDP BeginFrame seek → PNG frames
             → FFmpeg encode; per-scene content-hash cache → incremental & parallel
  gates/     Quality Engine layers 1–2 (ID-tagged rules, thresholds from motion/)
  evidence/  contact sheets: filmstrip @ cut boundaries + waveform + timing labels;
             per-scene hero frames (input for VLM critics)
  audio/     beat grid extraction, final-bus loudness, mix, and sync points
  assets/    fonts, images, footage ingest (hashing, license provenance)
```

## Data flow invariants

1. Everything between stages is a **diffable text artifact** (IR JSON + markdown direction). No stage communicates through prose-only handoffs.
2. The render is a **pure function** of (IR, assets, seeds). Same input → identical frames.
3. Critics see **rendered evidence**, never only the spec; the Editor patches **IR spans**, never regenerates whole artifacts; only **dirty scenes** re-render.
4. Taste lives in **one place** (`docs/motion/` + its machine-readable mirror) and is *referenced by name* everywhere else — skills cite rules, never restate them.

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
