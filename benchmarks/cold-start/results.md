# Isolated install benchmark — 2026-07-18

ADR-0016 source-package verification in a fresh temporary install prefix.

- Packed and globally installed: **chitra-video 0.5.0**
- Package source: **local source package**
- Artifact SHA-256: **f93a3a8ff43b456793396e1006e670d8a39ae803d6ad035dd2786afffced44c8**
- Install: **4.8s, 62.9 MiB, zero browser-download bytes**
- Runtime probe: **passed**
- Licensed minimal Three/font runtime assets: **packed**
- Installed-package Intake validation and source lock: **passed**
- Starter initialization and static validation: **passed**
- Installed-package browser frame: **1709 KiB, passed**
- Elapsed on this machine with a warm npm dependency cache: **10.9s**

This is a functional install check, not the M3 outside-user/network-cold timing claim.
Reproduce: `node benchmarks/cold-start/run.mjs`.
