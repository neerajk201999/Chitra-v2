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

**M0 — research & architecture complete.** Six competitor/landscape deep-dives, five ADRs, motion language v0.1, roadmap to v1.0. Implementation (M1: the vertical slice) is next. See [docs/roadmap/roadmap.md](docs/roadmap/roadmap.md).

## Repository memory

This repo is built AI-first: all context an agent needs lives in version-controlled markdown. Start at [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md).
