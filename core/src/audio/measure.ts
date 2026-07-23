import { spawnSync } from "node:child_process";

export type AudioMeasurement =
  | { status: "missing" }
  | {
      status: "present";
      integratedLufs: number | null;
      truePeakDbtp: number | null;
      loudnessRangeLu: number | null;
      thresholdLufs: number | null;
      targetOffsetLu: number | null;
    };

const finite = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Measure the encoded stream that users will actually receive. */
export function measureAudio(file: string, targetTruePeak = -1.8): AudioMeasurement {
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", file], { encoding: "utf8" });
  if (probe.error) throw probe.error;
  if (probe.status !== 0) throw new Error(`ffprobe audio inspection failed: ${(probe.stderr ?? "").slice(-500)}`);
  if (!probe.stdout.trim()) return { status: "missing" };

  const measured = spawnSync("ffmpeg", [
    "-hide_banner", "-nostats", "-i", file,
    "-af", `loudnorm=I=-14:TP=${targetTruePeak}:LRA=11:print_format=json`,
    "-f", "null", "-",
  ], { encoding: "utf8" });
  if (measured.error) throw measured.error;
  const json = [...(measured.stderr ?? "").matchAll(/\{\s*"input_i"[\s\S]*?\}/g)].at(-1)?.[0];
  if (measured.status !== 0 || !json) throw new Error(`ffmpeg loudness measurement failed: ${(measured.stderr ?? "").slice(-800)}`);
  const data = JSON.parse(json) as Record<string, unknown>;
  return {
    status: "present",
    integratedLufs: finite(data.input_i),
    truePeakDbtp: finite(data.input_tp),
    loudnessRangeLu: finite(data.input_lra),
    thresholdLufs: finite(data.input_thresh),
    targetOffsetLu: finite(data.target_offset),
  };
}

export function audioInvariantIssues(
  measurement: AudioMeasurement,
  hasMusic: boolean,
  hasSfx: boolean,
  hasNarration = false,
): string[] {
  if (!hasMusic && !hasSfx && !hasNarration) return measurement.status === "missing" ? [] : ["silent Score unexpectedly contains an audio stream"];
  if (measurement.status === "missing") return ["Score declares audio but the final mux has no audio stream"];
  const issues: string[] = [];
  if (measurement.truePeakDbtp == null) issues.push("final true peak is not measurable");
  else if (measurement.truePeakDbtp > -1.5) issues.push(`final true peak ${measurement.truePeakDbtp.toFixed(2)} dBTP exceeds −1.5 dBTP`);
  if (hasMusic || hasNarration) {
    if (measurement.integratedLufs == null) issues.push("final integrated loudness is not measurable");
    else if (Math.abs(measurement.integratedLufs + 14) > 0.5)
      issues.push(`final integrated loudness ${measurement.integratedLufs.toFixed(2)} LUFS is outside −14 ±0.5 LU`);
  }
  return issues;
}
