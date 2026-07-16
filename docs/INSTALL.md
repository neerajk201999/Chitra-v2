# Install and use Chitra

Chitra has two parts: the `chitra` CLI performs deterministic video work, while
agent skills direct and critique the film. Install both for the complete loop.

Requirements: Git, Node.js 22.12 or newer, and FFmpeg on `PATH`. Confirm them
with `git --version`, `node --version`, and `ffmpeg -version`; `chitra probe`
checks the runtime again after installation.

## Recommended public-preview install

For the complete system, install the published CLI and open the public
repository in the coding agent. Keeping the repository open gives the agent the
skills, schemas, creative memory, examples, and honest capability boundaries.

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
npm install -g chitra-video
chitra probe
```

The CLI can be installed by itself with `npm install -g chitra-video`, but that
does not install creative direction into a model. For another project, keep the
public repository clone and install its canonical skills into the target agent:

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
chitra check score.json
chitra render score.json -o out/draft.mp4 -q draft
chitra evidence score.json -o out/evidence
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
- Claude Code and Codex marketplace installation: exercised in isolated homes.
- Claude Code, Codex, and Cursor manifests: validated/version-checked.
- Canonical skills: installed locally for Claude Code, Codex, Cursor, and
  Gemini CLI with `npx skills`.
- Three outside users × three harnesses under ten minutes: not yet measured.
