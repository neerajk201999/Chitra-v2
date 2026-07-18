# Public-preview install benchmark — 2026-07-18

ADR-0037 public GitHub prerelease verification in a fresh temporary npm prefix.

- Source: `v0.5.0-rc.2/chitra-video-0.5.0.tgz` from the public GitHub release.
- Source commit: `ddbb839b1d1bd9aeb17f3fa8205a69a0aba75521` on protected `main` after PR #26 and post-merge CI.
- Artifact SHA-256: `b0c50dce7a50708931bfc23a2b425b8bb8673436288f46501bb8ed735dda7587`, matched after download.
- Artifact size: 586,114 bytes.
- Installed CLI: `chitra-video 0.5.0`.
- Install: 2.5s, 62.9 MiB, zero browser-download bytes.
- Runtime browser/FFmpeg probe: passed.
- Intake lock, starter initialization, static validation: passed.
- Installed-package browser frame: 1,709 KiB, passed.
- Complete download/install/first-frame check: 9.3s on this machine with a warm npm dependency cache.

This proves the public artifact is installable and functional. It is not an
outside-user, network-cold, cross-OS, or three-harness timing result.

Reproduce:

```bash
node benchmarks/public-preview-install/run.mjs
```
