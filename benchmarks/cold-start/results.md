# Isolated install benchmark — 2026-07-17

ADR-0016 source-package verification in a fresh temporary install prefix.

- Packed and globally installed: **chitra-video 0.5.0**
- Install: **3.2s, 93.7 MiB, zero browser-download bytes**
- Runtime probe: **passed**
- Installed-package Intake validation and source lock: **passed**
- Starter initialization and static validation: **passed**
- Installed-package browser frame: **1709 KiB, passed**
- Elapsed on this machine with a warm npm dependency cache: **8.8s**

This is a functional install check, not the M3 outside-user/network-cold timing claim.
Reproduce: `node benchmarks/cold-start/run.mjs`.
