# ADR-0037 — Public previews use immutable verified package artifacts

**Status:** shipped · 2026-07-18

## Context

Chitra 0.5.0 passes the packed-package and protected-CI contracts, but the npm
publisher session returns `401 Unauthorized` and the registry still serves
0.4.0. Waiting for registry authentication prevents outside users from testing
the fixed installation, preview, capability, editing, evidence, memory, and
directorial-search paths. Pointing users at a source checkout would reintroduce
the agent-sandbox Git failures ADR-0031 removed.

GitHub Releases can serve the exact npm tarball without changing Chitra's
two-part architecture or adding an installer. `npm install -g <https tarball>`
uses the normal npm dependency/link lifecycle and remains compatible with the
separate canonical-skills installer.

## Decision

1. A release candidate may have a GitHub **prerelease test artifact** before its
   npm publication when registry authentication is unavailable. It is never
   described as the stable npm release.
2. The artifact is produced by `npm pack` from a protected, fully verified
   `main` commit. The prerelease records the exact commit and SHA-256. Assets are
   immutable; a byte change requires a new prerelease identifier.
3. The public-preview command installs the tarball URL directly with npm. No
   `curl | sh`, custom bootstrapper, browser download, source clone, or global
   agent runtime is introduced.
4. `benchmarks/cold-start/run.mjs` accepts `--source` and `--sha256`, downloads
   into a fresh temporary prefix, verifies bytes, then exercises version,
   runtime probe, Intake lock, initialization, validation, and a real browser
   frame. `benchmarks/public-preview-install` pins the current public candidate.
5. External-network verification is explicit and reproducible but not part of
   every CI run: release-host availability must not make repository correctness
   flaky. The local packed artifact remains in the full verifier.
6. Stable documentation returns to `npm install -g chitra-video` only after the
   intended version is published and a fresh registry install passes. The
   GitHub candidate remains a historical reproducibility artifact.

## Consequences

Friends can test the actual 0.5.0 package without cloning or waiting for npm
credentials. The channel adds no runtime code or dependency. GitHub availability
is a new first-use dependency for preview testers, and the URL is longer than a
registry install. One successful local download remains weaker than independent
network-cold tests across operating systems and harnesses.

This decision supersedes review 0005's temporary “no GitHub release before npm”
merge boundary because the package now originates from protected `main`, full
verification is green, the channel is explicitly a prerelease, and downloaded
bytes are independently checked. It does not supersede the annotated `vX.Y.Z`
stable-release requirement in ADR-0014.
