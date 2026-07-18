# chitra-video

The deterministic core of [Chitra v2](https://github.com/neerajk201999/Chitra-v2) — the AI-native OS for cinematic video creation. Lock multimodal intake provenance, decompose references, validate, gate, render, and generate critic evidence for Motion IR scores. No LLM calls inside; your coding agent does the reasoning, this package handles typed contracts and pixels.

Requires Node 22.12+, FFmpeg on `PATH`, and installed Chrome, Chromium, or Edge.
Chitra uses `puppeteer-core` and does not download a browser during install.

```bash
# Stable registry command (public registry currently serves 0.4.0):
npm install -g chitra-video
chitra probe
chitra capabilities --json                     # native/assisted/unsupported truth
chitra intake intake.json -o intake.lock.json # objective + mixed-source provenance
chitra transcript-lock transcript.json -o transcript.lock.json --project . # exact footage + word timing
chitra transcript-pack transcript.lock.json -o transcript-pack.md --project . # compact phrase context
chitra brand-lock brand.json --project . -o brand.lock.json # lock reusable brand evidence and local fonts
chitra brand-conform brand.lock.json intake.lock.json direction.json score.json # exact brand survival
chitra edit-check transcript.lock.json edit.json --project . # exact quote/word/source contract
chitra edit-render transcript.lock.json edit.json --project . -o assets/edit.mp4 # clip audio + receipt
chitra edit-evidence transcript.lock.json edit.json --project . -o edit-evidence --segment opening proof # bounded filmstrip/waveform/cut evidence
chitra direction-search-lock intake.lock.json search.json --project . -o search.lock.json # lock comparable concepts
chitra direction-probes intake.lock.json search.lock.json --project . -o direction-probes # blind still packet
chitra direction-select direction-probes/SEARCH_DIGEST/manifest.json selection.json -o selection-receipt.json
chitra creative-check intake.lock.json direction.json storyboard.json score.json # intent conformance
chitra init --style night --title "My film"   # gate-passing starter score
chitra decompose reference.mp4 -o style-dna.json # measured reference facts + shot evidence
chitra compare reference.mp4 out.mp4 -o comparison.json # aligned pixel/audio-energy evidence
chitra check score.json                        # schema + static + rendered-frame gates
chitra frame score.json -t 1800 -o peek.png    # one-frame preview
chitra evidence score.json -o evidence/        # inspect hero stills before motion
chitra render score.json -o draft.mp4 -q draft # 12fps half-resolution diagnostic; never release
chitra memory-validate revision-memory.json     # scope-safe accepted/rejected outcomes
chitra memory-context revision-memory.json --brand acme --max-chars 6000
chitra release intake.lock.json direction.json storyboard.json score.json -o out/final.mp4 -e out/evidence -r out/release.json # add --brand for brand-bound Scores
chitra verify-release out/release.json          # verify the bound release artifacts
```

For the current SHA-pinned 0.5.0 prerelease command, use the public repository's
[install guide](https://github.com/neerajk201999/Chitra-v2/blob/main/docs/INSTALL.md).
The package README deliberately does not embed a candidate's own immutable URL;
doing so would change the candidate bytes after its URL and digest are assigned.

The npm package is the deterministic CLI. For the complete agent workflow,
clone and open the public repository in Claude Code, Codex, Cursor, or Gemini:

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
```

Agent skills, the motion language, examples, and all documentation live in the
[public repository](https://github.com/neerajk201999/Chitra-v2). MIT.
