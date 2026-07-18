# Review 0009 — public-preview distribution adversarial review

**Date:** 2026-07-18 · **Scope:** ADR-0037 artifact origin, public download,
checksum, isolated installation, documentation, and stable-release boundaries.

## Verdict

The GitHub prerelease is a truthful temporary path for outside 0.5.0 testing.
It uses the normal npm package and introduces no installer/runtime dependency.
It is not stable npm publication, independent-user proof, or a substitute for
the stable annotated release transaction.

## Findings and disposition

| Severity | Finding | Disposition |
|---|---|---|
| P1 | Upload success did not prove the asset could be installed from its public URL. | The source-parameterized cold-start harness downloads the public URL into a fresh prefix, verifies SHA-256, installs, launches the real browser/FFmpeg probe, locks Intake, initializes, validates, and captures a frame. |
| P1 | A release asset can be replaced under the same filename by a privileged maintainer. | The release, docs, and benchmark pin SHA-256 `f93a3a…44c8`; changed bytes fail before installation. GitHub's asset metadata reports the same digest. |
| P1 | Documentation could silently drift to another URL or checksum. | Repository consistency extracts the benchmark constants and requires the install surfaces to carry the URL and the integrity surfaces to carry the digest. |
| P2 | A remote source could hang, redirect to an unbounded body, or consume excessive memory. | The harness requires HTTPS, follows bounded redirects through `fetch`, applies a 30-second abort, and refuses declared or received bodies over 10 MiB. |
| P2 | The existing executable-mode check inspected local `dist` even for a remote artifact. | Remote verification now relies on the installed binary actually executing; the source-mode prepack bit check only runs for local packages. |
| P2 | A copied placeholder using `<probe-dir>` was parsed by shells as redirection. | README command examples now use a literal `SEARCH_DIGEST` path segment and also remove the nonexistent `direction-select --evidence` option from the core README. |
| P2 | Embedding a candidate's own URL in its packaged README changed the bytes after the candidate was assigned, creating a self-reference/repack loop. | The packaged README is channel-neutral and links to the repository install guide. Root install surfaces—not immutable package bytes—pin the current URL and checksum. |
| P2 open | Direct URL installation does not enforce the documented checksum for a friend by itself. | The pinned benchmark verifies it and the checksum is visible; this is accepted for the temporary preview. Stable npm publication restores registry integrity metadata and the short command. |
| P2 open | The successful run used this machine and warm npm dependencies. | Results explicitly refuse network-cold, cross-OS, outside-user, or three-harness claims. Friend-test collection remains the M3 exit gate. |
| P3 open | The prerelease tag is a GitHub test ref, not the annotated stable `vX.Y.Z` release. | ADR-0037 does not supersede ADR-0014's stable tag requirement. Stable 0.5.0 remains unpublished. |

## Evidence

- GitHub release `v0.5.0-rc.3` is marked prerelease and targets protected-main
  commit `2b847f33ce7af49546f6675b27de6055a347f852` after PR #27 and post-merge CI.
- GitHub reports asset size 586,285 bytes and the pinned SHA-256.
- Self-consistent public run: 4.8s install, 62.9 MiB, zero browser bytes, 12.4s through
  a 1,709 KiB browser frame with warm dependencies.
- Historical rc.1/rc.2 remain immutable. Rc.3 makes packaged documentation
  channel-neutral, eliminating the candidate-URL/self-reference release loop.
- A deliberately wrong expected SHA-256 is rejected before npm installation.

## Merge boundary

Merge requires local full verification, protected PR CI, and post-merge CI. The
external benchmark must still pass from the merged documentation branch; npm
publication remains a separate authenticated transaction.
