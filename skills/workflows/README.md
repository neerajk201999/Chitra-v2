# Workflow skills

Register-specific recipes layered on `create-video`. Each names the register, the beat structure, the asset checklist, and the audio defaults — the agent still runs the full loop (direction → score → gates → draft → evidence → critique → final).

## product-launch
Register `brand-film` or `product-demo`, 30–45s. Beats: cold open (approved positioning line) → problem → turn → product proof (real UI: `chitra snap` a live page, crop stills from a walkthrough, or a `video` clip via ffmpeg trim) → pricing/close. Copy comes from the brand's approved positioning only. Audio: `chitra bed` + sparse SFX kit (whoosh on the open, tick on product beats, boom on the mark; ≤2/scene, MO-AUD-3).

## screen-demo
Register `product-demo`, 45–90s. Source: a screen recording + voiceover. Pipeline: transcribe (whisper.cpp) → pick 3–6 moments by timestamp → `video` elements for motion, stills for held beats → captions from what the narrator actually demonstrates (never invented claims). Recorder-chrome hygiene is mandatory: crop toolbars/toasts/account chrome out of every clip.

## social-short
Register `social-short`, 9:16 1080×1920, 8–20s. One idea only: hook (≤2s) → single proof beat → mark. Type larger (register minimums enforce this), cuts on the beat grid if music declares BPM, no scene >4s.
