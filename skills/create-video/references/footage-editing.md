# Transcript-addressed footage editing

Load this file only when supplied footage contains speech or when source-clip
audio must survive into an edited plate.

## Provider boundary

Chitra does not bundle transcription. Use an available host/provider to obtain
verbatim word timestamps, speakers, fillers, and audible events. Preserve the
provider/model in Transcript IR; never normalize away “um,” retakes, pauses, or
events before the editorial decision.

Create `transcript.json` with project-relative owned/licensed sources and run:

```bash
chitra transcript-lock transcript.json -o transcript.lock.json --project .
chitra transcript-pack transcript.lock.json -o transcript-pack.md --project .
```

Read `transcript-pack.md`, not the full word JSON. If it exceeds the context
budget, select specific takes with repeatable source IDs; never accept silent
truncation.

## Editorial decision

Propose a material-specific strategy and get approval before cutting unless the
user delegated autonomous editing. Write `edit.json` with one narrative beat,
exact first/last word IDs, selected quote, and reason per segment. Preserve
useful silences through bounded handles; do not cut fillers mechanically when
they carry character, timing, or meaning.

```bash
chitra edit-check transcript.lock.json edit.json --project . --json
chitra edit-render transcript.lock.json edit.json \
  --project . -o assets/edited-footage.mp4 -q draft
```

Inspect the resulting receipt and edited plate. The renderer normalizes
geometry/FPS, preserves source audio, inserts silence for silent sources in a
mixed edit, applies short cut fades, and normalizes the combined bus. It does
not grade, subtitle, or judge cut pictures.

Use the edited plate in Score as a local video asset. Score video elements are
still visual-only, so preserve the edited plate's audio as the release music/
audio source when the final film needs it; do not accidentally mix the same
audio twice.

## Current stop condition

Chitra does not yet produce a word-aligned filmstrip/waveform or automatically
inspect every cut boundary. Generate targeted visual evidence with the host
agent and treat cut-picture quality as a required manual/critic review. If an
edit depends on untranscribed silent UI events, address those moments by source
time and visual evidence outside the word EDL rather than fabricating words.

