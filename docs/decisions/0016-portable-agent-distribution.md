# ADR-0016 — Portable agent distribution and verified cold start

**Status:** accepted · shipped 2026-07-16

## Context

ADR-0005 chose a deterministic core plus installable skills, but the repository
drifted from that decision. The Claude plugin still identified itself as 0.1.0,
Codex and Gemini had no native entry artifacts, Cursor only worked when the
repository itself was open, and the README recommended an npm package that is
not published. A warm local experiment was described as a cold-start result,
but no executable install benchmark existed.

The live competitors make the distribution bar concrete. HyperFrames exposes
one skills tree through `npx skills`, Claude, Cursor, and Codex manifests;
Remotion ships a native Codex plugin; Impeccable uses one installer across many
harnesses. Chitra cannot claim model-neutral operation while installation
depends on undocumented agent behavior.

## Decision

1. Keep two separately installable products: `chitra-video` is the deterministic
   CLI/library; `skills/` is the model-facing direction and critique layer. Do
   not put an LLM, hosted orchestrator, or provider SDK inside the core.
2. Keep `skills/` canonical. Expose it through native Claude Code, Codex, and
   Cursor manifests; use `AGENTS.md` and `GEMINI.md` for zero-install repository
   use; use the ecosystem `npx skills` installer for portable project/global
   copies. Do not maintain hand-copied provider skill forks.
3. Model neutrality means the typed artifacts, deterministic gates, evidence,
   and release contract set the shared floor. Add provider-specific prompt
   deltas only after an eval demonstrates a recurring provider-specific defect.
4. Installation documentation must distinguish current source installation
   from future npm/public installation. Until the repository is public and the
   package exists on npm, both are release blockers—not commands to advertise.
5. Full verification includes an isolated tarball install that runs
   `--version`, `probe`, `init`, `validate`, and a real browser frame capture.
   Repository checks enforce package/plugin/skill version identity.
6. The creation skill accepts prompt-only briefs and any combination of video,
   images, screenshots, links, brand material, footage, audio, preferences, and
   anti-references. A typed multimodal Brief/Intake IR remains the next creative
   slice; distribution must not invent an untyped orchestration database.

## Consequences

- Every supported harness reaches the same workflow and laws instead of a
  provider-specific approximation.
- A clean install failure becomes a CI failure. Outside-user timing in three
  harnesses remains the M3 exit gate; an isolated local prefix is not a proxy
  for independent users or network-cold timing.
- Making the GitHub repository public and publishing `chitra-video` remain
  explicit owner release actions.
