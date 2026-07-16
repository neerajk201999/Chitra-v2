# Engineering Operating System

The repository—not a chat transcript—is the durable team memory. This workflow
is intentionally tool-neutral so Codex, Claude Code, Cursor, Gemini CLI, or a
human engineer can resume the same work.

## 1. Orient

Read the builder sequence in `CLAUDE.md`. State the active objective and the
claim that the proposed change will make true. If neither is clear, do not code.

## 2. Bound the slice

A slice has one observable outcome, one shared implementation root, one smallest
regression check, and an explicit non-goal. Architecture requires an ADR before
implementation. Concrete reference evidence is required for renderer expansion
under ADR-0012.

Use a `codex/<purpose>` branch for Codex work. Never mix cleanup, unrelated
refactors, generated refreshes, and product behavior in one commit.

## 3. Implement from contracts inward

For IR changes: schema → gate/law → compiler/runtime → tests → executable
benchmark → agent skill. Reuse the deterministic seek clock, token registry,
and existing dependencies. A new dependency needs measured value and an ADR
when it changes architecture or distribution.

## 4. Verify and refute

During the inner loop:

```bash
node scripts/verify.mjs --quick
```

Before merge:

```bash
node scripts/verify.mjs
```

Then conduct an adversarial review whose brief is to find the incorrect claim,
cache invalidation hole, missing trust-boundary validation, non-determinism, and
unmeasured regression. A second model is useful when available, never required
to make safe local progress.

Benchmark scripts use `--check` in verification so they never silently rewrite
committed evidence. Refresh a baseline only when the measured result is the
intentional product change; review that diff like code.

## 5. Preserve memory and reversibility

Update current-state/roadmap/known-issues only where truth changed. ADRs explain
why; CHANGELOG records user-visible releases; research snapshots stay immutable.

Use conventional commit intent (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
Prefer several coherent commits over one migration blob. Never rewrite shared
history to “clean up” a mistake—revert it, preserve the evidence, then fix it.

## 6. Release

Package SemVer and Motion IR versions are separate. A compatible feature may
bump the package without changing IR version. A release requires:

1. clean `main`;
2. full verification green;
3. package, lockfile, skill manifest, CLI, and CHANGELOG on the same SemVer;
4. reviewed package dry-run contents;
5. annotated Git tag `vX.Y.Z`.

Publishing, pushing, and remote repository creation are owner-controlled
external actions; local verification never implies they occurred.
