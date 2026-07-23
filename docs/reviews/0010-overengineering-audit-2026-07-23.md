# Over-engineering audit — 2026-07-23

Scope: complexity and removable repository weight only. This is not a
correctness, security, performance, or creative-quality review. Findings are
recommendations; no deletion was applied by this audit.

1. `delete:` remove the 7.2 MiB committed starter audio binaries; the published
   package excludes them and `chitra bed` / `chitra sfx-kit` already generate
   deterministic replacements. Keep only provenance for generated assets.
   [`core/audio-library/`](../../core/audio-library/)
2. `delete:` remove the unused 12 KiB browser/phone starter fragments, or move
   one into a real tested example if it teaches a capability the generated
   figures do not. No code, package file list, benchmark, or skill consumes
   them. [`core/figures-library/`](../../core/figures-library/)
3. `shrink:` keep `core/styles/` as the single style-preset source and remove
   the duplicate root `styles/` plus prepack copy step. Development and the
   installed CLI already resolve `core/styles/`.
   [`scripts/prepare-package.mjs`](../../scripts/prepare-package.mjs)

Net possible: approximately **−90 text lines, −7.2 MiB tracked bytes,
−0 dependencies**. Apply only with a migration note and package/install
verification; the media deletion changes source-checkout convenience even
though it does not change the published package.
