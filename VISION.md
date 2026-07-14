# Chitra — Vision

> *Chitra* (चित्र): image, picture, motion. The working name for this project.

## Mission

Build the **AI-native operating system for cinematic video creation** — an open-source framework that developers install into Claude Code, Codex, Gemini CLI, Cursor, or any coding agent, and use to produce videos approaching the quality of Apple, OpenAI, Anthropic, CRED, Stripe, Linear, and leading motion-design studios.

We are not building another renderer. Most open-source projects solve **rendering**. Almost none solve **taste**. Chitra's defining thesis:

> The video is not generated. It is **directed, critiqued, and revised** — by a hierarchy of specialized agents with encoded design judgment — until it survives review.

`Prompt → Video` is the old generation.
`Prompt → Direction → Design → Motion → Critique → Revision → Video` is ours.

## Benchmarks (what "beat" means)

We measure ourselves against three named benchmarks, each on its own axis:

| Benchmark | Axis | What beating it looks like |
|---|---|---|
| **HyperFrames** | AI-native workflow, installable skills | Better direction quality, better default taste, a real critique loop, measurably better output on identical prompts |
| **Remotion** | Rendering architecture | We don't out-engineer 10 years of renderer; we make the renderer a substrate and win the layer above it |
| **EditFrame** | Editing experience & usability | Faster iteration loop; agent-legible edits; revision without re-generation |

Two projects are **idea sources, not competitors**:

- **video-use** → visual feedback loops (a VLM that *watches* the render), screen/browser capture as a content source
- **OpenMontage** → timeline/edit-decision abstractions worth studying

One project is the **seed of a core subsystem**:

- **Impeccable** → the starting point for Chitra's **Quality Engine**: automated detection of AI slop, weak typography, bad pacing, inconsistent motion, poor composition — extended from static UI critique to critique *over time*.

## What world-class means, objectively

A Chitra video release-gate (v1.0 bar):

1. **Blind preference**: In blind A/B tests on identical briefs, evaluators prefer Chitra output over HyperFrames output ≥ 70% of the time.
2. **Slop score**: Zero critical findings from the Quality Engine (typography, spacing, easing, pacing, contrast, temporal consistency) on every released example.
3. **Determinism**: Same input → bit-identical frames. Every render reproducible.
4. **Iteration speed**: A directed revision ("make the intro punchier") changes only the intended scenes and re-renders incrementally.
5. **Install-to-first-video**: Under 10 minutes from `install` to a rendered, watchable, non-embarrassing video in a fresh coding-agent session.

## What we refuse to build

- Stock-footage + TTS + subtitle slop factories.
- A GUI editor (v1 is agent-first and code-first; a viewer is enough).
- Our own frame renderer before we've proven the taste layer (rendering is a substrate decision, not the product).

## Non-negotiable principles

1. **Taste is the product.** Every feature is judged by whether it improves the *watched* output.
2. **The repository is the memory.** Every decision, standard, and piece of research lives in version-controlled markdown. Any future session recovers full context by reading the repo.
3. **Critique is structural, not optional.** No artifact ships without passing the Quality Engine.
4. **Deterministic by construction.** Frame-pure rendering; seeds recorded; renders reproducible.
5. **Agent-legible everything.** Every intermediate representation (brief, storyboard, motion spec, edit list) is a documented, diffable text format an agent can read, critique, and patch.
6. **No slop in the repo either.** Docs, prompts, and code are held to the same bar as the videos.
