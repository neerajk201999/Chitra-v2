# Chitra runtime assets

Only bytes executed or embedded by Chitra are shipped here. This replaces full
runtime dependencies for Three.js and four Fontsource families (ADR-0033).

| Asset | Upstream version | License | Source | SHA-256 |
|---|---:|---|---|---|
| `three/three.module.js` | Three.js 0.169.0 | MIT | https://www.npmjs.com/package/three/v/0.169.0 | `0a3368c165eea773490aec7b77c22de70e3eac288503409256fdbf4d12578416` |
| `fonts/inter/inter-latin-400-normal.woff2` | Fontsource Inter 5.2.8 | OFL-1.1 | https://www.npmjs.com/package/@fontsource/inter/v/5.2.8 | `8909904ab6c872eb994093482a88a28eca2cd95912d7b6fecd72103b0dc07edc` |
| `fonts/inter/inter-latin-500-normal.woff2` | 5.2.8 | OFL-1.1 | same | `f3779f1efccc4bdcdf9c0a02ab95bf6bd092ed09c48c08cedc725889edd1d19f` |
| `fonts/inter/inter-latin-600-normal.woff2` | 5.2.8 | OFL-1.1 | same | `f9a06e79cd3a2a20951c0f0e28f66dd0e6d3fda73911d640a2125c8fcb78f21a` |
| `fonts/space-grotesk/space-grotesk-latin-400-normal.woff2` | Fontsource Space Grotesk 5.2.10 | OFL-1.1 | https://www.npmjs.com/package/@fontsource/space-grotesk/v/5.2.10 | `65fd17fcbd2e2f522940b5f67ead3d23329e02891aa5495e74d11a499c0b0673` |
| `fonts/space-grotesk/space-grotesk-latin-500-normal.woff2` | 5.2.10 | OFL-1.1 | same | `1b1a8131d9edf975d9decee81e2f2bf504812f7a4f498e5500f28a613e22e64c` |
| `fonts/space-grotesk/space-grotesk-latin-700-normal.woff2` | 5.2.10 | OFL-1.1 | same | `35f8aec56cfd5cbfdb03cc68733a54a0b05bb3617ffcd5fd332badc0b045ca55` |
| `fonts/instrument-serif/instrument-serif-latin-400-normal.woff2` | Fontsource Instrument Serif 5.2.8 | OFL-1.1 | https://www.npmjs.com/package/@fontsource/instrument-serif/v/5.2.8 | `5eb09b5ac0e28b67c2f041c8ba6d244604ca0c0980d65912ab2d47fed84ddc31` |
| `fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2` | Fontsource JetBrains Mono 5.2.8 | OFL-1.1 | https://www.npmjs.com/package/@fontsource/jetbrains-mono/v/5.2.8 | `14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb` |
| `fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2` | 5.2.8 | OFL-1.1 | same | `cb182feeed4d798ff6961d3c79f7026279448fca0676438aaecb21f3fc39553a` |

Exact upstream license texts are in `licenses/`. GSAP remains a normal npm
dependency under its standard no-charge license and is not vendored here.
