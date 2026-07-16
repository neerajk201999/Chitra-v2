/**
 * ADR-0011: deterministic beat/tempo detection. ffmpeg decodes to mono f32 PCM;
 * we compute a short-time energy-flux onset envelope and peak-pick beats. No new
 * dependency, no randomness — same file in, same beats out.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export interface BeatAnalysis {
  bpm: number;
  firstBeatMs: number;
  beats: number[]; // ms from start
  durationMs: number;
}

const SR = 22050;
const HOP = 256; // ~11.6ms at 22050

export function analyzeAudio(file: string): BeatAnalysis {
  const abs = path.resolve(file);
  if (!existsSync(abs)) throw new Error(`No such audio/video: ${abs}`);
  const r = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", abs, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"],
    { encoding: "buffer", maxBuffer: 1 << 30 }
  );
  if (r.status !== 0 || !r.stdout?.length)
    throw new Error(`ffmpeg decode failed (does it have audio?): ${(r.stderr?.toString() ?? "").slice(-300)}`);
  const buf = r.stdout;
  const n = Math.floor(buf.length / 4);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = buf.readFloatLE(i * 4);
  const durationMs = Math.round((n / SR) * 1000);

  // Short-time energy per hop, then positive flux (onset envelope).
  const hops = Math.floor(n / HOP);
  const energy = new Float64Array(hops);
  for (let h = 0; h < hops; h++) {
    let e = 0;
    for (let i = 0; i < HOP; i++) {
      const s = pcm[h * HOP + i];
      e += s * s;
    }
    energy[h] = Math.sqrt(e / HOP);
  }
  const flux = new Float64Array(hops);
  for (let h = 1; h < hops; h++) flux[h] = Math.max(0, energy[h] - energy[h - 1]);

  // Adaptive threshold peak-pick with a min inter-onset gap.
  const win = 8; // ~93ms local mean window
  const minGapHops = Math.ceil((0.12 * SR) / HOP); // 120ms
  const hopMs = (HOP / SR) * 1000;
  const beats: number[] = [];
  let last = -Infinity;
  for (let h = 1; h < hops - 1; h++) {
    let sum = 0, cnt = 0;
    for (let k = Math.max(0, h - win); k <= Math.min(hops - 1, h + win); k++) {
      sum += flux[k];
      cnt++;
    }
    const localMean = sum / cnt;
    const thresh = localMean * 1.5 + 1e-4;
    if (flux[h] > thresh && flux[h] >= flux[h - 1] && flux[h] >= flux[h + 1] && h - last >= minGapHops) {
      beats.push(Math.round(h * hopMs));
      last = h;
    }
  }

  // Tempo from median inter-beat interval.
  let bpm = 0;
  if (beats.length >= 2) {
    const iois: number[] = [];
    for (let i = 1; i < beats.length; i++) iois.push(beats[i] - beats[i - 1]);
    iois.sort((a, b) => a - b);
    const medianIoi = iois[Math.floor(iois.length / 2)];
    bpm = medianIoi > 0 ? Math.round(60000 / medianIoi) : 0;
    // Fold into a musical range (60–180).
    while (bpm > 180) bpm = Math.round(bpm / 2);
    while (bpm > 0 && bpm < 60) bpm *= 2;
  }
  return { bpm, firstBeatMs: beats[0] ?? 0, beats, durationMs };
}
