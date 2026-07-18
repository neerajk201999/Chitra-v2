# ADR-0032 — Creative memory learns only from explicit, evidenced revisions

**Status:** shipped · 2026-07-18

## Context

Chitra can bind a critique to rendered evidence, but every new agent session
still starts without the outcome of previous human decisions. Repeating whole
reviews wastes context, while turning free-form feedback into global prompt
rules would leak one project or brand's preference into unrelated work and
mistake acceptance for objective improvement.

The missing unit is not a style prompt. It is a provenance chain:

`subject → finding → human decision → exact change → watched evidence → outcome`

That chain must remain reviewable, reversible, scope-safe, and cheap to retrieve.

## Decision

1. Add Revision Memory 0.1 as a strict, append-oriented JSON ledger. Each entry
   binds the subject digest, originating review/finding and `CR-*` principles,
   human decision, changed artifact and patch digest, outcome evidence, and
   reusable `do`/`avoid` guidance.
2. Scope every entry to exactly one project, one brand, or universal craft.
   Project and brand entries are retrieved only for an exact matching ID.
3. An accepted revision must have a measured outcome and evidence. A rejected
   proposal may be retained without post-change measurement because the human
   decision itself is useful negative preference evidence.
4. Universal entries are prohibited unless accepted and backed by an
   independent calibration promotion covering at least 20 cases and three
   reviewers per case. The core validates declared provenance; it does not
   independently verify reviewer identity or expertise.
5. `chitra memory-context` deterministically compiles only relevant entries into
   a bounded context packet. It prioritizes principle matches, then project,
   brand, and universal scope, and stops before a declared character budget.
   It never edits the Creative Constitution, Score, or any global prompt.
6. Reverted entries remain in the ledger for audit but never become directives.
   Conflicting accepted/rejected entries remain visible; the compiler does not
   manufacture consensus.
7. The core remains model- and provider-free. Agents decide how to apply the
   compact packet, and subsequent conformance/review gates judge the result.

## Alternatives rejected

- **Store conversation transcripts:** high-token, weakly structured, difficult
  to scope, and unable to distinguish suggestion from accepted outcome.
- **Automatically rewrite the constitution:** irreversible global contamination
  from sparse or brand-specific feedback.
- **Vector database in the base install:** a dependency and operational burden
  before corpus size proves lexical filtering insufficient.
- **Learn only positive changes:** rejected directions are essential for brand
  boundaries and prevent the same failed proposal recurring.
- **One scalar improvement score:** hides mixed tradeoffs and the evidence that
  a future director needs to inspect.

## Consequences

Chitra gains an explicit compounding-taste substrate without an LLM call, a
database, or a new runtime dependency. Memory can travel with a repository and
remain diffable and revertible. This does not prove professional taste, resolve
conflicts automatically, or replace the independent calibration study. Future
semantic retrieval is allowed only after a measured corpus shows that the
bounded deterministic compiler misses relevant revisions.
