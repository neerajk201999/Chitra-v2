# Accepted-revision memory

Load this file only when a project has a revision-memory ledger or after the
user explicitly accepts, rejects, or reverts a reviewed change.

## Before Direction

If `revision-memory.json` exists, compile only relevant context:

```bash
chitra memory-context revision-memory.json \
  --project <project-id> --brand <brand-id> --register <register> \
  --principle <relevant-CR-ids> --max-chars 6000 \
  -o out/revision-context.json
```

Omit unknown project/brand filters; never guess an ID. Read the bounded packet,
not the full ledger. `repeat` is prior positive evidence, `avoid` is a prior
rejection or worse result, and `consider` is an explicit tradeoff—not a rule.
Current evidence never overrides the brief or brand truth.

## After a reviewed change

Record an entry only after the user makes an explicit decision. Bind the exact
subject, review/finding, changed artifact digest, rendered outcome evidence, and
human rationale. Accepted changes require watched/measured evidence. Rejections
may be retained without rendering so the same unwanted proposal is not repeated.

Use project scope for one film and brand scope only for a reusable brand choice.
Never create universal memory from one project. Universal promotion requires
the independent calibration provenance enforced by ADR-0032.

```bash
chitra memory-validate revision-memory.json
```

The ledger is append-oriented and version controlled. A reverted entry stays in
history with status `reverted`; do not delete evidence or silently rewrite the
Creative Constitution.

