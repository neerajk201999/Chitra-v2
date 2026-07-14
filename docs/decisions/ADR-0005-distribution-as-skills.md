# ADR-0005: Distribution — installable skills for every coding agent, thin deterministic core

**Status:** Accepted · **Date:** 2026-07-14 · **Informed by:** docs/research/{hyperframes,impeccable,video-use,openmontage}.md

## Context

The product must be installable and usable from Claude Code, Codex, Gemini CLI, Cursor, OpenCode, and future agents. HyperFrames proved the model (four install channels, hash-manifested skills, lazy per-workflow install); Impeccable proved single-source skills compiled per-harness; video-use proved "SKILL.md is the program, small deterministic tools are the leaves."

## Decision

1. **Architecture split**: a **deterministic core** (CLI + library: IR validation, compiler, renderer, gates, evidence-sheet generation, asset tools) and a **skills layer** (the director pipeline, critics, workflows) that runs *inside the user's coding agent*. The host agent's LLM does all reasoning; our binaries never call model APIs themselves (video-use/OpenMontage pattern — no keys to manage, works in any harness, user pays their own inference).
2. **Single-source skills, compiled per harness** (Impeccable's build): one canonical skill source → Claude Code plugin (marketplace + SKILL.md), Cursor rules, Codex/Gemini manifests, plain `skills.sh` install. Hash manifest, versioned, lazy install per workflow.
3. **Skill topology** (HyperFrames-informed, critique-extended): a **router skill** (intake → format/register decision → workflow dispatch) · **workflow skills** (product-launch, feature-demo, social-short, …: end-to-end, stage-gated) · **domain skills** (motion language, IR contract, quality rubrics — read by both directors and critics) · **critic skills** (Quality Engine layer 3, isolated per ADR-0004).
4. **Sub-agent contracts**: parallel per-scene work uses self-contained briefs with explicit "you do NOT decide X" boundaries (HyperFrames' strongest orchestration pattern), citing named rules from the motion language, never restating them.

## Alternatives considered

- **Own orchestrator daemon / API service calling LLMs.** Rejected for v1: kills install-anywhere, adds key management, competes with the harness instead of riding it. Revisit only for a hosted render farm later.
- **Library-only (no skills), like Remotion.** Rejected: the direction/critique intelligence *is* the product; a library alone reproduces Remotion's blank-canvas problem.

## Consequences

- Works day one in every major harness; inference cost and model choice belong to the user.
- Prompt engineering becomes versioned product surface: skills live in the repo, are diffable, and get the same review/benchmark bar as code (prompt standards in `docs/standards/`).
- Core CLI must be exceptional headlessly: single-command `check` (validate + gates + render probe), machine-readable output, non-interactive by default.
