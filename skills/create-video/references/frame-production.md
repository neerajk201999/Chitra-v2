# Frame, motion, and sound production

Load this after the Storyboard is approved for an open or multi-shot film. The
roles may be separate agents or deliberate passes by one host. They never
maintain separate versions of creative truth: every pass edits a staged Score.

## Frame Designer → `board.score.json`

Reads the selected Direction, Storyboard, relevant locked sources/assets, and
the creative constitution.

Owns `style`, static scene backgrounds, elements, local groups, assets,
compositing, and each scene's `frame` contract. Use native `group.layout`
free/stack/grid rather than hand-tuned coordinates when relationships should
reflow. Grid child percentages are cell-relative; choose stack
`itemSizing: "equal"` for equal cells or `"intrinsic"` for group-relative item
sizes. Use a reasoned text `treatment` only when the type-role default is
optically wrong.

Set `frame.representativeMs` when the most informative composed state is not the
scene midpoint; it must occur inside the scene.

Does not decide choreography, transitions, SFX, or final audio. Keep
`choreography` empty and transitions as cuts. A frame contract is not a demand
for symmetry or a template: declare only the focal/reading/alignment/gap
relationships the selected composition actually intends.

Render full-resolution evidence for every shot. A schema-green board with weak
hierarchy, generic visual language, unearned ornament, or bad product truth is
not accepted. Figures remain the bespoke HTML/UI path, but arbitrary figure CSS
is not described as theme-pure; native text/groups are preferred when
structural inspection matters.

## Motion Designer → `motion.score.json`

Reads the accepted board, Storyboard transition/camera intent, and relevant
music/narration landmarks.

Owns only `choreography` and `transitionOut`. Accepted style, frame contracts,
static elements, assets, scene order, and duration remain unchanged. If motion
reveals a frame-design or editorial defect, redirect it instead of silently
redesigning the shot.

Prove the hero motion first. Compose the opening and resolved state, use
relational/beat/word timing, and inspect backward/random seeks and adjacent
seams.

```bash
chitra stage-check board.score.json motion.score.json \
  --transition board-to-motion
```

## Sound/Editor → `score.json`

Reads the accepted motion Score, locked narration/music, Storyboard audio
intent, and rendered motion evidence.

Owns root `audio` and choreography-bound `sfx`. Scene order/duration and the
visual/motion graph remain unchanged. If the cut needs retiming, return to the
animatic/editorial checkpoint and invalidate affected motion.

Use exact narration words or measured beats. Sound marks meaning, material,
scale, and edit structure; silence and counterpoint are valid.

```bash
chitra stage-check motion.score.json score.json \
  --transition motion-to-master
```

## Parallel work

Parallel Frame Designers are useful only after the film-wide visual system,
assets, shot purposes, and shared component APIs are locked and shots have low
seam coupling. Give each worker only its shot, sources, and acceptance tests.
One Art/Creative lead reviews the all-shot board for coherence before motion.
Never let multiple workers edit the same scene or infer the film-wide grammar
independently.

Stage checks prove role ownership. Rendered frame gates prove declared spatial
intent. Neither proves originality or top-tier taste; those require watched
evidence, isolated critique, and independent calibration.
