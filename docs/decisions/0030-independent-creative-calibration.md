# ADR-0030 — Creative calibration requires blind independent panels

**Status:** shipped · 2026-07-17

## Context

Creative Review 0.1 makes judgment evidence-bound, but Chitra still has only
four author-labelled synthetic cases. Generating more cases or asking the case
author's model for more labels would increase volume without increasing
validity. Professional-taste claims require independent judgments over watched
motion and sound, explicit provenance, disagreement that remains visible, and a
candidate critic kept blind from its labels.

## Decision

1. Reuse complete Creative Review 0.1 reports as human annotations. Do not add a
   second, weaker taste-label format.
2. Wrap each annotation with a pseudonymous reviewer ID, declared expertise,
   explicit consent, and literals proving the reviewer was not the case author
   and saw neither author labels, candidate output, nor other annotations first.
3. Require at least three independent reviewers per case. Every annotation and
   candidate review must bind the same case ID and subject SHA-256. Record the
   case register and whether motion and audio were actually reviewed.
4. Derive consensus at a declared threshold, defaulting to two-thirds. A
   principle's consensus severity is the highest severity threshold supported
   by the required number of reviewers.
5. Report verdict pair agreement, principle-set Jaccard, and shared-principle
   severity agreement separately. Candidate verdict agreement, principle
   precision/recall, and severity agreement also remain separate. Do not collapse
   them into a taste score or pass/fail badge.
6. Store disagreement and public-release consent in the result. Private labels
   are valid for internal calibration but cannot silently become a public
   dataset.
7. Candidate reports must declare that they were produced without author labels
   or panel annotations.
8. The core performs validation and deterministic arithmetic only. It makes no
   model calls and does not claim that panel consensus is objective truth.
   Blindness, expertise, conflicts, evidence coverage, and consent are declared
   provenance; the core binds and surfaces those claims but cannot verify them.

## Alternatives rejected

- **Twenty more author-labelled mutations:** cheap but repeats the existing bias.
- **One expert as ground truth:** useful feedback, insufficient reliability
  evidence and impossible to measure disagreement.
- **Scalar ratings or an averaged taste score:** hides whether disagreement is
  about verdict, issue identity, or severity.
- **A new lightweight annotation form:** lowers reviewer effort by discarding the
  evidence, domain, consequence, and fix structure calibration is meant to test.
- **Krippendorff/Fleiss statistics in the first slice:** valuable after the
  corpus has enough cases; premature now, and prevalence effects would be easy
  to misstate. Transparent counts and pairwise metrics are the honest minimum.

## Consequences

- Chitra can now run a real independent study without changing label formats
  later, while retaining reviewer disagreement and consent.
- Collecting labels is deliberately more work: three complete evidence-bound
  reviews per case. That cost is the quality signal, not implementation waste.
- The contract and scorer can be proven synthetically; critic reliability still
  remains unproven until at least twenty real motion/audio cases are reviewed by
  independent humans.
