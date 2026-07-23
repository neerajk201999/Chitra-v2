# Frame System and staged-handoff benchmark — 2026-07-23

- Typed stack + grid browser layout: **pass**
- Reasoned optical type treatment: **pass**
- Rendered element-target resolution: **pass** (13 visible regions)
- Equal-stack child percentages resolve inside three distinct cells: **pass**
- Hero pair alignment drift: **0.00 px**
- Hero pair rendered gap: **4.03 px**
- Seeded rendered gap defect: **caught (CC-FRAME-3)**
- Seeded invisible focal target: **caught (CC-FRAME-1)**
- Seeded transparent-asset-matte focal target: **caught (CC-FRAME-1)**
- Seeded alignment drift: **caught (CC-FRAME-2)**
- Duplicate figure inner target: **rejected**
- Board→Motion static-ownership drift: **caught (CC-STAGE-2)**
- Board→Motion Sound-owned SFX: **rejected**
- Same-path changed asset bytes: **caught**
- Motion→Master visual/timing drift: **caught (CC-STAGE-3)**
- Layout-input scene-cache invalidation: **pass**
- Backward/repeated frame capture: **byte-identical** (df599309371cc628…)
- Runtime dependencies added: **0**
- Package dry-run: **701.1 kB compressed / 2.8 MB unpacked**
  (pre-tranche: 672.1 kB / 2.7 MB)

This proves deterministic layout and handoff contracts. It does not prove
professional taste or general superiority over HyperFrames; that requires the
neutral outside-review benchmark recorded in the roadmap.
