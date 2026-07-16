# Ten-minute friend test

This test measures whether a new user can install Chitra, understand the agent
workflow, and reach a first rendered frame without help from the project author.
Do not coach the tester after sending these instructions; confusion is product
evidence.

## Install

Requirements: Node.js 22.12 or newer and FFmpeg on `PATH`.

```bash
git clone https://github.com/neerajk201999/Chitra-v2.git
cd Chitra-v2
npm install -g chitra-video
chitra probe
```

Open the cloned `Chitra-v2` folder in Claude Code, Codex, Cursor, or Gemini CLI.
Paste one prompt below. The agent should follow `AGENTS.md` and the
`create-video` skill automatically.

## Prompt A — no assets or reference

> Use Chitra to create and release a 12-second 16:9 brand film for a fictional
> product called SignalDesk, a research workspace that turns scattered sources
> into verified decisions. The single idea is “from noise to evidence.” Use
> warm white, near-black, and one signal-orange accent; precise typography,
> restrained product UI, one controlled acceleration, and a confident held
> close. No purple gradients, generic feature cards, stock footage, fake product
> claims, or perpetual motion. Create the complete Intake → Direction →
> Storyboard → Score chain, render and inspect evidence, make up to three
> evidence-bound revisions, and deliver only through `chitra release`. Tell me
> the final video path, elapsed time, and every remaining limitation.

## Prompt B — real product, website, and optional reference

> Use Chitra to create and release a maximum-15-second launch film for
> **[PRODUCT NAME]** using **[WEBSITE URL]** and the assets/screenshots in
> **[ASSET PATH]**. If **[REFERENCE VIDEO PATH]** is supplied, use it only for
> transferable rhythm, camera, typography, and transition grammar—not its
> branding, copy, pixels, or audio. Research the product, preserve the real UI
> and claims, and build one causal story: problem → live product proof → earned
> close. The result should feel sleek, specific, and authored rather than like a
> template. Follow the complete Chitra intake, direction, storyboard, render,
> evidence, critique, revision, and verified-release workflow. Tell me the final
> path, elapsed time, and anything Chitra could not express cleanly.

Remove the optional-reference sentence when no reference is available. Testers
must use assets they own or are licensed to render.

## Return this feedback

Copy this block into a message to the project owner:

```text
Agent / model:
OS:
Fresh install or existing Node/FFmpeg:
Install start → chitra probe:
Prompt start → first frame:
Prompt start → final video:
Commands or instructions that failed:
Times the agent needed help:
What looked strongest:
What looked weakest:
Would you use it again? Why?
Final video path or link:
Project folder or zip (exclude secrets/private assets):
```

Do not optimize for a flattering result. A failed install, confused agent, or
weak video is a useful finding. The current public preview has not yet met its
three-users × three-harnesses under-ten-minutes exit gate.
