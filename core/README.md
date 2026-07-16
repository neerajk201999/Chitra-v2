# chitra-video

The deterministic core of [Chitra v2](https://github.com/neerajk201999/Chitra-v2) — the AI-native OS for cinematic video creation. Lock multimodal intake provenance, decompose references, validate, gate, render, and generate critic evidence for Motion IR scores. No LLM calls inside; your coding agent does the reasoning, this package handles typed contracts and pixels.

Requires Node 22.12+ and ffmpeg on PATH. The bundled Chrome downloads on first install (via puppeteer).

```bash
npm install -g chitra-video
chitra probe
chitra intake intake.json -o intake.lock.json # objective + mixed-source provenance
chitra creative-check intake.lock.json direction.json storyboard.json score.json # intent conformance
chitra init --style night --title "My film"   # gate-passing starter score
chitra decompose reference.mp4 -o style-dna.json # measured reference facts + shot evidence
chitra compare reference.mp4 out.mp4 -o comparison.json # aligned pixel/audio-energy evidence
chitra check score.json                        # schema + static + rendered-frame gates
chitra frame score.json -t 1800 -o peek.png    # one-frame preview
chitra render score.json -o draft.mp4 -q draft # diagnostic draft; refuses static P1 findings
chitra evidence score.json -o evidence/        # contact sheet + hero frames + cut strips
chitra release intake.lock.json direction.json storyboard.json score.json -o out/final.mp4 -e out/evidence -r out/release.json
chitra verify-release out/release.json          # verify the bound release artifacts
```

The npm package is the deterministic CLI. For the complete agent workflow,
clone and open the public repository in Claude Code, Codex, Cursor, or Gemini:

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
```

Agent skills, the motion language, examples, and all documentation live in the
[public repository](https://github.com/neerajk201999/Chitra-v2). MIT.
