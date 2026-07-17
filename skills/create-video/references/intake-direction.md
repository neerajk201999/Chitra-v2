# Intake, capability fit, and direction

Load this file only while understanding inputs, researching, directing, and
storyboarding.

## Intake

Inventory the objective, audience, single message, register, duration, claims,
brand rules, preferences, anti-references, supplied sources, rights, and open
questions. Ask only for a missing decision that materially changes the film.

- Prompt only: infer a specific concept; do not invent product facts.
- Reference: run `chitra decompose`; transferable grammar is not reusable
  branding, copy, pixels, audio, or identity.
- Images/screenshots/brand assets: inspect directly, copy to project-local
  `assets/`, preserve faithfully, and record provenance.
- Links: research with the host agent. Capture only visuals that enter the film.
- Footage/audio: probe first; transcribe when speech controls narrative; measure
  landmarks before beat-addressed motion.
- `reference-only`/`unknown` bytes cannot enter a render. `owned`/`licensed`
  claims come from the user and remain their responsibility.

Write `intake.json` from `core/src/intake/schema.ts` only when a narrow schema
question requires it; otherwise reuse benchmark/example shapes. Run:

```bash
chitra intake intake.json -o intake.lock.json
```

Resolve `blocksDirection` questions before planning. Never invent hashes or
rights. URLs that matter visually must be captured locally and relocked.

## Production approach gate

Run `chitra capabilities --json` and read `capability-matrix.md` beside this
reference. Before Direction, draft a compact
table:

```text
requirement | importance | native/asset-assisted/unsupported | proof or asset | risk
```

Every must-have and hero requirement appears once, then becomes a typed entry in
`direction.productionApproach.requirements` with capability ID, registry support,
approach, acceptance test, and a project-local `assetPath` when asset-assisted.
A requested look is not
feasible merely because a similarly named primitive exists. “3D slab” does not
satisfy “premium custom industrial product with reflections and shadows.”

## Direction

Write `direction.json` with one governing concept, emotional promise, tension,
resolution, visual thesis, sound thesis, narrative arc, and 4–8 causal beats.
Trace the user's objective/constraints verbatim and cite only locked source,
preference, brand, and assumption IDs. Run:

```bash
chitra conform intake.lock.json direction.json
```

The concept must make a recognizable choice. Category defaults (“dark, sleek,
glowing, futuristic”) are not a concept. Test it by asking whether a competent
designer could swap in a competitor name without changing the film. If yes,
restart Direction.

## Storyboard

Write `storyboard.json`. Each shot needs: bound Direction beat, reason, why now,
subject/hero, composition and negative space, camera plus reason, approved copy,
color/light intent, sound intent, target duration, and motivated transition.

Use one visual purpose per shot, but do not confuse purpose with visual
emptiness. Density follows the brief and hierarchy. Cuts must create a causal
sentence: because this changed, the next shot becomes inevitable.

Run:

```bash
chitra board storyboard.json
chitra conform direction.json storyboard.json
```

Show the compact shot list and unresolved production risks. Approval may be
delegated by the user; never pretend a structural conformance pass is approval.
