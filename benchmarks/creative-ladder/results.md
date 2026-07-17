# Creative ladder benchmark

**Verified:** 2026-07-17 · **Direction:** 0.3.0 · **Storyboard:** 0.1.0

`node benchmarks/creative-ladder/run.mjs --check` validates a complete
Intake→Direction→Storyboard→Score chain, runs all three conformance boundaries,
and executes the packaged CLI command over temporary JSON artifacts.

Seeded drift checks:

- dropped must-level Intake preference → `CC-INT-6`;
- dropped directed beat in Storyboard → `CC-BOARD-2`;
- planned copy missing from Score → `CC-SCORE-4`.

All three are caught. This benchmark establishes structural intent coverage and
traceability. It does not score whether the concept, narrative, composition, or
copy is professionally good; that remains calibrated Creative QA and blind
ChitraBench evaluation.
