# Chitra Phase 0 production-readiness audit

**Date:** 2026-07-18  
**Audited commit:** `7cdeb875d9046fdea904ae10b104f1bc64650176`  
**Audit author:** the same Codex development process that has modified Chitra  
**Status:** first-party adversarial audit, not independent certification

## Claim boundary

This audit can find and reproduce defects. It cannot independently prove
creative quality, professional taste, legal ownership, or superiority over a
competitor because it is authored inside the same development process. Existing
unit tests and generated benchmarks are regression evidence for their explicit
contracts. They are not admissible as independent preference evidence.

A claim below is marked verified only when the named mechanism could have
falsified it. External human evaluation, held-out cases, cross-platform golden
evidence, and stable npm `0.5.0` publication remain absent.

## Repository inventory

| Surface | Present | Verification currently present | Important omission |
|---|---|---|---|
| Agent entry and memory | `AGENTS.md`, `CLAUDE.md`, vision, ADRs, standards, current state | link/version/skill-manifest consistency | no independent review owner; some architecture wording overstates determinism/parallelism |
| Skills | create-video, critique-video, architecture-memory | compiled-hash integrity and isolated harness installation checks | public CLI artifact excludes skills by design; complete public CLI + public skill install is not one transaction |
| Planning IR | Intake, optional Brand System, Direction, Storyboard | Zod schemas, conformance tests, generated benchmarks | semantic quality remains model/reviewer judgment |
| Executable IR | Score/Motion IR, edit/transcript IR | strict schema, static gates, browser fixtures | no nested compositions, masks/mattes/blends, alpha output, imported animation, general property tracks |
| Compiler | Score → HTML/CSS/GSAP/Three | deterministic fixture captures and cache hashes | system Chromium is not version-pinned; raw figure CSS can bypass theme tokens |
| Renderer | system Chromium seek/capture → FFmpeg | same-machine repeated captures, package first-frame checks | no cross-machine golden equivalence, interrupt recovery, concurrency proof, alpha, or distributed rendering |
| Quality gates | schema, static, sampled rendered-frame gates | 94 unit tests and generated fault fixtures | hard/style policy is separated and receipt-bound; independent boundary review and temporal coverage remain open |
| Evidence/review | contact sheets, cut strips, review/calibration contracts | schema and synthetic consensus tests | no independent ≥20-case corpus and no held-out adversarial evaluator |
| Release | staged render/evidence, final-mux measurement, hash receipt | generated release transaction and tamper checks | receipt verification hashes audio/video but does not independently remeasure decoded invariants |
| Distribution | public repo, npm `0.4.0`, GitHub `0.5.0-rc.4` | downloaded SHA-pinned CLI/probe/first frame | stable npm `0.5.0` unpublished; CommonJS library entry fails |
| CI | full `scripts/verify.mjs` | protected Ubuntu runner | one OS only; no Windows/macOS matrix, generative-range suite, randomized held-out suite, or independent evaluator |

The tracked source is compact, but the installed production dependency tree is
about 63 MiB in the current warm-cache benchmark. `puppeteer-core`, Chromium
BiDi support, Sharp/native image libraries, GSAP, Zod, and Commander all serve
executed paths. A direct-CDP renderer may remove dependency weight, but it is not
a safe deletion until behavior is proven on all supported platforms.

## Reproduced findings

### A0-01 — P0 claim blocker — evaluation is first-party

**Reproduction:** inspect `scripts/verify.mjs` and every committed benchmark
runner. Fixtures, rules, expected failures, and implementation are maintained in
the same repository and development process.

**Impact:** the suite can prove regressions against declared contracts. It
cannot prove professional taste, blind preference, or competitor superiority.

**Root fix:** preregister held-out briefs/defects outside the agent-under-test's
write scope, collect independent reviewer labels, and report losses as well as
wins. A generated seeded-defect catch rate must be described as first-party.

### A0-02 — P0 release-policy defect — subjective style rules can veto output

`Finding.severity` is the only policy field, and release blocks every P1. There
is no explicit `hard-defect | style-flag` classification or general accepted
override receipt. Current P1 style opinions include:

- `MO-CHOR-2`: three hero-role elements;
- `MO-CHOR-1`: high simultaneity or long stagger;
- `MO-EASE-2`: an ease-in entrance;
- `MO-SLOP-1`: fade-only text-card sequencing;
- `MO-TYPE-4`: text outside a conventional safe zone;
- `QE-BLANK-1`: a nearly uniform midpoint;
- register minimum scene duration and fixed reading-time heuristics.

**Reproduction actually run:** mutate the first launch scene so three elements
have `role: "hero"`, validate, then call `runStaticGates`. The result is
`MO-CHOR-2`, severity P1, which blocks release despite being a legitimate
maximalist or ensemble composition.

**Impact:** Chitra can refuse unconventional but intentional work. This violates
the style-agnostic product goal.

**Root fix:** ADR-first two-tier gate policy. Only corruption, invalid
references, deterministic failure, unreadable/accessibility requirements the
user actually selected, provenance/legal violations, missing assets, and final
delivery invariant failures are non-overridable. Style heuristics become typed,
logged, overridable flags and never block by default.

### A0-03 — P0 quality-boundary defect — contrast is not uniformly pixel-based

Text over media is sampled from a rendered screenshot, but non-media Score text
uses declared palette luminance against the declared scene background. Raw
figure CSS is not token-enforced. The media calculation uses mean RGB for the
text rectangle rather than separating glyph foreground from local background,
so highly varied backgrounds can be mischaracterized.

**Reproduction:** inspect `runFrameGates` after the sampled loop: the
"Static contrast for non-media text" path calls `hexLum` on Score palette
values and never reads a pixel buffer. Known issue A8 separately records raw CSS
theme bypass.

**Impact:** false positives and false negatives are possible; the code cannot
support the broad claim that all contrast gates inspect delivered pixels.

**Root fix:** one rendered-pixel contrast contract for all addressable DOM text,
with glyph/background separation and threshold calibration against externally
measured fixtures. Rasterized text must be declared structurally uninspectable
or evaluated with a separate OCR/vision path.

### A0-04 — P0 quality-boundary defect — sub-250ms temporal defects can evade release

`frameGateSampleTimes` samples at no more than 250ms intervals and adds
animation/cut neighborhoods. It is not continuous or every-frame. A one-frame
contrast, overlap, blank, or visibility defect between samples can pass.

**Reproduction:** direct code inspection of `FRAME_GATE_INTERVAL_MS = 250` and
the sample set in `frameGateSampleTimes`; current-state and known-issues already
acknowledge this boundary.

**Impact:** release is not every-frame certified. Short social/glitch work makes
this especially relevant.

**Root fix:** classify analytically tractable visibility spans and inspect all
frames where a hard text-legibility invariant can change. Retain bounded samples
for style flags. Benchmark the cost before making every-frame capture universal.

### A0-05 — P1 package defect — ESM import works; CommonJS require fails

**Status after Phase 1 root fix:** closed in this branch; retained here as the
reproduced pre-fix record.

The public rc.4 package was installed into a clean local prefix.

```text
import('chitra-video') → success; validateScore/renderScore exported; 129 exports
require('chitra-video') → ERR_PACKAGE_PATH_NOT_EXPORTED
```

The package `exports` map declares only `import`, and the public install
benchmark exercises the CLI but not the library entry.

**Impact:** CommonJS consumers receive an opaque package-boundary failure.

**Root fix applied:** the export map now supplies `require` to the same
synchronous ESM entry supported by the declared Node ≥22.12 runtime. The actual
packed package is installed and both `import('chitra-video')` and
`require('chitra-video')` must expose `validateScore` and `renderScore` in the
permanent cold-start benchmark. Ubuntu Node 22 CI remains the cross-version
acceptance check.

### A0-06 — P1 distribution gap — stable npm does not contain the best build

`npm view chitra-video versions` returns only `0.4.0`; rc.4 is a SHA-pinned
GitHub prerelease. `npm whoami` returned HTTP 401 during the preceding release
pass.

**Impact:** the shortest expected install command gives users an older product.

**Root fix:** restore npm authentication, publish immutable stable `0.5.x`, then
test a registry download in a clean prefix. Do not repoint docs until the public
bytes pass.

### A0-07 — P1 determinism gap — claim exceeds evidence

Same-session and several same-machine repeated captures are byte-identical.
Cross-machine, cold/warm, interrupted/resumed, and browser-version equivalence
are not proven. The architecture states the render is a pure function and also
describes parallel rendering, while the current implementation uses a system
browser, has no interrupt handler, and has no proven concurrent worker path.

**Impact:** "same input → identical frames" is currently too broad.

**Root fix:** scope documentation immediately; then add pinned environment
goldens, interruption recovery, concurrent-cache tests, and macOS/Linux/Windows
equivalence policy (byte-identical where possible, preregistered perceptual
tolerance otherwise).

### A0-08 — P1 CI gap — one OS and no independent/held-out suites

`.github/workflows/ci.yml` has one `ubuntu-latest` job. It runs the first-party
full suite. It does not run macOS/Windows, randomized adversarial cases, a
golden-frame matrix, or a generative-range suite.

**Impact:** platform-specific browser, font, FFmpeg, path, and process-cleanup
defects can reach `main`.

**Root fix:** split fast deterministic contracts from expensive platform media
checks; require Linux plus macOS/Windows smoke lanes, and keep held-out evaluator
artifacts outside the agent-under-test's modification scope.

### A0-09 — P1 evaluation gap — creative range is unmeasured

The examples contain two main Score genres plus targeted synthetic fixtures.
There is no permanent 8–12-brief range suite for comedic, contemplative,
infographic, abstract, narrative, meme, minimalist, and maximalist work.

**Impact:** a change can improve reference precision while narrowing generative
range without CI noticing.

**Root fix:** preregister varied briefs and outcome fields; let the host agent
generate drafts without manual help; independently label coherence/on-brief
behavior; keep quality judgment separate from deterministic defect detection.

### A0-10 — P1 audio-evidence gap — actual mux is measured, verification is not independent

Release measures the delivered mux with FFmpeg loudnorm and blocks a music-led
mix outside −14 ±0.5 LUFS or above −1.5 dBTP. The generated release benchmark
asserts values returned by that same pipeline. Receipt verification later hashes
the output but does not independently decode and remeasure audio invariants.

**Impact:** this is stronger than trusting declared gain, but it is not an
independent measurement oracle.

**Root fix:** add a separate black-box packed-CLI test that runs its own FFmpeg
measurement over the delivered file and compares decoded duration/audio onset
against picture duration.

### A0-11 — P1 version-governance risk — reconciled strings are not one source

Current package/plugin/lock/skill versions reconcile in `check-repo.mjs`.
However, the capability matrix repeats package `0.5.0`, starter generation
hardcodes Motion IR `0.1.0`, and multiple schemas intentionally own separate IR
versions. The current values match, but drift is prevented by text inspection,
not generated from one typed version module.

**Root fix:** distinguish package version from each IR protocol; centralize
runtime protocol constants and import them into CLI generators. Continue
cross-file release reconciliation for manifests that cannot import TypeScript.

### A0-12 — P1 edge-case deficit

Unproven or unsupported paths from the requested hardening list:

- long compositions and audio/video drift accumulation;
- concurrent rendering/cache writers;
- interruption and process cleanup;
- circular/deep compositions (feature absent);
- non-Latin, RTL, emoji, and combining typography;
- high-DPI equivalence;
- 64×64 output (schema currently requires at least 320×320);
- 4K stress behavior beyond accepting dimensions up to 4096;
- schema/property fuzzing;
- transparent/alpha delivery;
- browser/font equivalence across platforms.

These are not all promised capabilities, but unsupported ones must remain
explicit in `chitra capabilities`; promised ones need permanent tests.

## Existing strengths that survived this audit

- Public rc.4 ESM import, CLI version, probe, and real browser frame work from a
  clean install. The import could have failed on missing files or exports.
- Release writes staged outputs and a hash-bound receipt, and generated tests
  demonstrate input/output tamper rejection. This could have failed on changed
  bytes or target aliasing.
- Local assets/fonts are path-normalized, symlink-contained, fingerprinted, and
  included in render/cache identity in tested fixtures.
- Brand System is optional. It does not force a logo, palette, or brand flow;
  conformance activates only when `score.meta.brand` is bound.
- Final audio is measured from encoded output rather than trusted from Score
  gain declarations.
- Capability registry and current-state documentation explicitly admit major
  unsupported areas and do not claim competitor superiority.

## Definition-of-done status

| Requirement | Status at audit |
|---|---|
| `AUDIT_PHASE0.md` with defects/severity/repro | **met by this file** |
| clean CLI package install | **met for rc.4 on one macOS machine and Ubuntu CI** |
| clean library import | **ESM + CommonJS fixed and added to packed-package test; CI pending** |
| every known bypass has permanent adversarial regression | **not met** |
| every gate explicitly hard defect or overridable style flag | **implemented; independent boundary-fixture review pending** |
| loudness/frame/style checks uniformly inspect rendered output | **partially met** |
| multi-OS full/golden/range CI | **not met** |
| current version strings reconcile | **met now; single-source architecture not met** |
| numeric reference comparison | **met as diagnostic; exact reconstruction not met** |
| varied generative-range results | **not met** |
| blind external comparison | **not met; no owner/date recorded** |
| held-out/randomized anti-gaming evaluator | **not met** |
| named competitor gaps | **met in capability audit/current state** |

## Root-fix order

1. ADR: formal two-tier gate contract and release override receipt; reclassify
   existing rules before adding features.
2. Build a black-box adversarial suite for package import, rendered contrast,
   transient visibility, audio remeasurement, and gate-policy regressions.
3. Replace palette/token contrast claims with calibrated rendered-pixel
   evidence and analytical/all-change-frame coverage for hard defects.
4. Scope determinism/parallelism wording, then add interrupt/concurrency and
   cross-platform golden checks.
5. Publish stable npm only after packed CLI + ESM/CommonJS policy + skills
   installation pass publicly.
6. Run the independently labelled generative-range and blind comparison
   programs. Only external results can close creative-quality claims.

No masks, motion blur, imported animation, narration, or other renderer feature
should enter the implementation queue before items 1–3 have executable proof.
