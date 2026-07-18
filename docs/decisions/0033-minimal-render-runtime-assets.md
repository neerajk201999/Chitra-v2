# ADR-0033 — Package only the render assets Chitra executes

**Status:** shipped · 2026-07-18

## Context

The `0.5.0` recovery removed the bundled browser, but an isolated install still
occupies 93.7 MiB. Dependency inspection shows Chitra installs the complete
Three.js package and four complete Fontsource packages while the compiler reads
only `three.module.js` and nine Latin WOFF2 files. Those dependencies account
for roughly 37 MiB installed. Their unused sources, examples, metadata, and font
subsets do not improve a render and make first use slower and heavier.

GSAP is also read as one runtime file, but its standard license is not the same
as MIT/OFL. This slice deliberately leaves GSAP as a normal dependency rather
than inventing a redistribution interpretation.

## Decision

1. Vendor the exact Three.js module currently executed and the exact nine font
   files already inlined by the compiler under `core/runtime-assets/`.
2. Include upstream versions, source URLs, copyright/license texts, and SHA-256
   hashes in a runtime-asset ledger. Three remains MIT; fonts remain OFL-1.1.
3. Resolve these assets relative to Chitra's own module, identically in source
   tests and packed `dist`, and keep them inside the npm `files` allowlist.
4. Remove `three` and the four `@fontsource/*` packages from runtime
   dependencies. Keep `sharp`, `puppeteer-core`, GSAP, Zod, and Commander because
   current core paths execute them directly.
5. Treat asset bytes as a renderer input. Any upstream upgrade requires an
   explicit ledger/hash change, compiler regression verification, package dry
   run, and isolated cold-install/probe benchmark.
6. Do not add download-on-first-use. Installation remains offline-complete for
   all currently native scenes and fonts.

## Alternatives rejected

- **Make 3D/fonts optional downloads:** smaller base, but breaks hermetic first
  use and creates silent network/runtime failure paths.
- **Use system fonts:** smaller, but destroys typography determinism and changes
  layouts across machines.
- **Keep whole dependencies:** operationally simple but spends tens of megabytes
  on files Chitra cannot execute.
- **Vendor GSAP too:** potentially smaller, but deferred until its redistribution
  terms are reviewed and recorded separately.

## Consequences

The npm tarball grows by about 1.4 MiB while installed dependencies should fall
materially. Chitra owns an explicit small asset-upgrade task instead of receiving
those assets transitively. The cold-start benchmark becomes the acceptance
evidence; estimated savings are not a shipped claim.
