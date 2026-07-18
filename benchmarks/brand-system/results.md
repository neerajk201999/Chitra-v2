# Brand System benchmark — 2026-07-18

- Locked one reusable brand from **3 source artifacts**, **3 authored rules**, a **7-role palette**, and **2 local WOFF2 faces**.
- Exact Brand→Intake→Direction→Score conformance: **green**.
- Custom licensed typography rendered in a real browser and repeated **byte-identically** across independent sessions.
- Changed font bytes invalidated scene cache identity.
- Binding, palette, font, rule-text, source-role, and font-rights drift were caught by **CC-BRAND-3..6/CC-ASSET-2**.
- Missing font weight, invalid WOFF2 bytes, traversal, symlink escape, stale SHA-256, and stale Brand digest were rejected.
- CLI lock/conformance matched the library result, and brand-bound
  `creative-check`/release refused omission before the check passed with the
  locked profile.
- A successful synthetic release receipt bound the Brand file, detected later
  Brand-byte drift, and protected the Brand input from release-target overwrite.

This proves deterministic brand evidence and executable style survival. It does
not prove automatic brand interpretation or professionally good brand expression.
