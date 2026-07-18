# Chitra multidisciplinary craft model

This is the shared review vocabulary for a virtual team comprising a creative
director, strategist, writer, art director, graphic designer, motion designer,
editor, sound designer, product specialist, and finishing artist. It defines
conditions for good work; it does not prescribe one aesthetic.

The machine-readable principle registry is `CRAFT_PRINCIPLES` in
`core/src/creative/review.ts`. `CR-*` principles are review hypotheses. They
become release gates only after independent labels demonstrate useful recall
and an acceptable false-positive rate.

## The operating definition of quality

World-class output is not a maximum effects count. It is the alignment of five
things:

1. **Intent** — one audience, job, promise, proof standard, and intended feeling.
2. **Selection** — a governing idea decides what to show and what to remove.
3. **Attention over time** — image, motion, edit, copy, and sound hand the eye and
   ear to the right information at the right moment.
4. **Specificity** — the work could not survive a logo swap and still mean the
   same thing.
5. **Finish** — every frame, transition, sound, and claim survives realistic
   viewing and evidence-bound critique.

No scalar “taste score” represents this. Hard constraints block. Individual
craft domains are assessed as exceptional/strong/acceptable/weak/blocking, with
confidence and evidence. Tradeoffs remain visible to the director and user.

## Precise creative-system definitions

These terms are separate controls, not interchangeable mood words. Measurable
characteristics are diagnostic proxies; subjective judgment remains evidence-
bound and calibrated against watched work.

| System | Operational definition | Measurable characteristics | Irreducibly judged component |
|---|---|---|---|
| Taste | selection and omission that make all craft choices serve intent in a specific context | defect rate, exception reasons, preference consistency, blind choice | whether the selection feels inevitable and distinctive |
| Motion | authored change of visual state that communicates meaning, causality, hierarchy, or feeling | paths, properties, velocities, easing, overshoot, settle, continuity | whether movement belongs to the subject and moment |
| Timing | duration and placement of an event relative to perception and surrounding events | frames, reading time, beat offset, anticipation/settle length | whether the event arrives at the emotionally right instant |
| Rhythm | patterned contrast between activity and rest across time | event density, hold distribution, cut intervals, energy curve | whether variation builds attention rather than merely changing speed |
| Composition | spatial organization of attention and relationships inside a frame | alignment, bounds, scale ratios, saliency proxy, negative-space distribution | whether the frame feels intentionally resolved |
| Typography | verbal meaning embodied through type choice, scale, spacing, lineation, and motion | size, contrast, line length, reading duration, treatment count | whether the voice and cadence fit the brand and statement |
| Visual hierarchy | ordered probability of what a viewer notices and understands | saliency/contrast/scale ordering, overlap, eye-trace handoff | whether the intended priority is immediately legible |
| Camera language | framing and viewpoint change used as a narrative verb | FOV, position, rotation, parallax, shot scale, move count | what intimacy, confidence, discovery, or power the viewpoint communicates |
| Narrative | causal organization of information and feeling toward a change/payoff | beat roles, premise trace, tension-before-resolution, payoff time budget | whether the audience cares about and believes the change |
| Pacing | allocation of screen time to comprehension, tension, surprise, and rest | shot duration, copy load, task completion time, acceleration/release | whether the film feels urgent, calm, dense, or luxurious for the right reason |
| Brand consistency | recognizable continuity of visual, verbal, motion, and sonic decisions | token/source adherence, cross-film deltas, scoped accepted revisions | whether the work belongs to this brand rather than its category |
| Creative quality | coherence of intent, selection, attention, specificity, truth, and finish in the watched result | gates plus domain judgments and blind preference | the achieved feeling and memorable authored point of view |

Chitra reasons about these systems in Direction/Storyboard fields, executes
addressable decisions in Score, measures available proxies in gates/evidence,
records semantic judgment in Creative Review, calibrates it through independent
panels, and retains only explicit evidenced outcomes through ADR-0032.

## What each discipline decides

| Discipline | Decisions | Evidence | Common failure |
|---|---|---|---|
| Strategy/brief | audience, job, single promise, proof, channel, constraints | Intake and source trace | attractive film solving the wrong problem |
| Narrative | premise, tension, causality, reveal order, emotional arc, payoff | Direction, storyboard, first-watch read | feature list with no change or earned close |
| Direction | governing idea, point of view, tone, attention target, metaphor, omission | concept and per-beat intent | mood words without a selecting idea |
| Art direction | brand codes, image world, type voice, palette, material, light, motif | references, brand assets, hero frames | category-default aesthetic or logo-swap work |
| Composition | eye trace, hierarchy, grid, scale, balance, negative space, density | full-resolution hero frames | centered defaults, competing heroes, accidental alignment |
| Typography/copy | verbal voice, line length, hierarchy, timing, line break, reading cadence | copy trace and rendered text | long claims, weak hierarchy, type unrelated to meaning |
| Motion | motivation, property, path, timing, physics, anticipation, settle, rest, continuity | motion clips and frame sequences | every element moving, same entrance, decorative bounce |
| Camera/3D | framing, lens/FOV, move, parallax, material response, lighting continuity | sequential frames and 3D state | camera without meaning, floating product, flat light |
| Edit | shot function/order, cut motivation, eye trace, contrast, handles, transition family | cut strips with audio | metronomic cuts, overcoverage, transition as decoration |
| Sound | voice performance, music arc, ambience, sync, motif, perspective, dynamics, silence, mix | waveform/measurements plus listening | constant bed, generic whooshes, flat TTS, no silence |
| Product truth | accurate interaction, claim/data provenance, useful proof | captured product/source trace | fabricated UI, unsupported metric, demo too fast to understand |
| Finishing/access | color continuity, artifacts, loudness, legibility, reduced-motion/limited-hearing meaning | final mux and realistic-size review | polish that disappears on the actual channel |

## Motion decisions at frame level

A strong motion designer does not independently decorate frames. They author a
state change and control how attention travels between states:

- **Why move?** Communicate causality, state, spatial relation, hierarchy, or
  emotional emphasis. Otherwise hold.
- **What moves?** Spend motion on the hero; supports respond with lower amplitude
  or remain stable.
- **Which property?** Spatial properties may overshoot when the material and
  register support it. Opacity and color effects should not physically bounce.
- **How far and how large?** Timing follows perceived distance, object scale,
  mass/material, and the viewer's reading task—not one global duration.
- **How does it start and settle?** Anticipation, acceleration, follow-through,
  and settle must belong to the subject. Repeated oscillation is not “alive.”
- **Where is the stable reference?** Preserve spatial continuity unless a
  deliberate discontinuity earns attention.
- **What is the energy curve?** Vary attack, density, and rest. A premium film
  can hold; a kinetic film still needs contrast.
- **What happens on interruption or random seek?** Authored state remains exact
  and deterministic.

Material 3’s current motion system supports the underlying separation: choose
a product-level motion scheme, distinguish spatial springs from effect springs,
and vary speed by element size. Apple’s motion guidance independently stresses
purpose, realistic spatial expectation, brevity, restraint, optionality, and a
stable frame of reference.

## Editorial and narrative priority

When objectives conflict, use the editorial order adapted from Walter Murch’s
*Rule of Six*: emotion, story, rhythm, eye trace, two-dimensional continuity,
then three-dimensional continuity. This is not permission for continuity
mistakes; it prevents technical smoothness from destroying the feeling or idea.

For every cut ask:

1. What changed in meaning or emotion?
2. Why this frame rather than six frames earlier or later?
3. Where does the eye land next?
4. Does sound lead, punctuate, bridge, or deliberately drop out?
5. Did the outgoing moment get enough air, and does the incoming frame begin
   composed rather than mid-transition?

## Flexible without becoming arbitrary

Chitra separates three layers:

- **Invariants:** truth, legibility, evidence, intent trace, deterministic state,
  motivated decisions, accessibility, and no silent degradation.
- **Profiled choices:** narrative explicitness, visual variance, information
  density, motion intensity, camera presence, materiality, sonic density, and
  brand strictness. These are contextual priors, not quality scores.
- **Authored exceptions:** a reasoned decision may break a house rule when its
  evidence and intended effect are explicit.

This allows an Apple-like restrained product film, a Google-like illustrative
launch, a CRED-like luxury turn, or a dense product demo to be excellent for
different reasons while sharing the same proof discipline.

## Capability architecture and integration policy

| Layer | Current substrate | Candidate extensions | Integration rule |
|---|---|---|---|
| Motion/2D | HTML/CSS/SVG + GSAP + typed tracks | masks, mattes, blend modes, motion blur | add only for a measured target residual and gate the new surface |
| 3D | Three.js curated primitives/tracks | glTF, broader materials, shadows, depth of field | local rights-traced assets; no arbitrary scene script by default |
| Edit interchange | Chitra Score and comparator | OpenTimelineIO import/export | adapter around Chitra IR; never replace intent artifacts with an EDL |
| Tracking/analysis | FFmpeg + rendered DOM/pixels | OpenCV optical flow/tracking; saliency models | analysis-only first; benchmark accuracy before automatic edits |
| Color/finishing | sRGB browser + FFmpeg | OpenColorIO/LUT pipeline | require cross-machine color tests and explicit delivery transform |
| Sound | FFmpeg mix, SFX, beats, loudness | narration timing, clip audio, automation, Essentia-class features | typed timeline and final-bus measurement; no provider lock-in |
| Assets | local provenance and browser capture | CLIP-style retrieval/MMR, stock/provider adapters | rights and byte lineage before ranking; adapters stay optional |
| Generated media | user-provided/generated local assets | image/video/TTS providers | provider-neutral manifests, approved samples, cost and provenance logs |
| Quality | deterministic gates + evidence + typed review | optical flow, saliency, learned taste scorer | advisory until calibrated; never train/evaluate on leaked labels |

Libraries are substrates, not taste. Chitra should reuse mature capabilities
through narrow adapters and preserve its own intent, provenance, deterministic
clock, and review contracts. A dependency is added only when a benchmark proves
it closes a real gap better than the existing stack.

## Incremental program

1. **Judgment contract (ADR-0029):** typed evidence-bound Creative Review,
   principle IDs, hidden-label scoring, and explicit confidence/uncertainty.
2. **Independent calibration (ADR-0030):** use the pre-registered blind-panel
   protocol in `benchmarks/independent-calibration`; at least 20 cases across
   brand-film, product-demo, and social-short; at least three human reviews per
   case; motion clips and audio, not contact sheets alone.
3. **Accepted-revision memory:** store evidence → finding → accepted/rejected
   change → measured outcome; keep brand memory separate from universal craft.
4. **Directorial search:** generate bounded narrative/storyboard alternatives,
   render probes, compare without exposing labels, and preserve the winner’s
   reasoning.
5. **Neutral ChitraBench:** identical brief/assets/model/time budget, real
   HyperFrames/Remotion baselines, blind preference, failures published.
6. **Residual-driven capability expansion:** compositor, audio, 3D, asset, and
   interchange adapters only where benchmark evidence identifies the blocker.

## Sources and lineage

- Apple Human Interface Guidelines, Motion:
  https://developer.apple.com/design/human-interface-guidelines/motion
- Material 3, Motion physics system:
  https://m3.material.io/styles/motion/overview
- Walter Murch, *In the Blink of an Eye*, “Rule of Six.”
- Impeccable current critique/craft/animate contracts, inspected at
  https://github.com/pbakaus/impeccable (2026-07-16).
- OpenMontage taste-direction, cinematic edit-director, and voice-performance
  contracts, inspected at https://github.com/calesthio/OpenMontage (2026-07-16).

These are inputs, not authorities. Chitra’s principles remain hypotheses until
its own independently labelled motion-design evidence supports them.
