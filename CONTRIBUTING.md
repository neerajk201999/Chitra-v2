# Contributing

Start with `CLAUDE.md`; it is the builder entry point for humans and agents.
The operational workflow is in
[`docs/operations/engineering-system.md`](docs/operations/engineering-system.md).

```bash
cd core && npm ci && cd ..
node scripts/verify.mjs --quick  # inner loop
node scripts/verify.mjs          # required before merge
```

Use a short-lived branch and one coherent conventional commit per change. Add
an ADR before architecture, tests for behavior, benchmark evidence for claims,
and update repository memory in the same commit. Never refresh a baseline merely
to make verification green.

Package releases follow SemVer and `CHANGELOG.md`; Motion IR compatibility has
its own version in `core/src/motion/tokens.ts`.
