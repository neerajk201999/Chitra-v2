#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { validateScore } from "../../core/dist/ir/schema.js";
import { openSession, renderScore, renderStorageEstimate } from "../../core/dist/render/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const requireFromCore = createRequire(path.join(root, "core/package.json"));
const sharp = requireFromCore("sharp");
const project = path.join(root, "examples/social-short");
const raw = JSON.parse(readFileSync(path.join(project, "score.json"), "utf8"));
const parsed = validateScore(raw);
if (!parsed.ok) throw new Error(`social fixture invalid: ${JSON.stringify(parsed.issues)}`);
const check = process.argv.includes("--check");
const samplesIndex = process.argv.indexOf("--samples");
const samples = samplesIndex < 0 ? 1 : Number(process.argv[samplesIndex + 1]);
if (!Number.isInteger(samples) || samples < 1 || samples > 9) throw new Error("--samples must be an integer from 1 to 9");
const QUALITY_FLOOR = { wholeSsim: 0.85, uiSsim: 0.83, uiMae: 0.02 };

async function pixelMetric(reference, candidate, region) {
  const refInfo = await sharp(reference).metadata();
  const aligned = await sharp(candidate).resize(refInfo.width, refInfo.height, { kernel: sharp.kernel.lanczos3 }).toBuffer();
  const crop = region ?? { left: 0, top: 0, width: refInfo.width, height: refInfo.height };
  const a = await sharp(reference).flatten({ background: "#000000" }).removeAlpha().extract(crop).raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(aligned).flatten({ background: "#000000" }).removeAlpha().extract(crop).raw().toBuffer({ resolveWithObject: true });
  let absolute = 0, sumA = 0, sumB = 0;
  const pixels = a.info.width * a.info.height;
  const lumaA = new Float64Array(pixels), lumaB = new Float64Array(pixels);
  for (let offset = 0, pixel = 0; offset < a.data.length; offset += a.info.channels, pixel++) {
    for (let channel = 0; channel < a.info.channels; channel++) absolute += Math.abs(a.data[offset + channel] - b.data[offset + channel]);
    lumaA[pixel] = (0.2126 * a.data[offset] + 0.7152 * a.data[offset + 1] + 0.0722 * a.data[offset + 2]) / 255;
    lumaB[pixel] = (0.2126 * b.data[offset] + 0.7152 * b.data[offset + 1] + 0.0722 * b.data[offset + 2]) / 255;
    sumA += lumaA[pixel]; sumB += lumaB[pixel];
  }
  const meanA = sumA / pixels, meanB = sumB / pixels;
  let varianceA = 0, varianceB = 0, covariance = 0;
  for (let pixel = 0; pixel < pixels; pixel++) {
    const da = lumaA[pixel] - meanA, db = lumaB[pixel] - meanB;
    varianceA += da * da; varianceB += db * db; covariance += da * db;
  }
  varianceA /= pixels; varianceB /= pixels; covariance /= pixels;
  return {
    mae: absolute / (a.data.length * 255),
    ssim: ((2 * meanA * meanB + 0.0001) * (2 * covariance + 0.0009)) /
      ((meanA * meanA + meanB * meanB + 0.0001) * (varianceA + varianceB + 0.0009)),
  };
}

async function runQualityProbe() {
  const work = mkdtempSync(path.join(os.tmpdir(), "chitra-draft-quality-"));
  const scoreRaw = structuredClone(raw);
  delete scoreRaw.audio;
  scoreRaw.meta.title = "Draft preview adversarial UI probe";
  scoreRaw.scenes = [{
    id: "micro-ui", reason: "Test reduced diagnostic capture against compact product UI and fine typography", durationMs: 1000,
    background: "bg", elements: [{ type: "figure", id: "ui", role: "hero", src: "figure.html", assets: [], position: { anchor: "top-left", x: 0, y: 0 }, width: 100, height: 100, radius: 0, shadow: false }],
    choreography: [], transitionOut: { type: "cut", duration: "standard" },
  }];
  const qualityScore = validateScore(scoreRaw);
  if (!qualityScore.ok) throw new Error(`quality fixture invalid: ${JSON.stringify(qualityScore.issues)}`);
  writeFileSync(path.join(work, "figure.html"), `
    <div style="position:absolute;left:90px;top:220px;width:900px;height:1400px;background:#11151b;border:1px solid #3b4654;border-radius:28px;overflow:hidden;font-family:Inter;color:#f2f2f6">
      <div style="padding:64px 58px 32px;border-bottom:1px solid #3b4654">
        <div id="title" style="font-size:48px;line-height:1.05;font-weight:600;letter-spacing:-1.5px">Signal depth</div>
        <div id="subtitle" style="margin-top:16px;font-size:24px;line-height:1.25;color:#aeb8c5">Realtime private-market intelligence</div>
      </div>
      <div style="display:flex;padding:30px 58px;gap:18px;border-bottom:1px solid #3b4654">
        <span style="font-size:16px;color:#8ee8c8">LIVE</span><span style="font-size:16px;color:#aeb8c5">20,418,293 companies</span>
      </div>
      <div style="padding:20px 58px">
        ${Array.from({ length: 12 }, (_, index) => `<div style="height:72px;display:flex;align-items:center;border-bottom:1px solid #29313b"><span style="width:36px;height:36px;border-radius:9px;background:${index % 3 === 0 ? "#6e7bf2" : "#202833"}"></span><span style="margin-left:18px;width:330px;font-size:16px">Company signal ${String(index + 1).padStart(2, "0")}</span><span style="font:12px JetBrains Mono;color:#8f9baa">${index % 2 ? "NEWS" : "FUNDING"}</span><span style="margin-left:auto;font:12px JetBrains Mono;color:#8ee8c8">+${17 + index}.${index}%</span></div>`).join("")}
      </div>
      <div style="position:absolute;left:58px;right:58px;bottom:36px;font:12px JetBrains Mono;color:#778391">GET /v1/signals?since=now</div>
    </div>`);
  const session = await openSession(qualityScore.score, work, path.join(work, "cache"));
  try {
    const full = await session.seekAndCapture(500, { type: "jpeg", quality: 82 });
    const half = await session.seekAndCapture(500, { type: "jpeg", quality: 82, scale: 0.5 });
    const fullInfo = await sharp(full).metadata(), halfInfo = await sharp(half).metadata();
    if (fullInfo.width !== 1080 || fullInfo.height !== 1920) throw new Error(`quality reference is ${fullInfo.width}×${fullInfo.height}, expected 1080×1920`);
    if (halfInfo.width !== 540 || halfInfo.height !== 960) throw new Error(`quality candidate is ${halfInfo.width}×${halfInfo.height}, expected 540×960`);
    const whole = await pixelMetric(full, half);
    const ui = await pixelMetric(full, half, { left: 90, top: 220, width: 900, height: 1400 });
    if (whole.ssim < QUALITY_FLOOR.wholeSsim || ui.ssim < QUALITY_FLOOR.uiSsim || ui.mae > QUALITY_FLOOR.uiMae)
      throw new Error(`reduced preview quality regression: whole SSIM ${whole.ssim}, UI SSIM ${ui.ssim}, UI MAE ${ui.mae}`);
    const oddRaw = structuredClone(scoreRaw);
    oddRaw.meta.width = 321;
    oddRaw.meta.height = 321;
    oddRaw.scenes[0].durationMs = 500;
    const oddScore = validateScore(oddRaw);
    if (!oddScore.ok) throw new Error(`odd-dimension fixture invalid: ${JSON.stringify(oddScore.issues)}`);
    const odd = await renderScore(oddScore.score, work, path.join(work, "odd.mp4"), { quality: "draft", cacheDir: path.join(work, "odd-cache") });
    if (odd.outputWidth !== 162 || odd.outputHeight !== 162)
      throw new Error(`odd-size draft output is ${odd.outputWidth}×${odd.outputHeight}, expected even-padded 162×162`);
    if (!check) {
      const left = await sharp(full).resize(540, 960).jpeg({ quality: 90 }).toBuffer();
      const right = await sharp(half).jpeg({ quality: 90 }).toBuffer();
      await sharp({ create: { width: 1080, height: 960, channels: 3, background: "#050607" } })
        .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 540, top: 0 }])
        .jpeg({ quality: 90 }).toFile(path.join(here, "quality-side-by-side.jpg"));
    }
    return { whole, ui };
  } finally {
    await session.close();
    rmSync(work, { recursive: true, force: true });
  }
}

const quality = await runQualityProbe();

function nearestRank(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
}

const runs = [];
for (let sample = 1; sample <= samples; sample++) {
  const work = mkdtempSync(path.join(os.tmpdir(), "chitra-draft-preview-"));
  try {
    const result = await renderScore(parsed.score, project, path.join(work, "preview.mp4"), {
      quality: "draft",
      cacheDir: path.join(work, "cache"),
    });
    const expectedFrames = Math.round((result.durationMs / 1000) * 12);
    if (result.captureFps !== 12) throw new Error(`draft captured at ${result.captureFps}fps, expected 12`);
    if (result.outputWidth !== 540 || result.outputHeight !== 960) throw new Error(`draft output is ${result.outputWidth}×${result.outputHeight}, expected 540×960`);
    if (Math.abs(result.totalFrames - expectedFrames) > 1) throw new Error(`draft frame count ${result.totalFrames} != ${expectedFrames}`);
    if (result.cacheBytes >= renderStorageEstimate(parsed.score, "standard") / 3)
      throw new Error("draft cache did not stay below one third of the standard estimate");
    if (statSync(result.outFile).size < 1000) throw new Error("draft preview MP4 is empty");
    const phaseTotal = Object.values(result.phaseMs).reduce((sum, value) => sum + value, 0);
    if (Object.values(result.phaseMs).some((value) => !Number.isFinite(value) || value < 0))
      throw new Error("draft preview emitted an invalid phase duration");
    if (Math.abs(phaseTotal - result.wallMs) > 5)
      throw new Error(`phase total ${phaseTotal}ms does not reconcile with wall ${result.wallMs}ms`);
    runs.push(result);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const wallValues = runs.map((run) => run.wallMs);
const phaseNames = ["setup", "capture", "encode", "finalize", "close"];
const phaseP50 = Object.fromEntries(phaseNames.map((name) => [name, nearestRank(runs.map((run) => run.phaseMs[name]), 0.5)]));
const p50 = nearestRank(wallValues, 0.5);
const p95 = nearestRank(wallValues, 0.95);
const first = runs[0];
const cacheMiB = first.cacheBytes / 1024 / 1024;
const sampleRows = runs.map((run, index) =>
  `| ${index + 1} | ${(run.wallMs / 1000).toFixed(2)} | ${(run.phaseMs.setup / 1000).toFixed(2)} | ${(run.phaseMs.capture / 1000).toFixed(2)} | ${(run.phaseMs.encode / 1000).toFixed(2)} | ${(run.phaseMs.finalize / 1000).toFixed(2)} | ${(run.phaseMs.close / 1000).toFixed(2)} |`
).join("\n");

if (!check) writeFileSync(path.join(here, "results.md"), `# Draft preview benchmark — 2026-07-18

- Fixture: **9.6s, 1080×1920, authored at 30fps**
- Preview: **${first.totalFrames} frames at ${first.captureFps}fps**
- Diagnostic output: **${first.outputWidth}×${first.outputHeight}** (full-resolution evidence and release renders are unchanged)
- JPEG frame cache: **${cacheMiB.toFixed(1)} MiB**
- Fresh-cache samples: **${samples}**
- Wall p50 / nearest-rank p95: **${(p50 / 1000).toFixed(2)}s / ${(p95 / 1000).toFixed(2)}s**
- Median phases: **${phaseNames.map((name) => `${name} ${(phaseP50[name] / 1000).toFixed(2)}s`).join(" · ")}**

| Sample | Wall s | Setup s | Capture s | Encode s | Finalize s | Close s |
|---:|---:|---:|---:|---:|---:|---:|
${sampleRows}

## Adversarial UI probe

- Content: 48px/24px/16px/12px type, one-pixel rules, status chips, and twelve compact rows
- Whole-frame full-vs-upscaled-half: **SSIM ${quality.whole.ssim.toFixed(4)} · MAE ${quality.whole.mae.toFixed(4)}**
- Product-UI region: **SSIM ${quality.ui.ssim.toFixed(4)} · MAE ${quality.ui.mae.toFixed(4)}**
- Regression floors: **whole SSIM ≥ ${QUALITY_FLOOR.wholeSsim.toFixed(2)} · UI SSIM ≥ ${QUALITY_FLOOR.uiSsim.toFixed(2)} · UI MAE ≤ ${QUALITY_FLOOR.uiMae.toFixed(2)}**
- Visual evidence: [full reference (left) vs half-resolution diagnostic (right)](quality-side-by-side.jpg)

The preview is diagnostic and cannot be released. Standard/high retain full
authored fps and lossless PNG capture. Small-copy OCR and final typography are
not proven by global pixel metrics; inspect standard/high output for those
decisions. Timings are local measurements, not a cross-machine service-level
claim. Reproduce with
\`node benchmarks/draft-preview/run.mjs --samples ${samples}\`.
`);

console.log(`✔ draft preview: ${first.totalFrames} frames @ ${first.captureFps}fps, ${cacheMiB.toFixed(1)} MiB cache, ${samples} sample${samples === 1 ? "" : "s"}, p50 ${(p50 / 1000).toFixed(2)}s / p95 ${(p95 / 1000).toFixed(2)}s`);
console.log(`  median phases: ${phaseNames.map((name) => `${name} ${(phaseP50[name] / 1000).toFixed(2)}s`).join(" · ")}`);
