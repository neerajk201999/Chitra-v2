# ADR-0045 — Frame systems and staged Score handoffs

**Status:** accepted  
**Date:** 2026-07-23

## Context

Chitra already carries creative intent through Intake, Direction, Storyboard,
Score, rendered evidence, review, and release. It also recommends an all-shot
still board before motion. Two important contracts were still prose-only:

1. a frame designer had no native stack/grid layout or rendered alignment
   contract, so precise frames depended on hand-tuned absolute coordinates or
   unrestricted figure CSS; and
2. an accepted board could drift silently when motion and sound specialists
   edited the final Score.

HyperFrames solves parallel production with independent HTML frame workers and
extensive instructions. Copying that design would trade Chitra's typed shared
film model for more coordination and silent-divergence risk. Bundling an agent
runtime would also add model/provider coupling, installation weight, and token
duplication without improving rendered pixels by itself.

## Decision

### One executable truth at three stages

The existing Score schema remains the only executable film representation.
Open or multi-shot productions may materialize it at three checkpoints:

- `board.score.json`: Frame Designer owns static style, scene backgrounds,
  elements, assets, and frame contracts. Choreography is empty.
- `motion.score.json`: Motion Designer may add choreography and transitions.
  Accepted board geometry, style, assets, scene timing, and static
  compositing remain byte-equivalent.
- `score.json`: Sound Designer may add root audio and choreography-bound SFX.
  The accepted visual and timing graph remains unchanged.

`chitra stage-check` compares adjacent Scores by stable scene/element identity
and rejects out-of-role drift. A single host agent may perform every role. Work
may be parallelized only after shared Direction, Storyboard, assets, and frame
system are locked; Chitra does not bundle or require an orchestration SDK.

### Typed frame system

Groups gain bounded layout modes:

- `free` preserves the existing local absolute-coordinate composition;
- `stack` provides an axis, gap, padding, cross-axis alignment, and main-axis
  distribution, with explicit intrinsic or equal-cell item sizing; and
- `grid` provides bounded columns, row/column gaps, padding, and alignment.

Stack/grid deliberately ignore child `position` values. Grid child percentages
resolve inside calculated cells; equal stacks do the same inside equal cells,
while intrinsic stacks resolve against the group. Children retain stable IDs.
This is a small browser-native layout substrate,
not a category template or a second HTML dialect.

Text gains an optional reasoned treatment for bounded size, line height,
weight, tracking, case, and wrapping. The default type roles remain the cheap,
coherent path; overrides exist for optical composition rather than arbitrary
CSS.

Scenes may declare a `frame` contract containing an optional representative
scene time, a focal element, intended reading-order targets, and explicit
alignment/gap relationships. The compiled page
reports visible element geometry after seek. At the declared representative
frame, rendered gates prove that each contract target changes actual pixels
when removed, then verify the authored spatial relationships against browser
geometry. The contract is intentionally one approved style frame, not a claim
that the relationships persist throughout the shot.

Target visibility and spatial relationships are hard defects because they are explicit authored
intent, not universal taste opinions. Density, asymmetry, hierarchy, and
whether the listed target sequence is a professionally good eye path remain
evidence-bound review
questions. Logos, brands, narration, a hero layout, and any house aesthetic
remain optional.

### Agent-facing workflow

The create-video skill exposes separate, narrow Frame Designer, Motion
Designer, and Sound/Editor instructions. Each role reads the smallest relevant
artifact set, edits only its owned Score surface, and proves the handoff with
`stage-check`. Critics continue to watch rendered evidence in isolation.

## Consequences

- Agents can produce aligned, locally reflowing native compositions without
  hand-tuning every absolute coordinate.
- Accepted style frames cannot be silently redesigned during motion or sound.
- Frame constraints are checked against actual browser geometry, including
  nested groups and addressable figure internals.
- Existing Scores remain valid because new fields default to the legacy path.
- Arbitrary figure CSS remains available but is not described as token-pure;
  known issue A8 remains open.
- This does not add custom glTF, Rive, animated masks/shaders, motion blur,
  player/Studio, cloud rendering, or independent proof of professional taste.
- No general superiority over HyperFrames is claimed. A neutral paired
  benchmark with outside reviewers remains required.

## Rejected alternatives

- **A model-specific multi-agent runtime:** duplicates host-agent capability,
  increases install/context cost, and couples core to providers.
- **Separate Frame, Motion, and Audio IRs:** duplicate scene truth and create a
  merge problem instead of solving one.
- **A large category template catalog:** makes sameness cheap and encodes an
  aesthetic before the brief.
- **Arbitrary JavaScript/CSS layout adapters:** recover HyperFrames' silent
  runtime footguns and weaken deterministic validation.
- **Hard-coded “premium” layout metrics:** convert uncalibrated taste opinions
  into false objective gates.

## Acceptance evidence

The executable frame-system benchmark must prove:

- stack and grid layouts resolve to the declared rendered alignment and gaps;
- a deliberate alignment/gap defect is rejected with stable rule IDs;
- board-to-motion accepts choreography/transition additions and rejects static
  redesign, timing, order, style, and asset drift;
- motion-to-master accepts only audio and choreography SFX additions;
- repeated and backward frame capture is pixel-identical;
- changed frame-system inputs invalidate scene identity; and
- package/install impact remains measured.
