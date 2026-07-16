# Heterogeneous particle appearance benchmark

**Verified:** 2026-07-16 · **ADR:** 0025

A four-point custom constellation uses different bounded size and opacity values
plus a field glow multiplier. The executable benchmark validates the Score,
asserts byte-identical compiler output, renders the real browser fixture, and
proves repeated capture is byte-identical.

Card Vault quality impact is recorded separately because its owner-supplied
reference bytes are intentionally not redistributed with this repository.
