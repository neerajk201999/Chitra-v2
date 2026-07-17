# Visual review, revision, and release

Load after the hero still passes and a motion preview exists.

## Cheap-to-expensive loop

1. `chitra evidence score.json -o out/evidence`
2. Inspect full-size hero frames, contact sheet, and cut strips.
3. `chitra check score.json`
4. `chitra render score.json -o out/preview.mp4 -q draft`
5. Watch the preview with sound from start to finish.
6. Patch only evidence-cited IR spans; repeat at most three times.

Draft uses sampled JPEG capture for direction/motion review. It is not suitable
for compression, fine texture, or final frame-fidelity decisions.

## Isolated first watch

Before reading the brief, Score, gate output, or prior critique, record:

- what the film appears to be about;
- where attention goes in each shot;
- the emotional turn and whether it lands;
- moments that feel generic, accidental, cluttered, empty, cheap, or stalled;
- sound/motion events that feel unmotivated;
- the strongest and weakest frame/transition.

Then reconcile with Direction and Storyboard. Use the `critique-video` contract
for evidence-bound findings. Each finding names scene, time/frame, IR path,
severity, observed defect, smallest correction, and expected perceptual effect.

Static/frame gates catch measurable floors. They do not prove that lighting,
product form, concept, narrative, taste, sound, or pacing is professional.

## Release

Only after preview revisions and full-resolution evidence:

```bash
chitra release intake.lock.json direction.json storyboard.json score.json \
  -o out/final.mp4 -e out/evidence -r out/release.json -q high
chitra verify-release out/release.json
```

Deliver final video, receipt, contact sheet, elapsed time, and every remaining
limitation. If the same P1/P2 or visual defect survives a targeted revision,
record it as a capability/system gap rather than spending unbounded tokens.

