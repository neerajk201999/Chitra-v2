# Install and use Chitra

Chitra has two parts: the `chitra` CLI performs deterministic video work, while
agent skills direct and critique the film. Install both for the complete loop.

Requirements: Git, Node.js 22.12 or newer, and FFmpeg on `PATH`. Confirm them
with `git --version`, `node --version`, and `ffmpeg -version`; `chitra probe`
checks the runtime again after installation.

## Current source install

The GitHub repository is currently private and `chitra-video` is not yet on
npm. These commands work for users who have repository access:

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
npm install -g ./core
chitra probe
```

To use Chitra in another project, run this from that project and point at the
cloned Chitra repository:

```bash
npx skills add /absolute/path/to/Chitra-v2 --skill '*' --copy --yes
```

Add `--global` to install the skills for the detected agent across projects.

Or select a harness explicitly:

```bash
npx skills add /absolute/path/to/Chitra-v2 --agent claude-code --skill '*' --copy --yes
npx skills add /absolute/path/to/Chitra-v2 --agent codex --skill '*' --copy --yes
npx skills add /absolute/path/to/Chitra-v2 --agent cursor --skill '*' --copy --yes
npx skills add /absolute/path/to/Chitra-v2 --agent gemini-cli --skill '*' --copy --yes
```

Do not run `npm i -g chitra-video` yet: the registry currently returns 404.
After the owner makes the repository public and publishes the package, the
source URL can replace the local path and npm becomes the preferred core install.

## Native plugin paths

Claude Code, after GitHub access is configured:

```bash
claude plugin marketplace add neerajk201999/Chitra-v2
claude plugin install chitra@chitra
```

Codex, after GitHub access is configured:

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
chitra init . --style night --register brand-film --title "My film"
chitra check score.json
chitra render score.json -o out/draft.mp4 -q draft
chitra evidence score.json -o out/evidence
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

The agent should inventory supplied inputs, produce Direction and Score
artifacts, run deterministic gates, render, inspect evidence, and revise. A
reference is optional; it is never a substitute for the user's objective,
preferences, brand constraints, or approval.

## Release status

- Source install and isolated tarball install: verified.
- Claude Code and Codex marketplace installation: exercised in isolated homes.
- Claude Code, Codex, and Cursor manifests: validated/version-checked.
- Canonical skills: installed locally for Claude Code, Codex, Cursor, and
  Gemini CLI with `npx skills`.
- npm publication: not done.
- Public GitHub access: not enabled.
- Three outside users × three harnesses under ten minutes: not yet measured.
