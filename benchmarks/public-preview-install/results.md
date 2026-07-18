# Public-preview install benchmark — 2026-07-18

ADR-0037 public GitHub prerelease verification in a fresh temporary npm prefix.

- Source: `v0.5.0-rc.3/chitra-video-0.5.0.tgz` from the public GitHub release.
- Source commit: `2b847f33ce7af49546f6675b27de6055a347f852` on protected `main` after PR #27 and post-merge CI.
- Artifact SHA-256: `f93a3a8ff43b456793396e1006e670d8a39ae803d6ad035dd2786afffced44c8`, matched after download.
- Artifact size: 586,285 bytes.
- Installed CLI: `chitra-video 0.5.0`.
- Install: 4.8s, 62.9 MiB, zero browser-download bytes.
- Runtime browser/FFmpeg probe: passed.
- Intake lock, starter initialization, static validation: passed.
- Installed-package browser frame: 1,709 KiB, passed.
- Complete download/install/first-frame check: 12.4s on this machine with a warm npm dependency cache.

This proves the public artifact is installable and functional. It is not an
outside-user, network-cold, cross-OS, or three-harness timing result.

Reproduce:

```bash
node benchmarks/public-preview-install/run.mjs
```
