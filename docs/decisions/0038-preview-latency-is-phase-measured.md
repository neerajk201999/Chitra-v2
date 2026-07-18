# ADR-0038 — Preview latency is phase-measured before optimization

**Status:** accepted · 2026-07-18

## Context

ADR-0031 bounds draft preview work at 12fps JPEG capture and proves a 115-frame,
3 MiB cache for the fixed 9.6-second fixture. Wall time was reported as 8.1–8.8
seconds until one otherwise-green full verification took 20.7 seconds. The
single aggregate number cannot distinguish browser/page setup, frame capture,
FFmpeg encode, cache finalization, or browser shutdown. It also currently stops
its timer before browser shutdown even though the user still waits for it.

Optimizing from the aggregate invites guesses such as lowering frame rate,
resolution, or quality without knowing whether pixels are causal. A fast single
run also cannot support a stable-latency claim.

## Decision

1. `RenderResult` records non-negative `setupMs`, `captureMs`, `encodeMs`,
   `finalizeMs`, and `closeMs`. `wallMs` covers the complete awaited transaction,
   including browser close, and equals the phase sum within timer precision.
2. The CLI exposes phase timings in JSON and a compact human summary. Existing
   fields remain compatible; no render pixels, cache identity, or quality profile
   changes in this measurement slice.
3. The fixed draft-preview benchmark supports one to nine fresh-cache samples,
   reports every sample, median and nearest-rank p95 wall time, plus median phase
   breakdown. Normal full verification remains one sample to bound CI cost.
4. A future optimization must cite the measured dominant phase and preserve the
   115-frame motion evidence unless an explicit quality/cost benchmark justifies
   changing it. One anomalous loaded run is evidence of variance, not proof of a
   renderer defect or a reason to lower visual quality blindly.

## Alternatives rejected

- **Immediately reduce preview to 8fps or half resolution:** likely faster when
  capture dominates, but unmeasured and potentially harms motion judgment.
- **Use one hard wall-time CI ceiling:** hosted and local load vary; a single
  absolute limit would be flaky before repeated-machine evidence exists.
- **Log ad hoc timestamps only in the benchmark:** hides latency from real CLI
  users and lets other renderer callers keep under-reporting browser shutdown.
- **Treat cache/frame bounds as sufficient:** protects disk and work volume but
  does not tell a user how long they wait.

## Consequences

Preview performance becomes diagnosable without a dependency or renderer change.
`wallMs` may increase slightly because it becomes truthful about shutdown. The
phase contract adds API surface and must remain version-compatible through 0.x.
Cross-machine p95 still requires outside samples; local repeated runs only choose
the next engineering target.
