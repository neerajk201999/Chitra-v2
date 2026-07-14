# ADR-0001: The repository is the long-term memory

**Status:** Accepted · **Date:** 2026-07-14

## Context

Chitra is built primarily by AI coding agents across many sessions. Conversation memory is unreliable and non-portable across tools (Claude Code, Codex, Gemini CLI, Cursor). Most AI-built projects drift because knowledge lives in chat history.

## Decision

All enduring knowledge lives in version-controlled markdown inside the repository:

```
VISION.md                  — mission, benchmarks, definition of world-class
CLAUDE.md / AGENTS.md      — session entry point: what to read, in what order
docs/
  research/                — competitor analyses, landscape research (dated, sourced)
  architecture/            — system design, data flow, intermediate representations
  decisions/               — ADRs: every non-obvious choice, with alternatives considered
  standards/               — coding, prompt, and documentation standards
  motion/                  — the encoded design language: typography, easing, pacing, color
  roadmap/                 — milestones, current status, known issues
```

Rules:

1. Every AI session starts by reading the entry-point file, which routes to VISION.md, current roadmap status, and standards relevant to the task.
2. Every completed task updates the relevant docs (decision log, roadmap status, known issues) **in the same commit** as the change.
3. Architecture is never invented mid-task. If a task requires an architectural change, the session writes an ADR first.
4. Research documents are immutable snapshots (dated); conclusions drawn from them live in ADRs and architecture docs, which evolve.

## Consequences

- Any coding agent, in any tool, recovers full context by reading the repo — no session history required.
- Docs staleness is a first-class bug. CI will eventually lint for broken links and orphan docs.
- Slightly higher per-task overhead, traded for zero long-term drift.
