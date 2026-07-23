# Release integrity benchmark

ADR-0027 is exercised end to end on a generated 320×320 product-demo release:

- Intake, Direction, Storyboard, and Score validate and conform;
- rendered gates use more than three samples and finish with zero hard defects;
- the music/SFX final bus is measured after AAC encoding and must land at
  −14 ±0.5 LUFS with true peak no higher than −1.5 dBTP;
- the 0.2 receipt verifies immediately after release and a protocol-0.1 copy
  remains backward-verifiable;
- a P1 three-hero composition releases as a visible style flag, and an exact
  rule/path/reason acceptance is hash-bound to its receipt;
- a missing animation target remains a non-overridable hard defect;
- changing either the Score or final MP4 invalidates the receipt; and
- a release target that aliases an input is rejected without changing it.

The benchmark creates its sine bed and all artifacts locally, uses no network,
and deletes its temporary project after the assertions. These are first-party
contract checks, not independent evidence that the hard/style boundary is
professionally calibrated.
