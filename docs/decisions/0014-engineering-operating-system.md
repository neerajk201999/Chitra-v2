# ADR-0014 — Repository operating system for agentic engineering

**Status:** accepted · shipped 2026-07-16

## Context

Chitra is intentionally built across many short-lived agent sessions. ADR-0001
correctly makes the repository the memory, but the implementation still forces
a new agent to reconstruct current truth from a long roadmap, scattered status
notes, and chat history. Verification is similarly fragmented across CI steps,
benchmark scripts, package checks, and undocumented local conventions.

This creates four failure modes: stale context, locally-green/CI-red drift,
version identity drift, and large changes that are hard to reverse. Adding a
workflow framework or hosted agent service would replace those problems with
more infrastructure. Git, Markdown, and small Node scripts are sufficient.

## Decision

1. **Physical isolation.** Experimental development lives in the independent
   `Chitra-v2` repository. The original `Chitra` checkout remains an unchanged
   upstream snapshot. No shared Git object store or implicit remote is used.
2. **One current-state memory.** `docs/memory/current-state.md` is the concise
   handoff every builder reads after VISION. It records shipped facts, active
   objective, claim boundaries, verification evidence, and the next ordered
   slices. Historical detail stays in roadmap, ADRs, and research.
3. **One verification entry point.** `node scripts/verify.mjs` is the pre-merge
   contract used locally and by CI. `--quick` is the inner loop; the default
   runs unit, schema/static examples, repository consistency, deterministic
   benchmarks, skill integrity, and package checks. Individual tools remain
   callable for diagnosis.
4. **Executable repository consistency.** A dependency-free check enforces
   package/lock/skill-manifest/changelog version identity and valid relative
   Markdown links. Prose standards that are cheap to automate become code.
5. **Small reversible slices.** Work happens on `codex/` branches. Each commit
   contains one coherent capability plus its tests, benchmark evidence, ADR (if
   architectural), and memory update. Conventional commit prefixes describe
   intent. No generated artifact or benchmark baseline is silently refreshed.
6. **Version domains stay separate.** Package SemVer describes distributed
   software/skills; Motion IR has its own explicit version in the schema. A
   package release may preserve IR compatibility. Releases are tagged `vX.Y.Z`
   only after the full verification contract passes on a clean `main`.

## Consequences

- A fresh agent can recover the product state without conversation history.
- Local and CI acceptance use the same command, reducing procedural drift.
- Every release claim is traceable to committed evidence and a Git tag.
- The operating system has no new runtime dependency and can be deleted or
  replaced file-by-file. It does not introduce orchestration services, agent
  databases, a monorepo, or a mandatory multi-agent topology.
