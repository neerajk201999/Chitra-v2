#!/usr/bin/env node
/** ADR-0044 executable proof: frozen voice + word clock must drive browser
 * choreography and a ducked, measured final audio bus without a provider SDK. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { resolveSceneTimeline } from "../../core/dist/compile/index.js";
import { applyGatePolicies, runStaticGates } from "../../core/dist/gates/index.js";
import { validateScore } from "../../core/dist/ir/schema.js";
import { openSession, renderInputFiles, renderScore, scoreHash } from "../../core/dist/render/index.js";

const check = process.argv.includes("--check");
const work = mkdtempSync(path.join(os.tmpdir(), "chitra-narration-"));
const assets = path.join(work, "assets");
mkdirSync(assets);
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: null });
  assert.equal(result.status, 0, result.stderr?.toString() || result.stdout?.toString());
  return result.stdout;
};

const bed = path.join(assets, "bed.wav");
const voice = path.join(assets, "voice.wav");
const click = path.join(assets, "click.wav");
run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=2", bed]);
run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=1", voice]);
run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=1500:sample_rate=48000:duration=0.06", click]);

const raw = {
  irVersion: "0.1.0", tier: "score",
  meta: { title: "Narration sync proof", register: "product-demo", width: 320, height: 320, fps: 30, seed: 44, safeZone: "none" },
  style: {
    name: "proof",
    palette: { bg: "#050608", surface: "#11151b", primary: "#55e3c3", accent: "#7fa8ff", text: "#f7faf9", textDim: "#9ba5a4", onMedia: "#ffffff" },
    fonts: { display: "Inter", text: "Inter", mono: "JetBrains Mono" },
    displayWeight: 600, textWeight: 400, trackingDisplay: -0.02, grain: 0,
  },
  scenes: [{
    id: "voice", reason: "Prove two visual events follow the exact words that motivate them",
    durationMs: 2000, background: "bg",
    elements: [
      { type: "text", id: "first", role: "hero", textRole: "headline", content: "Signal", position: { anchor: "center", x: 50, y: 42 }, maxWidth: 80, align: "center", color: "text" },
      { type: "text", id: "second", role: "support", textRole: "title", content: "arrives.", position: { anchor: "center", x: 50, y: 62 }, maxWidth: 80, align: "center", color: "accent" },
    ],
    choreography: [
      { id: "first-word", target: "first", preset: "fade-in", duration: "standard", at: { after: "scene-start", offsetMs: 0, onNarrationWord: "word-signal" } },
      { id: "second-word", target: "second", preset: "scale-settle", duration: "standard", at: { after: "scene-start", offsetMs: 0, onNarrationWord: "word-arrives" }, sfx: { src: "assets/click.wav", gainDb: -20 } },
    ],
    transitionOut: { type: "cut", duration: "standard" },
  }],
  audio: {
    music: { src: "assets/bed.wav", gainDb: -9, fadeOutMs: 250, firstBeatMs: 0 },
    narration: {
      src: "assets/voice.wav", startMs: 500, gainDb: -2,
      script: "Signal arrives.",
      words: [
        { id: "word-signal", text: "Signal", startMs: 0, endMs: 250 },
        { id: "word-arrives", text: "arrives", startMs: 700, endMs: 950 },
      ],
      ducking: { threshold: 0.01, ratio: 12, attackMs: 10, releaseMs: 120 },
    },
  },
};

const parsed = validateScore(raw);
assert(parsed.ok, `narration fixture must validate: ${JSON.stringify(parsed.issues)}`);
const score = parsed.score;
const wordStarts = new Map(score.audio.narration.words.map((word) => [word.id, score.audio.narration.startMs + word.startMs]));
const resolved = resolveSceneTimeline(score.scenes[0], { sceneStartMs: 0, fps: 30, narrationWordStarts: wordStarts });
assert.deepEqual(resolved.map((item) => item.startMs), [500, 1200]);
assert.equal(applyGatePolicies(runStaticGates(score)).filter((finding) => finding.policy === "hard-defect").length, 0);
assert.deepEqual(
  renderInputFiles(score, work).filter((file) => file.endsWith(".wav")).map((file) => path.basename(file)).sort(),
  ["bed.wav", "click.wav", "voice.wav"],
);

const overlap = structuredClone(raw);
overlap.audio.narration.words[1].startMs = 200;
assert.equal(validateScore(overlap).ok, false, "overlapping narration words must fail");
const duplicate = structuredClone(raw);
duplicate.audio.narration.words[1].id = "word-signal";
assert.equal(validateScore(duplicate).ok, false, "duplicate narration word IDs must fail");
const scriptDrift = structuredClone(raw);
scriptDrift.audio.narration.script = "Signal never arrives.";
assert.equal(validateScore(scriptDrift).ok, false, "word clock must cover the locked script exactly");
const outsideFilm = structuredClone(raw);
outsideFilm.audio.narration.words[1].endMs = 1800;
assert.equal(validateScore(outsideFilm).ok, false, "word clock beyond picture must fail");
const unknownCue = structuredClone(score);
unknownCue.scenes[0].choreography[0].at.onNarrationWord = "word-missing";
assert(
  applyGatePolicies(runStaticGates(unknownCue)).some((finding) => finding.ruleId === "MO-AUD-5" && finding.policy === "hard-defect"),
  "unknown word cue must be a hard defect",
);
const sourceOverrun = structuredClone(raw);
sourceOverrun.audio.narration.words[1].endMs = 1100;
const sourceOverrunParsed = validateScore(sourceOverrun);
assert(sourceOverrunParsed.ok);
await assert.rejects(
  openSession(sourceOverrunParsed.score, work, path.join(work, "overrun-cache")),
  /beyond source audio duration/,
);

const session = await openSession(score, work, path.join(work, "session-cache"));
const states = [];
try {
  for (const ms of [400, 900, 1500, 400]) {
    await session.page.evaluate((time) => window.__chitra.seek(time), ms);
    states.push(await session.page.evaluate(() => [
      Number(getComputedStyle(document.querySelector("#voice--first")).opacity),
      Number(getComputedStyle(document.querySelector("#voice--second")).opacity),
    ]));
  }
  assert(states[0][0] < 0.01 && states[0][1] < 0.01, `both reveals must wait for speech: ${JSON.stringify(states[0])}`);
  assert(states[1][0] > 0.99 && states[1][1] < 0.01, `first word must reveal only first visual: ${JSON.stringify(states[1])}`);
  assert(states[2][0] > 0.99 && states[2][1] > 0.99, `second word must reveal second visual: ${JSON.stringify(states[2])}`);
  assert(states[3][0] < 0.01 && states[3][1] < 0.01, "backward seek must restore the pre-speech frame");
} finally {
  await session.close();
}

const originalVoice = readFileSync(voice);
const releaseBefore = scoreHash(score, work);
writeFileSync(voice, Buffer.concat([originalVoice, Buffer.from("\n")]));
assert.notEqual(scoreHash(score, work), releaseBefore, "changed narration bytes must invalidate release identity");
writeFileSync(voice, originalVoice);
const retimed = structuredClone(score);
retimed.audio.narration.words[1].startMs += 1;
assert.notEqual(scoreHash(retimed, work), scoreHash(score, work), "changed narration timing must invalidate release identity");

const out = path.join(work, "narrated.mp4");
const rendered = await renderScore(score, work, out, { quality: "draft", cacheDir: path.join(work, "render-cache") });
assert.equal(rendered.audio.status, "present");
assert(Math.abs(rendered.audio.integratedLufs + 14) <= 0.5, `program loudness ${rendered.audio.integratedLufs}`);
assert(rendered.audio.truePeakDbtp <= -1.5, `true peak ${rendered.audio.truePeakDbtp}`);

const band = run("ffmpeg", [
  "-v", "error", "-i", out, "-af", "bandpass=f=220:width_type=h:w=30",
  "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1",
]);
const samples = new Float32Array(band.buffer, band.byteOffset, Math.floor(band.byteLength / 4));
const rms = (startS, endS) => {
  const start = Math.floor(startS * 48000), end = Math.min(samples.length, Math.floor(endS * 48000));
  let sum = 0;
  for (let index = start; index < end; index++) sum += samples[index] * samples[index];
  return Math.sqrt(sum / Math.max(1, end - start));
};
const musicBeforeVoice = rms(0.15, 0.4);
const musicUnderVoice = rms(0.75, 1.0);
assert(
  musicUnderVoice < musicBeforeVoice * 0.7,
  `side-chain must attenuate the isolated music band under voice (${musicBeforeVoice.toFixed(5)} → ${musicUnderVoice.toFixed(5)})`,
);

const narrationOnlyRaw = structuredClone(raw);
delete narrationOnlyRaw.audio.music;
delete narrationOnlyRaw.scenes[0].choreography[1].sfx;
const narrationOnly = validateScore(narrationOnlyRaw);
assert(narrationOnly.ok);
const narrationOnlyRender = await renderScore(
  narrationOnly.score,
  work,
  path.join(work, "narration-only.mp4"),
  { quality: "draft", cacheDir: path.join(work, "narration-only-cache") },
);
assert.equal(narrationOnlyRender.audio.status, "present");
assert(Math.abs(narrationOnlyRender.audio.integratedLufs + 14) <= 0.5);

if (!check) {
  writeFileSync(path.join(import.meta.dirname, "results.md"), `# Narration and word-sync benchmark — 2026-07-23

- Provider-neutral local narration + word clock: **pass**
- Word-addressed visual starts: **500 ms → 1200 ms**
- Backward visual seek: **pass**
- Music-band RMS before/under voice: **${musicBeforeVoice.toFixed(5)} → ${musicUnderVoice.toFixed(5)}**
- Music ducking, narration, and choreography SFX on one bus: **pass**
- Narration-only measured final bus: **pass**
- Final loudness / peak: **${rendered.audio.integratedLufs?.toFixed(2)} LUFS / ${rendered.audio.truePeakDbtp?.toFixed(2)} dBTP**
- Narration byte/timing release invalidation: **pass**
- Script-drift/duplicate/overlap/source-overrun/out-of-film/unknown-cue defects: **rejected**

This proves supplied/generated-and-frozen narration mixing and word-addressed
motion. It does not prove bundled TTS, ASR accuracy, voice quality, lip sync, or
automatic caption art direction.
`);
}
console.log(`✔ narration sync: words 500→1200ms, music band ${musicBeforeVoice.toFixed(5)}→${musicUnderVoice.toFixed(5)}, ${rendered.audio.integratedLufs?.toFixed(2)} LUFS`);
rmSync(work, { recursive: true, force: true });
