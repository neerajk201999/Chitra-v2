# Workflow research and the product wedge

**Date:** 2026-07-18. This translates observed production work into product
priorities. It distinguishes creative leverage from automatic asset generation.

## Where people actually spend effort

| Workflow | Repetitive/manual work | Failure users care about | AI-native opportunity |
|---|---|---|---|
| Product launch film | mine product truth, choose one claim, capture UI, write beats, rebuild brand styles, align many micro-motions, revise stakeholder notes | generic feature list, fabricated UI, no payoff, inconsistent brand | source-grounded brief, brand extraction, 2–3 concept probes, exact trace from claim to pixels, surgical revisions |
| Product demo | record clean states, remove waiting/errors, zoom/crop, add cursor/callouts, preserve readability, sync narration | confusing task flow, rushed UI, fake behavior, tiny text | interaction-state extraction, task-aware holds, transcript/UI event alignment, automatic legibility gates |
| Raw-footage edit | transcribe, compare takes, remove filler, find word boundaries, hide jump cuts, grade/mix/caption | pops, jump cuts, lost meaning, endless footage review | compact transcript EDL, targeted filmstrips, cut-boundary QA, retained editorial rationale |
| Social short | find hook, compress setup, reframe, caption, maintain safe zones, create pattern changes | slop captions, exhausting pace, weak first second | retention-aware alternatives constrained by brand and meaning; platform-specific gates |
| Brand film | find a governing metaphor, curate references, design motif/type/sound, protect emotional arc, finish details | logo-swap aesthetic, decorative movement, unearned close | reference retrieval by creative problem, divergent concepts, hero-frame approval, evidence-bound critique |
| Data/story motion | select proof, normalize data, design comparisons, sequence reveals, verify claims | chart junk, illegible density, unsupported claims | source-linked data grammar, attention-aware progressive disclosure, claim provenance |

## The mass-use problem Chitra should own

The wedge is **directed launch and product-story video from messy mixed inputs**:
a prompt plus any combination of website, screenshots, product footage, brand
files, data, references, and stakeholder preferences. Existing renderers make
pixels programmable. Existing generation products make assets. The expensive
work left to the user is deciding what the film is, preserving product truth,
turning a brand into motion rules, finding mistakes in the watched result, and
making feedback change only what it should.

Chitra should make that loop automatic and inspectable:

1. inventory and lock source truth;
2. infer uncertainties and ask only decisions that materially change direction;
3. retrieve/create references for a stated creative problem, with rights trail;
4. pitch a small set of genuinely different governing concepts;
5. approve cheap hero-frame/storyboard probes before animation;
6. compile the winner into deterministic motion;
7. watch objective evidence and run calibrated critique;
8. revise addressable artifacts rather than regenerate the film;
9. retain accepted/rejected outcomes within the correct project/brand scope.

This is more defensible than “prompt to video”: it removes coordination and
decision effort while keeping authorship, evidence, and reversibility.

## What top-tier practice changes

Top work is not the most common style, the highest effect count, or consensus
of internet examples. It is a coherent authored exception: one selecting idea,
specific source material, deliberate attention over time, controlled contrast,
and finish appropriate to the delivery context. Chitra therefore treats
references as evidence for a problem—not a popularity vote—and maintains:

- invariants: truth, legibility, provenance, deterministic state, motivated
  decisions, accessibility, and no silent degradation;
- contextual profiles: register, brand, audience, channel, density, motion
  energy, narrative explicitness, and sonic hierarchy;
- authored exceptions: a rule may be broken only with a reason and a watched
  acceptance outcome.

## Research-to-system mapping

| Finding | Implemented foundation | Next executable proof |
|---|---|---|
| Whole-video context is wasteful | progressive skills, sampled evidence, bounded release gates, ADR-0034/0035 locked transcript/EDL plus requested word filmstrips, waveforms, and cut strips | test outside-user decision speed and add visual-event addressing only if needed |
| Motion cannot rescue bad direction | ADR-0036 bounded Directions, comparable identity-free still probes, and selection receipt | collect independently reviewed searches and accepted/rejected outcomes |
| Rules do not equal taste | Creative Review and independent study contracts | collect ≥20 real cases with motion/audio |
| Feedback is repeatedly lost | ADR-0032 accepted-revision memory | outside-user ledger entries and measured retrieval usefulness |
| Brand choices leak into generic defaults | Intake provenance and scoped memory | BRAND IR from real site/assets with motion personality |
| Feature breadth can hide false delivery | machine-readable capability support | acceptance probes per important capability |
| “Better” invites self-deception | reference metrics and study protocol | preregister and run ChitraBench against real baselines |

## Ordered product program

1. Publish and externally verify lightweight `0.5.0`; instrument only explicit,
   consented first-use facts.
2. Measure ADR-0034/0035's provider-neutral edit/evidence loop with outside
   footage; keep transcription providers optional.
3. Test ADR-0036 still-first search with outside users; measure whether it lowers
   wasted full-timeline work and improves blind Direction preference.
4. Collect independent reviews and real accepted-revision records.
5. Add masks/compositions, Lottie/Rive, 3D, audio, or backend breadth only where
   a fixed film or outside workflow proves the missing substrate is causal.
6. Run neutral ChitraBench and publish losses as well as wins.
