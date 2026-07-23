# Install and use Chitra

Chitra has two parts: the `chitra` CLI performs deterministic video work, while
agent skills direct and critique the film. Install both for the complete loop.

Requirements: Node.js 22.12+, FFmpeg on `PATH`, and installed Chrome, Chromium,
or Edge. Git is needed only for a repository clone. `chitra probe` launches the
actual browser and checks FFmpeg after installation.

## Recommended one-command install

Run this from a normal terminal before opening the project in Cursor, Claude
Code, Codex, or Gemini CLI:

```bash
npx --yes chitra-video@next setup
```

`setup` globally installs that exact CLI version, installs the matching bundled
skills for detected coding agents, and proves FFmpeg/browser availability. It
does not download a browser. The older verified 0.5.0 GitHub prerelease remains available at
https://github.com/neerajk201999/Chitra-v2/releases/download/v0.5.0-rc.4/chitra-video-0.5.0.tgz
with SHA-256
`b1feb333f8c4cafa4852859e088dc9fa1162ffcfb7753c9f7bcff76123cdd79d`.
Do not pair that 0.5 CLI with current-main skills.

Select a harness explicitly when auto-detection is ambiguous:

```bash
npx --yes chitra-video@next setup --agent cursor
npx --yes chitra-video@next setup --agent claude-code
npx --yes chitra-video@next setup --agent codex
npx --yes chitra-video@next setup --agent gemini-cli
```

For source development only, clone, install `core` dependencies, then run the
current checked-out CLI and local skill package. Run this outside an agent sandbox:

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
npm install --prefix ./core
node core/dist/cli/index.js setup --no-global
```

## Native plugin paths

Claude Code:

```bash
claude plugin marketplace add neerajk201999/Chitra-v2
claude plugin install chitra@chitra
```

Codex:

```bash
codex plugin marketplace add neerajk201999/Chitra-v2 --ref main
codex plugin add chitra@chitra
```

Cursor can open the cloned repository and use `.cursor/rules/chitra.mdc`, or
install the canonical skills with the explicit Cursor command above. Gemini CLI
loads `GEMINI.md` when the repository is open, or uses the explicit skills command.
Any agent that reads `AGENTS.md` can operate Chitra without a native plugin.

## First run

From a project directory:

```bash
# Have the agent create intake.json; the repository includes examples/intake/intake.json.
chitra intake intake.json -o intake.lock.json
chitra init . --style night --register brand-film --title "My film"
chitra creative-check intake.lock.json direction.json storyboard.json score.json
chitra evidence score.json -o out/evidence # inspect stills before motion
# For open/multi-shot work, preserve specialist ownership:
chitra stage-check board.score.json motion.score.json --transition board-to-motion
chitra stage-check motion.score.json score.json --transition motion-to-master
chitra check score.json
chitra render score.json -o out/draft.mp4 -q draft
# After the evidence critique and revisions:
chitra release intake.lock.json direction.json storyboard.json score.json \
  -o out/final.mp4 -e out/evidence -r out/release.json
chitra verify-release out/release.json
```

Then ask the agent for the actual outcome, not implementation trivia:

- “Create a 20-second cinematic launch film for this product. Calm, precise,
  black and warm white; make the workflow—not the logo—the hero.”
- “Use this reference video for rhythm and camera grammar, but use our brand,
  copy, screenshots, and product story.”
- “Use these three screenshots and this website link. Preserve the interface;
  make the motion feel tactile and premium, not playful.”
- “No reference: direct the strongest 15-second social concept from this brief.
  Show me the Direction before scoring.”
- “Critique the rendered evidence, patch only cited IR spans, and stop after
  three passes with every remaining limitation stated.”

The agent should inventory supplied inputs in `intake.json`, lock local
provenance, produce Direction, Storyboard, and Score artifacts, inspect draft
evidence, revise, and deliver only through `chitra release`. A
reference is optional; it is never a substitute for the user's objective,
preferences, brand constraints, or approval.

## Public-preview status

- Source install and isolated tarball install: verified.
- Public GitHub clone and isolated `chitra-video@0.4.0` registry install/probe:
  verified.
- 0.5.0 rc.4 GitHub prerelease: exact public bytes verify by SHA-256; a
  fresh-prefix download/install takes 5.6s and 62.9 MiB with zero browser bytes;
  the complete probe/Intake/init/validate/first-frame check finishes in 11.2s
  on this machine with warm npm dependencies. npm still resolves 0.4.0.
- Claude Code and Codex marketplace installation: exercised in isolated homes.
- Claude Code, Codex, and Cursor manifests: validated/version-checked.
- Canonical skills: installed locally for Claude Code, Codex, Cursor, and
  Gemini CLI with `npx skills`.
- Three outside users × three harnesses under ten minutes: not yet measured.
