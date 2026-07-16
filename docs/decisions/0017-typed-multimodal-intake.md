# ADR-0017 — Typed multimodal intake and deterministic source locking

**Status:** accepted · 2026-07-16

## Context

Chitra accepts prompts, reference videos, images, screenshots, links, brand
assets, footage, audio, preferences, and anti-references, but that inventory
currently survives only in agent conversation and skill prose. Direction IR
cannot distinguish user facts from model assumptions, trace a creative choice
to supplied evidence, or detect when a local source changes after planning.

A provider-owned memory service would make the workflow less portable and less
reproducible. Putting acquisition or model calls inside the deterministic core
would also violate ADR-0002 and ADR-0016.

## Decision

1. Add a separately versioned `Intake` IR before Direction. It records the
   objective, deliverable, source inventory, intended use, rights state,
   preferences and anti-preferences, brand constraints, explicit assumptions,
   open questions, and derived evidence links.
2. Sources use three typed origins: inline text, project-relative local paths,
   or HTTP(S) URLs. URLs may point to an explicit project-local capture. Remote
   acquisition remains a host-agent or `chitra fetch`/`chitra snap` action; the
   intake command never silently downloads content.
3. `chitra intake intake.json -o intake.lock.json` validates the IR, resolves
   only project-local files, rejects traversal and symlink escapes, verifies any
   claimed hashes, and writes SHA-256 plus byte counts for inline content, local
   sources, URL captures, and evidence artifacts.
4. The locked JSON is the durable project memory and provenance boundary. The
   core remains model-neutral and stateless; accepted changes are ordinary,
   reviewable JSON diffs.
5. Intake validation checks source references and duplicate identifiers. It
   does not infer semantic truth, grant usage rights, or pretend that an
   un-captured URL is immutable.

## Alternatives rejected

- **Free-form brief markdown only:** readable, but cannot enforce provenance,
  distinguish assumptions, or detect changed source bytes.
- **Hosted project-memory database:** hidden state, provider coupling, and no
  deterministic checkout-to-checkout recovery.
- **Automatic URL crawling in the core:** network nondeterminism, unclear
  consent boundaries, and duplicated browser/acquisition responsibilities.
- **One universal untyped attachment object:** flexible superficially, but
  leaves every downstream agent to reinterpret source meaning differently.

## Consequences

- Prompt-only and arbitrarily mixed-source projects share one inspectable
  contract without requiring a reference.
- Direction and Storyboard conformance can next cite source and preference IDs
  instead of relying on conversational memory.
- Local source changes become measurable. Remote URLs remain explicitly
  unlocked until captured into the project.
- Brand learning across projects remains deferred to Style Memory; Intake is a
  per-project truth record, not a speculative preference database.
