# Motion-design studio production process

Load this for product launches, brand films, open briefs, and any multi-shot
piece where Chitra must choose the concept. It maps a real creative team's
checkpoints onto Chitra's existing artifacts without forcing a house style,
logo, narration, or approval ceremony the user did not request.

## The production spine

| Studio phase | Chitra artifact / proof | Exit question |
|---|---|---|
| Creative brief | `intake.lock.json` | Is product truth, audience, one message, rights, required claims, constraints, preferences, and uncertainty explicit? |
| Treatment | selected `direction.json` | Is there a specific governing idea, emotional turn, visual system, sound thesis, and feasible production approach? |
| Beat board | `storyboard.json` | Does every shot have a reason and make the next shot feel causally earned? |
| Style frames | still-only `board.score.json` + `out/board-evidence/` | Do the important frames work with motion turned off? |
| Animatic | optional `out/animatic.mp4` from the still board | Do duration, cuts, copy, silence/voice/music landmarks, and payoff work before animation? |
| Hero motion test | one completed scene in `score.json` | Does the chosen motion/material/camera mechanism prove the concept at final quality? |
| Production | completed `score.json` | Does every scene realize the approved board without capability substitution? |
| Editorial review | draft preview + isolated Creative Review | Is the watched film coherent, motivated, legible, and emotionally on brief? |
| Online/master | high-quality release + receipt | Are hard defects zero and delivered bytes verified? |

## Board Score

For an exact approved direction or a trivial single-shot unit, skip with one
sentence. Otherwise, before authoring choreography:

1. Create `board.score.json` from the approved Storyboard.
2. Compose every shot at its most informative or emotionally important state.
3. Use the real selected assets, typography, palette, framing, and hierarchy.
4. Keep choreography empty unless a zero-motion state cannot represent the
   shot; do not build entrances, exits, transitions, particles, or polish.
5. Run creative conformance and validation.
6. Generate `out/board-evidence/`; inspect every hero frame and the contact
   sheet at full size.
7. Revise the board artifact, not final motion, when hierarchy, brand,
   information density, product truth, or shot-to-shot contrast is wrong.

The board is not a wireframe by default. A premium launch normally needs
representative style frames; a complex UI flow may deliberately use lower-
fidelity layout blocks first. Match proof fidelity to the uncertainty being
retired.

## Animatic

Use an animatic when cut timing, narration, music structure, dense copy, or a
multi-beat payoff is a material risk. Render the board Score at draft quality
with holds/cuts and available scratch or final audio. Do not judge animation
quality from it; judge:

- whether the opening creates the intended question;
- whether the value appears before supporting detail;
- whether copy is readable at the intended duration;
- whether shots repeat the same composition or information;
- whether cuts land on meaning, audio landmarks, or deliberate counterpoint;
- whether the close resolves the governing idea rather than appending a logo.

Skip for a short single-shot motion graphic or exact reconstruction whose timing
is already locked by the reference.

## Team reasoning, one artifact

The host agent may reason as strategist, creative director, art director,
storyboard artist, motion designer, editor, sound designer, and finishing/QC
lead. Do not create separate prose documents for each role. Each role must
change or validate the shared Intake, Direction, Storyboard, board Score, or
Score. Parallel workers are justified only when scenes are independently
specified and packet/coordination cost is lower than serial construction.

## Flexibility

- A logo is an asset only when the user/brief needs it.
- Brand System is optional; an experimental or unbranded film is valid.
- One hero, one idea, safe zones, restrained camera, and conventional reading
  time are useful defaults, not universal release laws.
- Maximalist, abstract, flash-frame, asymmetric, silent, textless, dense,
  comedic, raw, or anti-brand work is valid when it serves the locked brief.
- Objective corruption and loss of required meaning still block release.
- Style flags remain visible evidence; they never veto authored form.
