# Public-preview install benchmark — 2026-07-18

ADR-0037 public GitHub prerelease verification in a fresh temporary npm prefix.

- Source: `v0.5.0-rc.1/chitra-video-0.5.0.tgz` from the public GitHub release.
- Source commit: `90cd93ee2fc36ef6b1292bc07364c68c345edb40` on protected `main`.
- Artifact SHA-256: `d8bc89b419aa1bf6e53252067d2abcf5300315d94328547303c434bcfb670ba9`, matched after download.
- Installed CLI: `chitra-video 0.5.0`.
- Install: 3.9s, 62.9 MiB, zero browser-download bytes.
- Runtime browser/FFmpeg probe: passed.
- Intake lock, starter initialization, static validation: passed.
- Installed-package browser frame: 1,709 KiB, passed.
- Complete download/install/first-frame check: 11.7s on this machine with a warm npm dependency cache.

This proves the public artifact is installable and functional. It is not an
outside-user, network-cold, cross-OS, or three-harness timing result.

Reproduce:

```bash
node benchmarks/public-preview-install/run.mjs
```
