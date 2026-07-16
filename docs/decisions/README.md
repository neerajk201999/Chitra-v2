# Architecture Decision Records

ADRs are immutable decision history. Supersede an accepted decision with a new
ADR; do not silently rewrite its reasoning. Status corrections may be appended
when implementation lands.

New files use `NNNN-short-kebab-title.md`. Older `ADR-NNNN-*` names remain valid
to avoid breaking links.

## Template

```markdown
# ADR-NNNN — Decision title

**Status:** proposed | accepted | shipped | superseded · YYYY-MM-DD

## Context
What fact, constraint, or measured failure forces a decision?

## Decision
What is chosen, including boundaries and invariants?

## Alternatives rejected
What credible options were rejected, and why?

## Consequences
What becomes easier, harder, or explicitly deferred?
```

An ADR is required for architecture, trust boundaries, IR compatibility,
distribution, or a new long-lived dependency. It is not required for a local bug
fix whose correct behavior is already established.
