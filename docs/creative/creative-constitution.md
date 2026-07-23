# Chitra Creative Constitution

The encoded **why**. `motion-language.md` says how motion behaves; this says what
makes a film *feel* like Apple, CRED, OpenAI, Nothing, Google, Stripe, Linear.
Every director/planner/critic agent reads this **before** generating. It is taste
made explicit — and, wherever a principle can be measured, it becomes a gate
(rule IDs prefixed `CC-`, promoted to deterministic checks as proxies are found).

Use [craft-model.md](craft-model.md) for the multidisciplinary review vocabulary,
frame-level motion and edit reasoning, evidence requirements, flexibility model,
and machine-readable `CR-*` principle mapping introduced by ADR-0029. This
constitution sets creative posture; the craft model defines how work is judged.

This is a living document. When an accepted revision teaches us something the
constitution didn't know, we amend it here (ADR-0012 Style Memory) so future
sessions inherit the taste instead of relearning it.

> **The contextual test above all (CC-CORE-1):** every element, every beat, every cut
> must answer *why does this exist, why now, why this movement?* If the honest
> answer is only "it looked nice" or "to fill time," reconsider it. Deliberate
> ornament, maximalism, ambiguity, interruption, and sensory pleasure can be the
> reason when they serve the locked brief.

## 1. Narrative philosophy (CC-NARR)

- **CC-NARR-1 — One governing relationship by default.** A focused launch film
  usually benefits from a single proposition or emotional relationship, while
  a montage, anthology, or maximalist piece may deliberately carry several.
  Name the organizing logic so multiplicity is authored rather than accidental.
- **CC-NARR-2 — Tension before resolution.** Establish a gap (problem, question,
  absence) before the product resolves it. No tension = an ad, not a film.
- **CC-NARR-3 — Product as protagonist, not exhibit.** The product *does*
  something or *answers* something; it is not paraded. Show the change it makes.
- **CC-NARR-4 — Earn the name.** The brand/wordmark lands last, after the feeling
  is delivered — never as the opening title of a film that hasn't earned it.
- **CC-NARR-5 — Emotional arc is deliberate.** Curiosity → tension → confidence →
  delight (or a chosen path). The arc is authored, not incidental.

## 2. Rhythm & pacing philosophy (CC-RHY)

- **CC-RHY-1 — Silence is a tool.** A held, near-empty frame before a reveal
  creates weight. Premium films breathe; slop never stops moving.
- **CC-RHY-2 — Reveal cadence accelerates then rests.** Establish slowly, build,
  then a beat of stillness on the payoff. Even pacing is boring pacing.
- **CC-RHY-3 — Cut on meaning or on the beat, never arbitrarily.** Every cut is
  motivated by the narrative or the music (see motion-language MO-AUD, MO-EDIT).
- **CC-RHY-4 — The last 20% is the film.** The resolution/close gets the most
  care and the most air. Most films are lost in a rushed ending.

## 3. Camera & space philosophy (CC-CAM)

- **CC-CAM-1 — Camera has intent.** Slow push = intimacy/inevitability; slow
  orbit = luxury/consideration; locked = confidence/clarity. Motion of the frame
  itself must mean something (scene3d camera, gradient-field drift).
- **CC-CAM-2 — Restraint reads as premium.** One considered move per shot. Busy
  camera = cheap. Nothing/Apple move the camera rarely and slowly.
- **CC-CAM-3 — Negative space is composition.** The subject is placed, not
  centered by default. Off-center with breathing room reads designed.

## 4. Typography philosophy (CC-TYPE)

- **CC-TYPE-1 — Type is the voice.** Ultralight/large = confidence and calm
  (Apple); tight grotesk = technical precision (Linear/Stripe); serif = editorial
  warmth. Weight and tracking carry brand personality — choose them from the brief.
- **CC-TYPE-2 — One type idea per film.** A display voice + a support voice. Three
  competing type treatments is slop. (Extends MO-TYPE.)
- **CC-TYPE-3 — Words appear the way they're meant to be read.** A confident claim
  cuts in whole; a considered thought reveals by line; a typed input types. Motion
  matches meaning (line-reveal, blur-focus, type-in).
- **CC-TYPE-4 — Copy is designed.** Short, declarative, one thought per card. If a
  line needs two breaths to read, it's two cards or it's cut.

## 5. Colour & light philosophy (CC-COL)

- **CC-COL-1 — Palette is emotion.** Near-black + one accent = premium restraint;
  warm paper = editorial/human; single saturated hue = energy. The palette is a
  decision from the brief, never a default.
- **CC-COL-2 — Light models depth.** A single key with soft fill and a rim reads
  expensive; flat even light reads like a template (scene3d PMREM + key/rim).
- **CC-COL-3 — Contrast is hierarchy.** The eye goes to the brightest, most
  saturated thing. Spend that budget on the hero, starve everything else.

## 6. Composition & hierarchy philosophy (CC-COMP)

- **CC-COMP-1 — Attention is authored.** One hero is a useful default, not a
  release law. Ensembles, split attention, simultaneity, and deliberate
  competition are valid when the intended viewing path is explainable.
  MO-CHOR-2 is therefore an audited style flag, not a veto.
- **CC-COMP-2 — Alignment is invisible quality.** Elements share edges and a grid.
  Misalignment is the fastest tell of AI slop.
- **CC-COMP-3 — Density signals register.** Sparse = luxury; dense = utility/data.
  Match density to the emotion, not to how much you have to say.

## 7. Brand philosophy (CC-BRAND)

- **CC-BRAND-1 — The film inherits the brand, not a generic aesthetic.** Palette,
  type, motion personality, and density come from the brand's own language
  (ingested, not invented). A CRED film and a Google film should never be
  swappable.
- **CC-BRAND-2 — Consistency across a body of work.** Style Memory keeps a brand's
  choices stable across films (ADR-0012). The second video for a client looks
  like the first on purpose.
- **CC-BRAND-3 — Brand evidence is named and locked.** A Brand System cites only
  Intake sources explicitly assigned the brand role; a logo, font, or guideline
  cannot enter as unattributed “inspiration.” The Score binds the exact locked
  Brand digest. *(schema + conformance, ADR-0040)*
- **CC-BRAND-4 — Brand rules survive verbatim before interpretation.** Each
  locked rule exists as the same Intake constraint, and must-level rules reach
  Direction by ID. Structural survival is not proof of beautiful expression.
  *(conformance, ADR-0040)*
- **CC-BRAND-5 — Palette roles reach executable Style.** Background, surface,
  primary, accent, text, dim text, and on-media values match the locked Brand
  System exactly; the agent cannot quietly substitute a house palette.
  *(conformance, ADR-0040)*
- **CC-BRAND-6 — Typography reaches pixels without substitution.** Families,
  weights, tracking, local font paths, and source provenance match the locked
  Brand System. Final optical quality still requires full-resolution review.
  *(schema + compiler + conformance, ADR-0040)*

## 8. How this becomes measurable (the path from taste to gate)

- **CC-PROD-1 — Capability claims are literal.** Direction support states must
  match the versioned capability registry. An unsupported must-have cannot pass
  Direction; a lower-priority unsupported requirement remains an explicit
  finding and is never described as delivered. *(schema + creative conformance)*
- **CC-PROD-2 — Asset-assisted means the asset reaches pixels.** A required
  asset-assisted capability names a project-local path, and the Score must
  actually render that path. A nearby native primitive is not a substitute.
  *(schema + creative conformance)*
- **CC-PROD-3 — Direction earns animation.** When a brief delegates a material
  concept choice, two to four genuinely different Directions are tested through
  comparable identity-free still probes before one advances. Exact approved
  Directions and reconstruction jobs may skip with an explicit reason. Pixel
  difference detects duplicates; it never chooses taste. *(ADR-0036 receipt)*

- **CC-FRAME-1 — The approved frame resolves to visible subjects.** A scene's
  optional Frame System contract names its focal target and intended
  reading-order targets; each must exist and paint visible pixels at the
  representative rendered frame. Sequence quality remains review metadata
  rather than inferred from coordinates. *(hard; rendered paint + geometry —
  ADR-0045)*
- **CC-FRAME-2 — Authored alignments survive pixels.** Alignment is neither a
  demand for symmetry nor a universal grid. When the Frame Designer explicitly
  declares a shared edge/axis, browser geometry must remain inside its stated
  tolerance. *(hard; rendered geometry — ADR-0045)*
- **CC-FRAME-3 — Authored spacing survives pixels.** A declared ordered
  horizontal/vertical gap must remain inside its stated range. Undeclared
  overlaps, asymmetry, density, and optical balance remain contextual review
  rather than fake universal math. *(hard; rendered geometry — ADR-0045)*

Each principle above is a hypothesis about quality. The Chitra method: state it,
find a deterministic or VLM-scored proxy, calibrate against labelled examples,
then promote it to a `CC-*` gate in the Creative QA layer (M4). Examples already
tractable: CC-NARR-4 (wordmark scene index vs total), CC-RHY-4 (time budget of the
final beat), CC-TYPE-2 (count of distinct display treatments), CC-COMP-1 (already
MO-CHOR-2), CC-NARR-2 (a "tension" beat must precede the "resolution" beat in the
storyboard). What cannot yet be measured is scored by the calibrated critic and
tracked honestly — never asserted as passing without evidence.

## 9. What this constitution refuses

- Motion, colour, or type chosen because it "looks cool" with no narrative reason.
- Feature-listing in place of a single feeling.
- Perpetual motion / never resting (screensaver, not film).
- Generic "AI aesthetic": purple gradients, centered everything, even pacing,
  three fonts, a logo that opens the film. These are slop signatures; refuse them.
