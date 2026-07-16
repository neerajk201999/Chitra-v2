# Isolated install benchmark — 2026-07-16

ADR-0016 source-package verification in a fresh temporary install prefix.

- Packed and globally installed: **chitra-video 0.3.0**
- Runtime probe: **passed**
- Starter initialization and static validation: **passed**
- Installed-package browser frame: **1709 KiB, passed**
- Elapsed on this machine with a warm npm dependency cache: **9.0s**

This is a functional install check, not the M3 outside-user/network-cold timing claim.
Reproduce: `node benchmarks/cold-start/run.mjs`.
