# Benchmark: "Card Vault" fintech launch reference (2026)

720×900 (4:5), ~9.2s, music-driven. A user gave this as a reference; an agent
(Codex) recreated it via Chitra and the output captured structure but not soul —
the diagnostic failure that motivated ADR-0009.

| Technique in the reference | Chitra mechanism | Status |
|---|---|---|
| Dot-matrix shimmer (card texture + end-card motif) | `particles` + `particle-shimmer`/`particle-form`/`particle-morph` | ✅ ADR-0009 |
| Black + crimson palette, red glow | style palette + gradient-field ambients | ✅ |
| Floating card with depth/lighting | textured `scene3d` + reason-gated DOM and internal 3D tracks | ✅ mechanism built in ADR-0010/0013/0028; target improvement not yet rerun |
| Phone wallet with card | phone-frame figure + card figure | ✅ (ADR-0008) |
| Card-swap (Mastercard→VISA→RuPay) | figures + cross-fade/pulse choreography | ✅ |
| Add-a-card form UI | figure fragment | ✅ (ADR-0008) |
| Reference audio track | `chitra extract-audio` (rights are the user's responsibility) | ✅ |

Why Codex's attempt drifted to generic purple-gradient slop: the dot-matrix
primitive did not exist, so the agent substituted the nearest easy thing. The
lesson (recorded): a missing *specific* capability manifests as a *generic*
failure. Closing the primitive closes the class.

## Exact-reconstruction ledger

Baseline audit requirement (2026-07-16): **For exact reconstruction of the
274-frame reference, Chitra needs typed rotation/perspective tracks, general
keyframes, masks, nested compositions, blend modes, motion blur, richer audio,
and automated frame-difference comparison.** The audit also contains a
prioritized roadmap and a proposed neutral benchmark suite for determining
whether Chitra genuinely beats the compared projects.

Current status: typed, frame-addressed DOM rotation/perspective/general
transform tracks are built in ADR-0013; textured internal mesh/camera/light/
exposure tracks are built in ADR-0028; exhaustive and ROI frame comparison is
built in ADR-0019/0022. Masks, nested compositions, blend modes, motion blur,
richer audio, and additional 3D materials/geometry remain open. An
"exact" claim is blocked until the full 274-frame output is compared against
the reference with the neutral metric suite.
