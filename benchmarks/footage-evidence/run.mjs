#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EditDecisionList, FOOTAGE_EVIDENCE_VERSION, FootageEvidenceManifest,
  TranscriptDraft, editDigest, generateFootageEvidence, lockTranscript,
  transcriptDigest,
} from "../../core/dist/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(here, ".work"), assets = path.join(work, "assets");
const cli = path.join(here, "../../core/dist/cli/index.js");
const check = process.argv.includes("--check");
const keep = process.argv.includes("--keep");
const command = (bin, args) => {
  const result = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 1 << 27 });
  if (result.error || result.status !== 0) throw new Error(`${bin} failed: ${(result.stderr || result.error?.message || "").slice(-1200)}`);
  return result.stdout;
};
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

rmSync(work, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });
try {
  command("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=4", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(assets, "speaker.mp4")]);
  command("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=#2455ff:s=480x360:r=24:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(assets, "screen.mp4")]);

  const draft = TranscriptDraft.parse({
    transcriptVersion: "0.1.0", projectId: "evidence-fixture", language: "en",
    provider: { name: "fixture", model: "known-words" },
    sources: [
      { id: "speaker", path: "assets/speaker.mp4", intakeSourceId: "owned-speaker", rights: "owned" },
      { id: "screen", path: "assets/screen.mp4", intakeSourceId: "owned-screen", rights: "owned" },
    ],
    tokens: [
      { id: "s-one", sourceId: "speaker", startMs: 500, endMs: 900, text: "We", speakerId: "founder" },
      { id: "s-two", sourceId: "speaker", startMs: 920, endMs: 1400, text: "begin.", speakerId: "founder" },
      { id: "s-three", sourceId: "speaker", startMs: 2200, endMs: 2600, text: "We", speakerId: "founder" },
      { id: "s-four", sourceId: "speaker", startMs: 2620, endMs: 3100, text: "return.", speakerId: "founder" },
      { id: "v-one", sourceId: "screen", startMs: 1000, endMs: 1400, text: "Visual", speakerId: "screen-state" },
      { id: "v-two", sourceId: "screen", startMs: 1420, endMs: 1900, text: "proof.", speakerId: "screen-state" },
      { id: "v-last", sourceId: "screen", startMs: 3600, endMs: 4000, text: "End.", speakerId: "screen-state" },
    ],
  });
  const transcript = lockTranscript(draft, work);
  const edit = EditDecisionList.parse({
    editVersion: "0.1.0", title: "Evidence edit", transcriptDigest: transcriptDigest(transcript),
    output: { width: 640, height: 360, fps: 30, audioFadeMs: 30, audioTargetLufs: -14 },
    segments: [
      { id: "open", sourceId: "speaker", startWordId: "s-one", endWordId: "s-two", preRollMs: 30, postRollMs: 80, beat: "setup", quote: "We begin.", reason: "Opens with the first complete claim." },
      { id: "proof", sourceId: "screen", startWordId: "v-one", endWordId: "v-two", preRollMs: 30, postRollMs: 80, beat: "proof", quote: "Visual proof.", reason: "Shows the product state between claims." },
      { id: "return", sourceId: "speaker", startWordId: "s-three", endWordId: "s-four", preRollMs: 30, postRollMs: 80, beat: "return", quote: "We return.", reason: "Returns to the founder for resolution." },
      { id: "last-frame", sourceId: "screen", startWordId: "v-last", endWordId: "v-last", preRollMs: 30, postRollMs: 80, beat: "close", quote: "End.", reason: "Exercises evidence at the exact source endpoint." },
    ],
  });
  const request = {
    evidenceVersion: FOOTAGE_EVIDENCE_VERSION,
    transcriptDigest: transcriptDigest(transcript), editDigest: editDigest(edit),
    segmentIds: ["open", "proof", "last-frame"], reason: "Inspect source motion, the visual proof, and the endpoint select.",
    contextMs: 300, samplesPerSegment: 5, thumbnailWidth: 320,
    waveform: { width: 800, height: 120 }, includeAdjacentCuts: true,
  };

  const evidenceRoot = path.join(work, "evidence");
  const first = await generateFootageEvidence(transcript, edit, request, work, evidenceRoot);
  if (first.cached || first.manifest.segments.length !== 3 || first.manifest.cuts.length !== 3) throw new Error("requested evidence coverage drifted");
  if (!first.manifest.segments.find((item) => item.id === "open")?.hasAudio) throw new Error("audiovisual range lost its audio fact");
  if (first.manifest.segments.find((item) => item.id === "proof")?.hasAudio) throw new Error("silent range gained an audio fact");
  if (first.manifest.segments.find((item) => item.id === "last-frame").samples.at(-1).sourceTimeMs >= 4000) throw new Error("source-end sample was not clamped to a decodable frame");
  for (const segment of first.manifest.segments) {
    if (segment.samples.length !== 5 || new Set(segment.samples.map((item) => item.nearestWordId)).size === 0) throw new Error("filmstrip lost word addresses");
    for (const item of [segment.filmstrip, segment.waveform]) if (hash(path.join(first.directory, item.path)) !== item.sha256) throw new Error("segment artifact hash drifted");
  }
  if (!first.manifest.cuts.every((cut) => cut.metrics.rgbMae > 0 && cut.metrics.lumaDelta >= 0)) throw new Error("cut diagnostics are missing");
  if (first.manifest.cuts[0].metrics.leftRms === null || first.manifest.cuts[0].metrics.rightRms !== null) throw new Error("mixed audiovisual/silent cut RMS facts drifted");
  FootageEvidenceManifest.parse(first.manifest);

  const repeated = await generateFootageEvidence(transcript, edit, request, work, evidenceRoot);
  if (!repeated.cached || JSON.stringify(repeated.manifest) !== JSON.stringify(first.manifest)) throw new Error("content-addressed evidence was not reused exactly");

  const transcriptFile = path.join(work, "transcript.lock.json"), editFile = path.join(work, "edit.json");
  writeFileSync(transcriptFile, `${JSON.stringify(transcript, null, 2)}\n`);
  writeFileSync(editFile, `${JSON.stringify(edit, null, 2)}\n`);
  const cliOutput = command(process.execPath, [cli, "edit-evidence", transcriptFile, editFile, "--project", work, "-o", path.join(work, "cli-evidence"), "--segment", "open", "proof", "last-frame", "--context-ms", "300", "--samples", "5", "--thumbnail-width", "320", "--waveform-width", "800", "--waveform-height", "120", "--reason", request.reason]);
  const cliManifestPath = cliOutput.trim().split("\n").at(-1).trim();
  const cliManifest = FootageEvidenceManifest.parse(JSON.parse(readFileSync(cliManifestPath, "utf8")));
  if (JSON.stringify(cliManifest) !== JSON.stringify(first.manifest)) throw new Error("CLI evidence differs from library contract");

  const unknown = structuredClone(request); unknown.segmentIds = ["missing"];
  try { await generateFootageEvidence(transcript, edit, unknown, work, path.join(work, "unknown")); throw new Error("unknown segment was accepted"); }
  catch (error) { if (!String(error).includes("unknown segment")) throw error; }
  const stale = structuredClone(request); stale.editDigest = "f".repeat(64);
  try { await generateFootageEvidence(transcript, edit, stale, work, path.join(work, "stale")); throw new Error("stale edit digest was accepted"); }
  catch (error) { if (!String(error).includes("editDigest")) throw error; }

  const speakerFile = path.join(assets, "speaker.mp4"), originalSpeaker = readFileSync(speakerFile);
  writeFileSync(speakerFile, Buffer.concat([originalSpeaker, Buffer.from("changed")]));
  try { await generateFootageEvidence(transcript, edit, request, work, evidenceRoot); throw new Error("changed source was accepted through cache"); }
  catch (error) { if (!String(error).includes("changed after lock")) throw error; }
  writeFileSync(speakerFile, originalSpeaker);
  const manifestBytes = readFileSync(first.manifestPath);
  const changedManifest = JSON.parse(manifestBytes.toString("utf8"));
  changedManifest.cuts[0].metrics.rgbMae = 0;
  writeFileSync(first.manifestPath, `${JSON.stringify(changedManifest, null, 2)}\n`);
  try { await generateFootageEvidence(transcript, edit, request, work, evidenceRoot); throw new Error("changed cached manifest was accepted"); }
  catch (error) { if (!String(error).includes("manifest digest drifted")) throw error; }
  writeFileSync(first.manifestPath, manifestBytes);
  const corrupt = path.join(first.directory, first.manifest.segments[0].filmstrip.path);
  writeFileSync(corrupt, Buffer.concat([readFileSync(corrupt), Buffer.from("corrupt")]));
  try { await generateFootageEvidence(transcript, edit, request, work, evidenceRoot); throw new Error("changed cached artifact was accepted"); }
  catch (error) { if (!String(error).includes("artifact changed")) throw error; }

  const report = `# Requested-range footage evidence benchmark — 2026-07-18\n\n` +
    `- Inputs: one audiovisual moving source and one silent mismatched-geometry source.\n` +
    `- Request: 3/4 EDL segments, 5 word-addressed frames per segment, 300ms source context, including an exact source-end select.\n` +
    `- Evidence: audiovisual and explicit-silence waveforms plus all three adjacent four-frame cut strips; source-end sampling clamps to the last decodable frame.\n` +
    `- Diagnostics: normalized RGB/luma discontinuity and nullable pre/post-cut RMS; no aesthetic verdict inferred.\n` +
    `- Cache: repeated request reuses a byte/hash-verified content-addressed manifest.\n` +
    `- CLI/library manifests: identical.\n` +
    `- Unknown segment, stale edit digest, changed source bytes, changed cached manifest, and changed cached artifact: rejected.\n`;
  if (check) {
    const expected = readFileSync(path.join(here, "results.md"), "utf8");
    if (report !== expected) throw new Error(`footage-evidence benchmark report drifted\n${report}`);
  } else process.stdout.write(report);
  console.log("✔ requested-range footage evidence: bounded filmstrips, waveforms, adjacent cuts, neutral metrics, exact cache, five integrity defects rejected");
} finally {
  if (!keep) rmSync(work, { recursive: true, force: true });
}
