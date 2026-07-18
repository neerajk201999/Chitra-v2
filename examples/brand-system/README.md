# Brand System example

`brand.json` shows the smallest reusable Brand System using bundled fonts. Each
`sourceId` must exist in the project Intake with the `brand` role, and every rule
must be copied verbatim into `intake.brand.constraints` before Direction.

For an owned/licensed custom face, add one local WOFF2 entry per used weight:

```json
{
  "family": "Acme Sans",
  "src": "assets/acme-500.woff2",
  "weight": 500,
  "sourceId": "brand-font-500"
}
```

Lock and check it with:

```bash
chitra brand-lock brand.json --project . -o brand.lock.json
chitra brand-conform brand.lock.json intake.lock.json direction.json score.json
```

The benchmark in `benchmarks/brand-system/` proves custom-font rendering,
cache invalidation, provenance, and drift rejection.
