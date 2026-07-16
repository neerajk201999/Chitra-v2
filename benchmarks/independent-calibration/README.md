# Independent Creative Calibration

This is the operational protocol for replacing Chitra's author-labelled critic
smoke test with evidence from independent human panels. The implementation is
ADR-0030; the generated `results.md` proves only contract mechanics.

## Pre-registered minimum study

- At least 20 cases: at least 5 each from brand film, product demo, and social
  short; distribute the remainder before candidate runs begin.
- Every case includes the full watched video or a review-quality motion clip. At least
  half include meaningful audio suitable for sound review.
- At least 3 independent reviewers per case. Across the study, recruit real
  coverage of creative direction, visual/motion design, editing, and sound—not
  three copies of one role.
- A reviewer is not the case author and sees no author label, candidate output,
  or other reviewer annotation before submitting.
- The candidate critic sees no author label or panel annotation before
  submitting. Candidate settings, model/version, and run ID remain in each
  Creative Review.
- Case allocation, consensus threshold, corpus composition, and candidate
  configuration are frozen before candidate results are inspected.

## Collection flow

1. Freeze each case video or canonical evidence bundle and record its SHA-256.
2. Give every reviewer the same case, direction/storyboard when relevant, and
   the `skills/critique-video` review method—but never hidden labels or another
   review.
3. Each reviewer returns a complete, valid Creative Review 0.1. This preserves
   evidence, domain assessments, consequences, fixes, and uncertainty instead
   of collecting context-free scores.
4. Wrap reviews in an Independent Calibration Study 0.1 object. Each case
   records `register`, `evidenceProfile`, at least three `annotations`, and zero
   or more blind `candidates`. See the executable fixture construction in
   `run.mjs` for the authoritative shape.
5. Run:

   ```bash
   chitra review-calibrate study.json -o result.json
   ```

6. Publish or retain the result with the study. Never release underlying reviews
   unless every reviewer consented and a separate rights/privacy review of the
   evidence and text has passed.

## Reading the result

- `verdictPairAgreement`: exact ship/revise/redirect agreement across reviewer
  pairs.
- `principleSetJaccard`: overlap of the `CR-*` issue sets. Two empty sets count
  as agreement; always read this beside case mix and consensus details.
- `sharedPrincipleSeverityAgreement`: exact severity agreement only where both
  reviewers found the same principle; `null` means there were no shared issues.
- Candidate verdict agreement, mean principle precision, mean principle recall,
  and severity agreement remain separate. There is deliberately no overall
  taste score and no automatic release threshold.
- `disputedVerdict`, vote counts, principle votes, declared conflicts, evidence
  coverage, and consent remain visible rather than being averaged away.

The core validates declarations and subject bindings; it cannot prove a human
was genuinely independent, expert, or blind. Study administration and audit
remain part of the evidence.
