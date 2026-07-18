# Public-preview install benchmark — 2026-07-18

ADR-0037 public GitHub prerelease verification in a fresh temporary npm prefix.

- Source: `v0.5.0-rc.4/chitra-video-0.5.0.tgz` from the public GitHub release.
- Source commit: `33b19d4d9ff61f638a8f338e0613a641ed2fc8bb` on protected `main` after PR #30 and post-merge CI.
- Artifact SHA-256: `b1feb333f8c4cafa4852859e088dc9fa1162ffcfb7753c9f7bcff76123cdd79d`, matched after download.
- Artifact size: 592,900 bytes.
- Installed CLI: `chitra-video 0.5.0`.
- Install: 5.6s, 62.9 MiB, zero browser-download bytes.
- Runtime browser/FFmpeg probe: passed.
- Intake lock, starter initialization, static validation: passed.
- Installed-package browser frame: 1,709 KiB, passed.
- Complete download/install/first-frame check: 11.2s on this machine with a warm npm dependency cache.

This proves the public artifact is installable and functional. It is not an
outside-user, network-cold, cross-OS, or three-harness timing result.

Reproduce:

```bash
node benchmarks/public-preview-install/run.mjs
```
