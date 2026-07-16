# ADR-0024 — Rendered figure text registration

**Status:** accepted · 2026-07-16

## Context

Figures render arbitrary sanitized HTML inside the composed frame, but
`textRegions()` registers only top-level Score `text` and `stat` elements.
Figure labels therefore bypass minimum size, contrast, safe-zone, reading-time,
and overlap gates. This is audit finding A1 and invalidates a broad “gates run
on figure pixels” claim.

Parsing figure HTML into guessed boxes before render would be incorrect: CSS,
fonts, wrapping, nested transforms, and choreography determine the actual text
geometry. The browser already exposes the authoritative rendered DOM at every
seek instant.

## Decision

1. Figure wrappers expose stable scene and figure IDs. At `textRegions()` time,
   Chitra walks rendered text nodes and records actual range geometry, computed
   font size/color, ancestor visibility, normalized text, and the nearest
   addressable figure target.
2. Figure text enters the existing MO-TYPE-1/2/4, MO-EDIT-1, and QE-OVERLAP-1
   frame gates. Reading time uses inner-element or whole-figure enter/exit
   choreography when addressable; otherwise it conservatively uses scene
   duration.
3. Media contrast is sampled at all three declared scene instants, not only the
   midpoint. The midpoint capture is reused for blank-frame analysis.
4. Empty/whitespace nodes, style content, hidden ancestors, transparent text,
   zero-area ranges, and ranges fully clipped by rectangular overflow ancestors
   are ignored. Diagnostic selectors identify the figure, nearest inner ID, and
   text-node index without mutating user fragments.
5. The generated browser benchmark must catch small, low-contrast, off-safe,
   overlapping, unreadably long figure text and leave a compliant control
   clear.

## Consequences

- Figure UI labels now share the same deterministic rendered floor as Score
  text rather than relying on agent discipline alone.
- Text split across multiple DOM text nodes is evaluated as multiple rendered
  regions; findings cite the exact node-level diagnostic path.
- Gates still sample three instants, not continuous intervals. Transient
  violations between samples, non-rectangular CSS clipping, and text painted
  into raster images remain open and are not described as solved.
