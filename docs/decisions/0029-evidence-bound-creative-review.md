# ADR-0029 — Creative judgment must be typed, evidence-bound, and calibrated

**Status:** shipped · 2026-07-16

## Context

Chitra’s deterministic gates are measurable, but its aesthetic critic returns
free-form JSON with seven coarse dimensions. The four-case calibration smoke
test uses semantic gist matching by the case author. That cannot accumulate a
reliable judgment dataset, compare critic versions automatically, expose
uncertainty, or prevent a model from filing detached “taste” opinions.

Impeccable’s strongest current pattern is two unanchored assessments followed by
synthesis, deterministic evidence, provenance, and review history. Material and
Apple both treat motion as contextual and purposeful rather than a universal
effects recipe. Chitra needs the same rigor across narrative, direction, visual
design, motion, edit, sound, brand, product truth, and finishing.

## Decision

1. Define a versioned multidisciplinary craft model with stable `CR-*`
   principle IDs. Principles are review hypotheses, not deterministic gates.
2. Add Creative Review 0.1: a strict schema binding the subject digest, critic
   method, first-watch read, fourteen domain assessments, findings, confidence,
   evidence references, fixes, expected effects, priorities, and uncertainty.
3. Require the visual assessment to be isolated from deterministic findings.
   A review records this as data; silent degraded critique is invalid.
4. Do not compute one aesthetic score. Reviews retain per-domain judgments and
   tradeoffs. `ship` cannot coexist with a P1 or blocking assessment; `redirect`
   requires a strategic/holistic P1; `revise` and `redirect` require at least
   one actionable, prioritized finding.
5. Calibration labels use hidden principle IDs, severity thresholds, verdict
   sets, and finding/severity budgets. Scoring is deterministic and penalizes
   finding spam. Semantic quality still requires independent labels.
6. Expose `chitra review-validate` and `chitra review-score`. Update the critic
   skill to emit this contract; the core makes no model calls.
7. Accumulate evidence → finding → revision decision → measured outcome only
   after user consent. Universal craft learning and brand-specific memory remain
   separate.

## Consequences

- Different models can be compared using the same output contract without
  pretending their judgment is equivalent.
- Aesthetic rules can mature from prose → labelled principle → calibrated
  advisory → deterministic gate where an honest proxy exists.
- Review output becomes larger and more demanding. Every assessed domain must
  cite evidence; irrelevant domains are explicitly `not-assessed` with a reason.
- This does not prove the critic is good. The existing four cases remain an
  author-biased smoke test; ≥20 independently labelled cases and blind output
  preference remain required.
- Effects libraries, compositor expansion, and provider integrations remain
  residual-driven. This ADR builds the judgment substrate that decides which
  ones actually improve watched output.
