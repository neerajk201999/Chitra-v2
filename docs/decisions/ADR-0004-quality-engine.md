# ADR-0004: The Quality Engine — a three-layer closed loop that watches the render

**Status:** Accepted · **Date:** 2026-07-14 · **Informed by:** docs/research/{impeccable,video-use,hyperframes,openmontage,landscape}.md

## Context

This is Chitra's defining subsystem and primary moat. HyperFrames constrains generation with 372K words of prose but *nothing ever watches its rendered video*. Impeccable proves hybrid critique works for static UI but has no concept of time. Code2Video (ICML 2026) demonstrates VLM render-critique loops gain +40-50% on quality metrics. video-use proves the loop must be *bounded* and evidence-based.

## Decision

Quality is enforced in three layers, ordered cheap → expensive, each with a distinct failure vocabulary:

### Layer 1 — Structural (free; at authoring time)
IR schema validation + motion-token compliance (ADR-0003). Whole slop classes (arbitrary easings, off-scale durations, magic-number layout, un-reasoned cuts) are unrepresentable or rejected before any render.

### Layer 2 — Deterministic gates (cheap; pre- and post-render)
Programmatic checks with hard thresholds, ID-tagged like Impeccable's rules, integrity-tested, versioned in `docs/motion/` and enforced in code (OpenMontage's lesson: markdown governance fails):
- Typography: min sizes at target resolution, WCAG contrast *per frame* (text over moving video), reading-speed vs hold-time (wpm model), safe zones per platform.
- Motion: duration/easing token compliance, stagger caps, exit-before-entrance rules, motion-ratio per register, transform sanity.
- Edit: cut-rhythm bounds per register, adjacent-scene diversity, audio loudness (-14 LUFS), pop/click detection at cut boundaries (waveform spike scan), black-frame/blank-render detection.
- Slideshow-risk score (from OpenMontage) blocking static-slop renders.

### Layer 3 — VLM critics (expensive; watches the actual render)
Isolated critic sub-agents (Impeccable's anchoring rule: deterministic findings are never shown to aesthetic critics) that **watch the render, not the spec**:
- Evidence format: composite contact sheets — filmstrip at cut boundaries + waveform + timing labels co-rendered into the image (video-use's technique) — plus per-scene hero frames at full resolution.
- Critics by dimension: Typography · Composition · Motion/choreography (frame-pairs to judge easing feel) · Pacing (cut map + durations) · Brand/consistency (palette & identity drift across scenes) · Slop (two-altitude test: "could you guess the aesthetic from the category alone? could you guess the evasion?") · Intent-match (Tier-1 direction vs what's on screen: "does the `hero_moment` actually peak?").
- Findings: severity-tagged (P0–P3), citing IR paths + timecodes, each mapped to a fix action. Scored against honest rubrics with anti-inflation calibration ("most real videos score 20–32/40").

### The loop
`render → gates → critics → editor patches IR spans → dirty scenes re-render → re-critique`, **hard-capped at 3 revision passes** (video-use's lesson), then escalate remaining findings to the human with the evidence sheets. Release gate: zero P0/P1 findings + all deterministic gates green.

## Consequences

- The critique rubrics + gate thresholds become a publishable benchmark (ChitraBench — "VBench for motion design"), which no one else owns.
- Cost control: layers 1–2 catch most defects for ~zero tokens; VLM passes run per-scene on dirty scenes only.
- New research obligation: temporal rules (cut rhythm, pacing curves, choreography feel) are genuinely novel — we maintain them as versioned, evidence-linked rules in `docs/motion/`, grown via the same saturation cadence Impeccable uses for its reflex-reject lists.
