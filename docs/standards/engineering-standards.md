# Engineering Standards

## Code (deterministic core)

- TypeScript strict mode; single package until pain forces a split (no premature monorepo).
- Zod schemas are the source of truth for the IR; JSON Schema is generated from them.
- No LLM API calls anywhere in `core/` — reasoning belongs to the host agent (ADR-0005).
- Determinism is tested, not assumed: golden-frame tests (render twice, byte-compare), seeded-randomness tests, font-pinning tests.
- Every gate rule: ID-tagged (e.g. `MO-DUR-1`), unit-tested with a positive and negative fixture, and traceable to its line in `docs/motion/`.
- No silent fallbacks. A degraded path (renderer, font, asset) either fails loudly or records a machine-readable warning in the delivery report. *A silent degraded critique is a failed critique.*
- Benchmarks (render speed, cache hit behavior, gate runtime) run from `benchmarks/` with committed baselines; regressions block merge.

## Prompts & skills (the skills layer)

Prompts are product code. Standards:

- **Single source**: one canonical skill source per skill, compiled per harness. Never hand-edit a compiled artifact.
- **Cite, don't restate**: skills reference motion-language rules by ID. Restating a rule inline is a bug (it forks the law).
- **Contracts over vibes**: sub-agent briefs are self-contained and state what the sub-agent does NOT decide.
- **Hard rules vs taste separated**: numbered non-negotiables first (validated downstream by gates), worked examples for taste second (HyperFrames/video-use pattern).
- **Isolation discipline**: critic prompts never receive deterministic-gate output or other critics' findings (anchoring, ADR-0004).
- **Skill evals**: every workflow skill has at least one recorded eval case (brief in → expected artifact properties out) run before release, Remotion-skills-evals style.
- Versioned with hash manifest; a skill change without a version bump fails CI.

## Review loop (build-time)

Every substantive change: implement → self-review against standards → adversarial review pass (separate session/model when available — the reviewer's brief is to refute, not approve) → benchmark → update memory docs in the same commit. No exceptions for "small" changes to `docs/motion/` — taste changes are the highest-risk changes in this repo.

- Inner loop: `node scripts/verify.mjs --quick`.
- Pre-merge and release: `node scripts/verify.mjs`; CI runs the same command.
- Benchmark `--check` mode must not rewrite evidence. A baseline refresh is an intentional reviewed diff.
- Commits are coherent and revertable; use conventional intent prefixes. Package releases are SemVer-tagged, while Motion IR compatibility is versioned separately.

## Documentation

- Every non-obvious choice gets an ADR before implementation.
- Research snapshots are immutable; conclusions evolve in ADRs/architecture docs.
- Broken internal links, version drift, stale skill manifests, and changelog drift are CI failures enforced by `scripts/check-repo.mjs`.
