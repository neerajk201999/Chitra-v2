# ADR-0041 — Hard defects and style flags are separate release policies

**Status:** implemented · 2026-07-23 · external boundary-fixture review pending

## Context

Chitra currently uses P1/P2/P3 as both priority and release policy. `release`
blocks every P1, but several P1 rules are creative heuristics: hero count,
simultaneous motion, fade-only sequencing, ease direction, safe-zone placement,
minimum scene length, reading-time estimates, and near-uniform frames. A
maximalist montage, flash-frame ad, asymmetric editorial composition, solid-
color abstract beat, or deliberately accelerating entrance can therefore be
rejected even when it is intentional and functional.

The opposite failure is also dangerous: treating missing required copy,
unreadable legal text, corrupt output, stale assets, broken references, or
unlicensed source use as optional style. Severity is not enough to express the
difference. Aesthetic defaults are hypotheses; release integrity is a contract.

## Proposed decision

1. Every finding carries two independent dimensions:
   - `priority`: P1/P2/P3 for triage;
   - `policy`: `hard-defect` or `style-flag` for release behavior.
2. `hard-defect` blocks release and cannot be overridden. It is limited to
   schema/reference corruption, missing assets/fonts, nondeterministic or
   failed rendering, invalid audio/video delivery, provenance/rights contract
   violations, stale release inputs, and loss/illegibility of meaning explicitly
   marked required by Intake/Storyboard/accessibility contracts.
3. `style-flag` never blocks generation or release. It covers pacing, hero
   count, simultaneity, easing taste, safe-zone convention, unusual contrast for
   non-required/decorative material, uniform/empty composition, register norms,
   and slop heuristics.
4. A style finding may be accepted through a typed selector-bound record:
   `{ ruleId, path, reason }`. Acceptance does not delete the finding. The
   release receipt records it as accepted with the exact reason; unaccepted
   style flags remain visible as unresolved notes but do not veto output.
5. Context determines policy where the same visual symptom can be either:
   - required claim/legal/accessibility copy below a calibrated rendered-pixel
     legibility floor → hard defect;
   - optional/decorative ghost type or intentional off-canvas text → style flag.
   Static role labels alone are insufficient. The release transaction derives
   required meaning from locked Intake and Storyboard conformance.
6. Gate implementation uses one exhaustive policy registry checked in tests.
   Unknown rule IDs fail CI rather than defaulting silently. The CLI and receipt
   expose policy, priority, acceptance state, evidence time, and IR path.
7. The release receipt protocol advances to 0.2.0. It records policy,
   priority, acceptance state, and reason. A style-acceptance file participates
   in the release fingerprint, so changing it stales verification. Verification
   remains backward-compatible with receipts issued by protocol 0.1.0.
8. `render --force` remains a diagnostic-only escape hatch for inspecting a
   broken draft. It cannot create or authorize a release receipt; `release`
   never accepts hard defects.

## Required evidence before acceptance

- Enumerate every emitted rule ID and prove the policy registry is exhaustive.
- Regression fixtures for at least: three intentional heroes, a uniform-color
  abstract beat, off-safe-zone editorial type, flash copy, overlapping
  decorative type, missing required copy, unreadable required legal copy,
  corrupt/missing asset, and stale provenance.
- Packed-CLI release tests proving all style cases deliver with visible audit
  notes, all hard cases refuse, and selector-mismatched overrides do nothing.
- Independent review of the boundary fixtures by someone other than the process
  implementing the policy. This is the only remaining acceptance item and is
  explicitly not satisfied by the first-party regression suite.

## Alternatives rejected

- **Keep P1 as policy:** conflates urgency with objective invalidity and narrows
  creative range.
- **Make all visual rules warnings:** permits required meaning and accessibility
  contracts to disappear.
- **Allow `--force` on release:** bypasses trust globally and produces no
  selector-bound audit trail.
- **Classify only by rule ID:** the same contrast/overlap symptom can affect
  required meaning or optional decoration; contract context matters.

## Consequences

Chitra becomes permissive about authored form while strict about truth,
required meaning, reproducibility, provenance, and delivered bytes. The policy
adds receipt/schema work and requires migration tests, but removes house-style
opinions from the release veto path without weakening objective guarantees.

## Implementation evidence

- `RULE_POLICIES` exhaustively classifies every emitted gate ID; an unknown ID
  throws instead of receiving an implicit policy.
- Required-copy context comes from locked Intake must-include/legal/
  accessibility constraints and approved Storyboard on-screen copy.
- Mixed rules use the explicit `p1-hard` registry policy when their P1 form is a
  contract violation and their lower-priority form is advisory. Particle
  structure remains MO-PART-1 hard; the density review is separately identified
  as MO-PART-2 style.
- `--accept-style` accepts only an exact `{ ruleId, path, reason }` match,
  rejects hard defects and stale selectors, and binds the file into the receipt.
- Unit fixtures prove intentional three-hero P1 output remains releasable,
  missing animation targets remain hard, required-copy legibility is promoted,
  and selector mismatch/hard override fail.
- The release-integrity benchmark produces a style-flagged release with a bound
  acceptance, refuses a broken target, verifies receipt 0.2.0, and retains the
  existing stale-input/output and final-audio checks.
