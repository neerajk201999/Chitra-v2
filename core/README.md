# chitra-video

The deterministic core of [Chitra v2](https://github.com/neerajk201999/Chitra-v2) — the AI-native OS for cinematic video creation. Decompose references, validate, gate, render, and generate critic evidence for Motion IR scores. No LLM calls inside; your coding agent does the reasoning, this package does the pixels.

Requires Node 22.12+ and ffmpeg on PATH. The bundled Chrome downloads on first install (via puppeteer).

```bash
npm i -g chitra-video
chitra init --style night --title "My film"   # gate-passing starter score
chitra decompose reference.mp4 -o style-dna.json # measured reference facts + shot evidence
chitra check score.json                        # schema + static + rendered-frame gates
chitra frame score.json -t 1800 -o peek.png    # one-frame preview
chitra render score.json -o out.mp4 -q high    # deterministic; refuses P1 findings
chitra evidence score.json -o evidence/        # contact sheet + hero frames + cut strips
```

Agent skills, the motion language, examples, and all documentation live in the [main repository](https://github.com/neerajk201999/Chitra-v2). MIT.
