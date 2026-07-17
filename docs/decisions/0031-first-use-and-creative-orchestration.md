# ADR-0031 — First-use performance and creative orchestration

**Status:** accepted; 0.5.0 release candidate verified locally · 2026-07-17

## Context

The first independent Cursor run failed the M3 product promise before creative
quality could be evaluated:

- Git cloning inside Cursor's sandbox could not create `.git/hooks` and retried.
- `npm install -g chitra-video` launched Puppeteer's Chrome download/extraction.
  The run observed a 539 MB browser cache, a corrupted sandbox extraction, and
  more than five minutes inside the install command.
- npm linked `chitra` to a non-executable `dist/cli/index.js` under the tester's
  npm version, requiring a manual `chmod`.
- `chitra probe` reported Puppeteer as installed without locating or launching
  a browser, so it gave a false green before the render failure.
- `-q draft` captured the same 510 full-resolution PNG frames as a release. It
  changed only FFmpeg CRF/preset, took 301.5 seconds, retained hundreds of MB of
  PNG cache, and ended with less than 1 GB free on the startup disk.
- The agent loaded a 16.8 KB creation skill and was directed toward a 30 KB
  TypeScript schema. It authored four large artifacts before validating the
  central visual premise.
- The prompt required a premium, slowly revealed product object with reflections,
  soft shadows, and industrial-design quality. Chitra only had curated card,
  coin, and slab subjects. The workflow silently substituted a slab, passed
  structural gates, and rendered a black silhouette with an off-brand red fill.

This is not one bug. Distribution, preview semantics, context routing, and
creative feasibility all violated the same invariant: expensive work began
before the system proved it had the inputs and capabilities to produce the
requested hero.

## Decision

### 1. Installation uses an existing system browser

Replace `puppeteer` with `puppeteer-core`; Chitra no longer downloads Chrome at
package-install time. Resolve a browser in this order:

1. `CHITRA_BROWSER_PATH`;
2. `PUPPETEER_EXECUTABLE_PATH` for ecosystem compatibility;
3. installed stable Chrome/Chromium/Edge paths on macOS, Linux, and Windows.

Failure is explicit and includes platform-specific recovery. `chitra probe`
must launch the resolved browser, not test that a JavaScript package exists.
The published CLI target must have executable mode, verified from the packed
tarball and through the isolated install benchmark.

### 2. Preview is a distinct render profile

`draft` is an explicitly non-release preview profile:

- capture at at most 12 fps while seeking the authoritative score clock;
- store bounded-quality JPEG frames in a profile-specific cache;
- report capture fps, output fps, rendered frames, cache bytes, and wall time;
- preflight estimated cache demand against free disk before opening a browser.

`standard` and `high` keep full score fps and lossless PNG capture. Release
continues to reject `draft`. Cache identity includes the render profile so a
preview can never masquerade as release frames.

The workflow creates and inspects sparse evidence stills before a motion
preview. A failed hero still must not trigger a full-timeline render.

### 3. Skills use progressive disclosure

`create-video/SKILL.md` becomes a compact router and stage contract. Detailed
material moves into references loaded only for the active task:

- intake and creative direction;
- Score authoring and asset production;
- reference reconstruction;
- review and release.

Agents must not read `core/src/ir/schema.ts` wholesale to create a film. They
reuse examples/templates and let CLI validation return narrow error paths.
They edit artifacts without echoing whole JSON documents into conversation.

Generic coding-optimization skills—including minimal/YAGNI modes—do not govern
creative concept, visual density, research, art direction, sound, critique, or
revision. Chitra's creative constitution and the user's brief govern those
decisions. Coding skills may still apply to implementation work outside the
film's creative pipeline.

### 4. Capability fit is an approval gate

Before Direction, the agent writes a compact production approach against the
versioned capability matrix. Each brief-critical requirement is classified:

- `native`: Chitra can render and gate it directly;
- `asset-assisted`: a supplied, generated, or externally authored asset makes
  it achievable and provenance is recorded;
- `unsupported`: Chitra cannot currently deliver it honestly.

An unsupported hero requirement blocks Score authoring until the user approves
an alternative or the required asset/capability exists. “Closest primitive” is
never a silent fallback. Static green is never described as professional taste.

### 5. Optimize decisions, not thought

The goal is not minimum token use. The goal is no duplicated context, no full
schema dumps, no speculative artifacts, and no render before a cheap proof.
Research and critique expand when the brief needs them; unrelated references
stay unloaded. Every expensive step must retire a named uncertainty.

## Alternatives rejected

- **Keep Puppeteer's bundled browser and document patience.** It preserves a
  pinned binary but fails sandboxed agents, install time, and disk constraints.
- **Set `PUPPETEER_SKIP_DOWNLOAD` in docs.** An environment-variable footgun
  still leaves browser discovery and false-green probe behavior unsolved.
- **Make all rendering low-fps.** Release determinism and authored frame tracks
  require full score fps; only diagnostic preview may sample.
- **Add more prose to the existing skill.** The failure includes excess context.
  More always-loaded instruction worsens compliance and token use.
- **Let the model judge feasibility informally.** The Aether run demonstrates
  that an eager agent will substitute what exists and rationalize it afterward.
- **Replace the renderer immediately.** WebCodecs/Skia remains the throughput
  direction, but it does not excuse today's install, preflight, or orchestration
  failures and is too large for the first recovery slice.

## Consequences

- Users must have a supported Chromium-family browser or set one explicit path;
  this is normally already true in coding-agent environments.
- Draft output is for direction and motion review, not frame-fidelity approval.
- First-frame and first-preview latency become measurable release gates.
- Capability honesty may stop some ambitious briefs earlier. That is better
  than spending minutes and tokens producing a knowingly inadequate substitute.
- Arbitrary glTF products, environment lighting/reflections, shadows, motion
  blur, deeper compositions, and richer audio remain separate measured slices.
