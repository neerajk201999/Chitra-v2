# Agent Organization (v0.2 — post-research)

Chitra is operated by specialized agents, not one monolithic assistant. Two distinct agent systems exist and must not be confused:

## A. Build-time agents (who build Chitra)

The engineering organization that develops this repository across sessions:

| Role | Owns |
|---|---|
| CTO / Orchestrator | Roadmap, priorities, ADR approval, milestone gates |
| Research | Competitor/landscape analysis, papers, reference gathering |
| Architecture | System design, intermediate representations, ADRs |
| Implementation | Code, per current standards |
| QA / Reviewer | Adversarial review of every change; a second model reviews before merge when available |
| Benchmark | Reproducible benchmarks; regression detection |
| Documentation | Keeps repository memory current; lints for staleness |

Workflow per unit of work: read memory → plan → implement → adversarial review → benchmark → update memory → commit.

## B. Runtime agents (who make videos — the product)

The pipeline a user's coding agent executes when creating a video. Every stage emits a **diffable text artifact** and every stage can be re-run independently:

```
Brief (user prompt + brand context)
  → Research Director      — subject research, references, brand ingestion
  → Creative Director      — concept, tone, narrative arc, format choice
  → Story Architect        — script, scene list, pacing map
  → Design Director        — type system, color, layout grid, visual language
  → Shot Planner           — storyboard: per-scene composition and intent
  → Motion Director        — motion spec: choreography, easing, durations, transitions
  → Sound Director         — music, SFX, mix, audio-visual sync points
  → Compositor/Renderer    — deterministic render of the spec
  → Critics (parallel)     — Typography, Motion, Composition, Pacing, Slop, Brand,
                             Temporal-consistency — each watches the render and files findings
  → Editor                 — applies revisions from findings; loop until findings clear
  → Release Gate           — Quality Engine score + export validation
```

Design rules:

1. **Critique is recursive.** Every director's artifact is critiqued before the next stage consumes it; the rendered output is critiqued by *watching it* (VLM on frames + motion) — not by re-reading the spec.
2. **Revision is surgical.** Critics reference artifact spans; the Editor patches artifacts, not regenerates them. Only affected scenes re-render.
3. **Taste is data, not vibes.** Directors and critics read the encoded design language in `docs/motion/` — versioned rules with named values (type scales, easing families, duration ranges, pacing curves), so critique findings are objective and testable.
4. **Distribution:** the runtime pipeline ships as installable skills, single-sourced and compiled per harness — see ADR-0005.

ADR-0045 makes the Frame/Motion/Sound ownership boundary executable without
embedding an agent SDK. Frame Designers author a static `board.score.json`;
Motion Designers may add only choreography/transitions to
`motion.score.json`; Sound/Editor may add only root audio and
choreography-bound SFX to `score.json`. `chitra stage-check` rejects drift.
One host may perform all roles. Parallel Frame Designers operate only on
independently specified shots after the film-wide system is locked.

Resolved by research (2026-07-14): substrate → own Motion IR compiled to HTML/GSAP, renderer abstracted (ADR-0002); representation → two-tier IR (ADR-0003); critique design → three-layer Quality Engine with isolated critics and a ≤3-pass loop (ADR-0004); packaging → HyperFrames/Impeccable-style multi-harness skills over a deterministic no-LLM core (ADR-0005). Critic set for v0.1 is defined in the roadmap (M2).
