# chitra-video

The deterministic core of [Chitra v2](https://github.com/neerajk201999/Chitra-v2) — the AI-native OS for cinematic video creation. Lock multimodal intake provenance, decompose references, validate, gate, render, and generate critic evidence for Motion IR scores. No LLM calls inside; your coding agent does the reasoning, this package handles typed contracts and pixels.

Requires Node 22.12+ and ffmpeg on PATH. The bundled Chrome downloads on first install (via puppeteer).

```bash
# Current source install from the cloned repository; npm publication is pending.
npm install -g ./core
chitra intake intake.json -o intake.lock.json # objective + mixed-source provenance
chitra creative-check intake.lock.json direction.json storyboard.json score.json # intent conformance
chitra init --style night --title "My film"   # gate-passing starter score
chitra decompose reference.mp4 -o style-dna.json # measured reference facts + shot evidence
chitra compare reference.mp4 out.mp4 -o comparison.json # aligned pixel/audio-energy evidence
chitra check score.json                        # schema + static + rendered-frame gates
chitra frame score.json -t 1800 -o peek.png    # one-frame preview
chitra render score.json -o out.mp4 -q high    # deterministic; refuses P1 findings
chitra evidence score.json -o evidence/        # contact sheet + hero frames + cut strips
```

Do not run `npm i -g chitra-video` until the package is published; the registry
currently returns 404.

Agent skills, the motion language, examples, and all documentation live in the [main repository](https://github.com/neerajk201999/Chitra-v2). MIT.
