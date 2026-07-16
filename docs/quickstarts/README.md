# Quickstarts

The canonical, current platform matrix is [Install and use Chitra](../INSTALL.md).
The source install below requires access to the private repository; npm publish
and outside-user timing are still release gates.

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git && cd Chitra-v2
npm install -g ./core
chitra probe                   # verifies ffmpeg + vendored Chrome
mkdir my-film && cd my-film
chitra intake intake.json -o intake.lock.json # after the agent inventories the brief and sources
chitra init . --style night --title "My film"
chitra check score.json && chitra render score.json -o out.mp4 -q draft
```

With a reference, run `chitra decompose reference.mp4 -o style-dna.json` first.
It produces reproducible media, shot, palette, motion, and audio measurements
plus one evidence frame per detected shot; semantic intent remains explicitly
unmeasured for the agent to annotate from evidence.

- **Claude Code / Codex** — use the tested native marketplace commands in the install guide, or open the repository directly.
- **Cursor / Gemini CLI** — open the repository or install the canonical skills with the explicit harness command in the install guide.
- **Anything else** — install with `npx skills` when supported, or point the agent at `AGENTS.md`.

Audio ships in `core/audio-library/` (synthesized, license-free); reference e.g.
`"music": {"src": "path/to/pulse-bed.m4a"}` or generate your own with `chitra bed` / `chitra sfx-kit`.
