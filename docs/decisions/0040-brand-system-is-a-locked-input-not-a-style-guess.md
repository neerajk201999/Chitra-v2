# ADR-0040 — Brand System is a locked input, not a style guess

**Status:** accepted · 2026-07-18

## Context

The capability audit identifies directed launch and product-story films from
messy mixed inputs as Chitra's product wedge. That workflow currently records a
brand name and free-form Intake constraints, but the executable Score can still
fall back to one of three bundled typefaces and an invented palette. A host agent
can say it understood a site or brand deck without proving which evidence was
used, which rules survived Direction, or whether the rendered style matches.

This is a more fundamental launch-film gap than adding another transition. Brand
fidelity affects every frame and is one of the clearest differences between a
specific film and logo-swapped AI output (CC-BRAND-1/2). It also exposes a real
renderer constraint: Score Style permits only bundled fonts, so even an owned or
licensed brand font cannot currently reach deterministic pixels.

Automatic brand interpretation remains a model task. The deterministic core
must not crawl websites, infer taste, or silently assign meaning to colors. It
can lock evidence, render declared assets, and prove exact cross-tier survival.

## Decision

1. Add separately versioned Brand System 0.1 IR. It records a stable brand ID,
   display name, Intake source IDs, a resolved Score palette, typography roles,
   optional project-local WOFF2 font assets, and explicit brand rules with
   priority and creative domain. Motion personality, voice, composition, logo
   posture, and prohibited treatments are authored as rules rather than reduced
   to a false scalar taste score.
2. `chitra brand-lock brand.json --project <dir> -o brand.lock.json` validates
   the profile, resolves only project-local files, rejects traversal/symlink
   escapes, verifies claimed hashes, and writes SHA-256 plus byte counts. It
   performs no network access and no semantic inference. The locked artifact
   carries a canonical digest over its rules, resolved style, sources, and font
   fingerprints; relocking is byte-identical and rejects a stale claimed digest.
3. Score Style accepts safe named font families plus declared local WOFF2 faces.
   Every non-bundled family used by display/text/mono must declare the exact
   weight the Score requests. Font bytes are embedded into the compiled page,
   included in render/release input identity, and invalidate every affected
   scene cache. Missing, undeclared, or unsafe font files fail loudly.
   Compiler cache version 16 also waits/checks the exact display, text, and mono
   weights before capture rather than accepting a family-level fallback.
4. Custom font faces carry existing `assetUse` provenance. Creative conformance
   treats them as rendered assets, so source rights and planning rules apply in
   the same way as images, footage, textures, and audio.
5. `chitra brand-conform brand.lock.json intake.lock.json direction.json
   score.json` checks only evidence-backed facts:
   - Brand ID/name and source IDs agree with Intake;
   - every Brand rule exists verbatim as an Intake brand constraint;
   - must-level rules are traced by Direction through the existing brand
     constraint IDs;
   - resolved Score palette, font families, weights, and custom font paths match
     the locked Brand System.
   The Score also binds the exact materialized Brand digest. `creative-check`
   and `release` require `--brand` whenever that binding is present; release
   refuses a Brand artifact that changes during the transaction. The optional
   Brand input is hash-bound in the release receipt while remaining backward
   compatible with receipts for unbranded Scores. The Score digest and rendered
   font bytes preserve executable identity as separate checks. Release target
   safety also treats the locked Brand file as a protected input.
6. Brand conformance does not claim that a rule was interpreted beautifully.
   Motion/voice/composition semantics remain Direction and calibrated Creative
   Review work. Exact palette/type survival is deterministic; professional brand
   expression remains a watched judgment.

## Alternatives rejected

- **Scrape a URL and emit a style automatically inside core:** network and model
  nondeterminism, consent ambiguity, and false confidence about semantic roles.
- **Keep brand as prompt prose:** cannot detect dropped rules, invented palettes,
  changed assets, or font substitution.
- **Add dozens of generic house styles:** increases logo-swap output and package
  weight without preserving a user's brand.
- **Allow arbitrary remote CSS/webfonts:** non-reproducible, privacy-sensitive,
  and incompatible with offline render/release receipts.
- **Make Brand System another field inside Intake 0.1:** forces a breaking Intake
  migration and mixes per-project source inventory with reusable brand memory.
- **Gate subjective brand quality with keyword matching:** easy to game and not
  evidence that a film feels specific. Traceability and exact executable facts
  are the deterministic floor; calibrated review handles meaning.

## Consequences

Chitra can use real licensed brand typography and prove palette/type/rule
survival without a new runtime dependency or model call. The host agent still
researches and authors the Brand System, but can no longer hide unsupported
guesses behind prose. Brand profiles become reusable, diffable repository memory
and a natural input to prompt-only or source-assisted launch workflows.

This slice does not implement automatic logo extraction, font licensing
discovery, semantic palette-role inference, or a claim that brand-faithful output
beats a competitor. Those require outside workflows and watched preference data.
