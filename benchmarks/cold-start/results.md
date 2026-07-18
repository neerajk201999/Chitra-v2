# Isolated install benchmark — 2026-07-18

ADR-0016 source-package verification in a fresh temporary install prefix.

- Packed and globally installed: **chitra-video 0.5.0**
- Install: **1.4s, 62.8 MiB, zero browser-download bytes**
- Runtime probe: **passed**
- Licensed minimal Three/font runtime assets: **packed**
- Installed-package Intake validation and source lock: **passed**
- Starter initialization and static validation: **passed**
- Installed-package browser frame: **1709 KiB, passed**
- Elapsed on this machine with a warm npm dependency cache: **6.5s**

This is a functional install check, not the M3 outside-user/network-cold timing claim.
Reproduce: `node benchmarks/cold-start/run.mjs`.
