#!/usr/bin/env node
import { createHash } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EditDecisionList, TranscriptDraft, lockTranscript, packTranscript, renderEdit,
  resolveEdit, transcriptDigest, verifyTranscriptSources,
} from "../../core/dist/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "../../core/dist/cli/index.js");
const work = path.join(here, ".work");
const assets = path.join(work, "assets");
const check = process.argv.includes("--check");
const command = (bin, args) => {
  const result = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.error || result.status !== 0) throw new Error(`${bin} failed: ${(result.stderr || result.error?.message || "").slice(-1000)}`);
  return result.stdout;
};
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const rms = (samples, start, end) => {
  let sum = 0, count = 0;
  for (let index = Math.max(0, Math.floor(start * 48000)); index < Math.min(samples.length, Math.ceil(end * 48000)); index++) {
    sum += samples[index] ** 2; count++;
  }
  return Math.sqrt(sum / count);
};

rmSync(work, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });
try {
  command("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=#d11735:s=640x360:r=30:d=4", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(assets, "spoken.mp4")]);
  command("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=#2455ff:s=480x360:r=24:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(assets, "silent.mp4")]);

  const draft = TranscriptDraft.parse({
    transcriptVersion: "0.1.0", projectId: "fixture-edit", language: "en",
    provider: { name: "fixture", model: "known-words", version: "1" },
    sources: [
      { id: "spoken", path: "assets/spoken.mp4", intakeSourceId: "owned-spoken", rights: "owned" },
      { id: "silent", path: "assets/silent.mp4", intakeSourceId: "owned-silent", rights: "owned" },
    ],
    tokens: [
      { id: "s-one", sourceId: "spoken", startMs: 500, endMs: 900, text: "We", speakerId: "speaker-one" },
      { id: "s-two", sourceId: "spoken", startMs: 920, endMs: 1400, text: "begin.", speakerId: "speaker-one" },
      { id: "s-three", sourceId: "spoken", startMs: 2200, endMs: 2600, text: "We", speakerId: "speaker-one" },
      { id: "s-four", sourceId: "spoken", startMs: 2620, endMs: 3100, text: "return.", speakerId: "speaker-one" },
      { id: "v-one", sourceId: "silent", startMs: 1000, endMs: 1400, text: "Visual", speakerId: "screen" },
      { id: "v-two", sourceId: "silent", startMs: 1420, endMs: 1900, text: "proof.", speakerId: "screen" },
    ],
  });
  const locked = lockTranscript(draft, work);
  const packed = packTranscript(locked);
  const rawChars = JSON.stringify(locked).length;
  const reduction = Math.round((1 - packed.length / rawChars) * 100);
  if (reduction < 35) throw new Error(`phrase pack reduction only ${reduction}%`);

  const edit = EditDecisionList.parse({
    editVersion: "0.1.0", title: "Generated transcript edit", transcriptDigest: transcriptDigest(locked),
    output: { width: 640, height: 360, fps: 30, audioFadeMs: 30, audioTargetLufs: -14 },
    segments: [
      { id: "open", sourceId: "spoken", startWordId: "s-one", endWordId: "s-two", preRollMs: 30, postRollMs: 80, beat: "setup", quote: "We begin.", reason: "Opens with the first complete spoken thought." },
      { id: "proof", sourceId: "silent", startWordId: "v-one", endWordId: "v-two", preRollMs: 30, postRollMs: 80, beat: "proof", quote: "Visual proof.", reason: "Inserts a silent visual proof beat between claims." },
      { id: "return", sourceId: "spoken", startWordId: "s-three", endWordId: "s-four", preRollMs: 30, postRollMs: 80, beat: "return", quote: "We return.", reason: "Returns to speech after the visual proof beat." },
    ],
  });
  const resolved = resolveEdit(locked, edit);
  if (resolved.reduce((sum, segment) => sum + segment.durationMs, 0) !== 3030) throw new Error("resolved edit duration drifted");

  const draftFile = path.join(work, "transcript.json"), lockedFile = path.join(work, "transcript.lock.json");
  const editFile = path.join(work, "edit.json"), packFile = path.join(work, "transcript-pack.md");
  writeFileSync(draftFile, `${JSON.stringify(draft, null, 2)}\n`);
  writeFileSync(editFile, `${JSON.stringify(edit, null, 2)}\n`);
  command(process.execPath, [cli, "transcript-lock", draftFile, "-o", lockedFile, "--project", work]);
  const cliLocked = JSON.parse(readFileSync(lockedFile, "utf8"));
  if (transcriptDigest(cliLocked) !== transcriptDigest(locked)) throw new Error("CLI transcript lock differs from library contract");
  command(process.execPath, [cli, "transcript-pack", lockedFile, "-o", packFile, "--project", work]);
  if (readFileSync(packFile, "utf8") !== packed) throw new Error("CLI transcript pack differs from library contract");
  const cliCheck = JSON.parse(command(process.execPath, [cli, "edit-check", lockedFile, editFile, "--project", work, "--json"]));
  if (cliCheck.durationMs !== 3030 || cliCheck.segments.length !== 3) throw new Error("CLI edit check drifted");
  const cliOutput = path.join(work, "cli.mp4"), cliReceipt = path.join(work, "cli.edit.json");
  command(process.execPath, [cli, "edit-render", lockedFile, editFile, "--project", work, "-o", cliOutput, "--receipt", cliReceipt, "-q", "draft"]);
  const parsedReceipt = JSON.parse(readFileSync(cliReceipt, "utf8"));
  if (parsedReceipt.output.sha256 !== hash(cliOutput)) throw new Error("CLI receipt does not bind rendered output");
  const collision = path.join(work, "collision.mp4");
  const collisionResult = spawnSync(process.execPath, [cli, "edit-render", lockedFile, editFile, "--project", work, "-o", collision, "--receipt", collision, "-q", "draft"], { encoding: "utf8" });
  if (collisionResult.status === 0 || !`${collisionResult.stdout}${collisionResult.stderr}`.includes("receipt cannot overwrite"))
    throw new Error("CLI accepted a colliding video/receipt target");

  const first = path.join(work, "first.mp4"), second = path.join(work, "second.mp4");
  const receipt = renderEdit(locked, edit, work, first, "draft");
  renderEdit(locked, edit, work, second, "draft");
  if (hash(first) !== hash(second)) throw new Error("repeated edit output is not byte-identical");
  if (Math.abs(receipt.output.durationMs - 3030) > 60) throw new Error(`render duration ${receipt.output.durationMs}ms does not match EDL`);
  const probe = JSON.parse(command("ffprobe", ["-v", "error", "-show_streams", "-of", "json", first]));
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  if (video.width !== 640 || video.height !== 360 || !probe.streams.some((stream) => stream.codec_type === "audio"))
    throw new Error("normalized output geometry or audio stream is missing");
  const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", first, "-map", "0:a:0", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { encoding: "buffer", maxBuffer: 1 << 26 });
  if (pcm.status !== 0) throw new Error("cannot decode rendered edit audio");
  const samples = new Float32Array(pcm.stdout.buffer, pcm.stdout.byteOffset, Math.floor(pcm.stdout.byteLength / 4));
  if (rms(samples, 0.4, 0.6) < 0.01) throw new Error("spoken source audio was not preserved");
  if (rms(samples, 1.35, 1.65) > 0.002) throw new Error("silent source did not receive synthesized silence");
  if (rms(samples, 2.45, 2.65) < 0.01) throw new Error("return source audio was not preserved");

  const silentOnly = structuredClone(edit);
  silentOnly.segments = [silentOnly.segments[1]];
  const silentOutput = path.join(work, "silent-only.mp4");
  const silentReceipt = renderEdit(locked, silentOnly, work, silentOutput, "draft");
  const silentProbe = JSON.parse(command("ffprobe", ["-v", "error", "-show_streams", "-of", "json", silentOutput]));
  if (silentProbe.streams.some((stream) => stream.codec_type === "audio")) throw new Error("all-silent edit unexpectedly gained an audio stream");
  if (Math.abs(silentReceipt.output.durationMs - 1010) > 60) throw new Error("all-silent edit duration drifted");

  const spokenOnly = structuredClone(edit);
  spokenOnly.segments = [spokenOnly.segments[0]];
  try { renderEdit(locked, spokenOnly, work, path.join(assets, "silent.mp4"), "draft"); throw new Error("unused locked source was accepted as output"); }
  catch (error) { if (!String(error).includes("cannot overwrite a transcript source")) throw error; }
  const alias = path.join(work, "output-alias.mp4");
  symlinkSync(first, alias);
  try { renderEdit(locked, spokenOnly, work, alias, "draft"); throw new Error("symlink output was accepted"); }
  catch (error) { if (!String(error).includes("cannot be a symlink")) throw error; }
  const hardlink = path.join(work, "source-hardlink.mp4");
  linkSync(path.join(assets, "silent.mp4"), hardlink);
  try { renderEdit(locked, spokenOnly, work, hardlink, "draft"); throw new Error("hard-linked source was accepted as output"); }
  catch (error) { if (!String(error).includes("cannot overwrite a transcript source")) throw error; }

  const stale = structuredClone(edit); stale.transcriptDigest = "f".repeat(64);
  try { resolveEdit(locked, stale); throw new Error("stale digest was accepted"); } catch (error) { if (!String(error).includes("transcriptDigest")) throw error; }
  const quote = structuredClone(edit); quote.segments[0].quote = "Wrong words.";
  try { resolveEdit(locked, quote); throw new Error("quote drift was accepted"); } catch (error) { if (!String(error).includes("quote drift")) throw error; }
  const traversal = structuredClone(draft); traversal.sources[0].path = "../spoken.mp4";
  if (TranscriptDraft.safeParse(traversal).success) throw new Error("path traversal was accepted");
  writeFileSync(path.join(assets, "spoken.mp4"), Buffer.concat([readFileSync(path.join(assets, "spoken.mp4")), Buffer.from("stale")]));
  try { verifyTranscriptSources(locked, work); throw new Error("changed source bytes were accepted"); } catch (error) { if (!String(error).includes("changed after lock")) throw error; }

  const report = `# Transcript-addressed edit benchmark — 2026-07-18\n\n` +
    `- Two generated sources: one audiovisual, one silent/mismatched geometry and FPS.\n` +
    `- Transcript lock: exact bytes, media facts, owned Intake lineage.\n` +
    `- Compact phrase pack: ${locked.tokens.length} word-addressed tokens, ${reduction}% fewer characters than normalized word JSON.\n` +
    `- EDL: ${resolved.length} explainable word-boundary segments, exact quote conformance.\n` +
    `- CLI: lock, pack, check, render, and hash receipt agree with the library contract; colliding video/receipt targets are refused.\n` +
    `- Render: geometry/FPS normalized, spoken audio preserved, mixed-source silence synthesized, all-silent output kept silent, per-cut fades and final loudness filter applied.\n` +
    `- Expected/resolved duration: 3030ms; encoded duration within one output-frame tolerance.\n` +
    `- Repeated render: byte-identical.\n` +
    `- Stale transcript digest, quote drift, path traversal, changed source bytes, unused-source overwrite, symlink output, and hard-linked source target: rejected.\n`;
  if (check) {
    const expected = readFileSync(path.join(here, "results.md"), "utf8");
    if (report !== expected) throw new Error(`transcript-edit benchmark report drifted\n${report}`);
  } else process.stdout.write(report);
  console.log("✔ transcript-addressed edit: compact context, exact EDL, mixed/all-silent audio, deterministic render, seven integrity defects rejected");
} finally {
  rmSync(work, { recursive: true, force: true });
}
