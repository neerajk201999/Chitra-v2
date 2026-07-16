# Rendered figure text gate benchmark

**Verified:** 2026-07-16 · **ADR:** 0024

The real-browser fixture proves that text authored inside a sanitized figure is
registered from its rendered DOM and reaches:

- MO-TYPE-1 minimum rendered font size;
- MO-TYPE-2 pixel-sampled contrast at the three declared scene instants;
- MO-TYPE-4 platform safe zones;
- MO-EDIT-1 reading-time floor; and
- QE-OVERLAP-1 settled text collision detection.

One deliberately small, dark, off-safe, overlapping, long label triggers all
five rules. A short 16px high-contrast control inside the safe zone triggers
none. Fully clipped and transparent text nodes are ignored. Text embedded in
raster images, non-rectangular CSS clipping, and violations between the three
samples remain explicitly unmeasured.
