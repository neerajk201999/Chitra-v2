import { describe, expect, it } from "vitest";
import {
  EditDecisionList,
  LockedTranscript,
  packTranscript,
  resolveEdit,
  transcriptDigest,
  type LockedTranscriptT,
} from "../src/editing/index.js";

const sha = (char: string) => char.repeat(64);

function transcript(): LockedTranscriptT {
  return LockedTranscript.parse({
    transcriptVersion: "0.1.0",
    projectId: "launch-edit",
    language: "en",
    provider: { name: "fixture", model: "word-timer" },
    sources: [{
      id: "take-one", path: "assets/take-one.mp4", intakeSourceId: "owned-take",
      rights: "owned", sha256: sha("a"), bytes: 1024,
      media: { durationMs: 5000, hasAudio: true, width: 1280, height: 720, fps: 30 },
    }],
    tokens: [
      { id: "word-one", sourceId: "take-one", startMs: 500, endMs: 900, text: "We", speakerId: "speaker-one" },
      { id: "word-two", sourceId: "take-one", startMs: 920, endMs: 1300, text: "fixed", speakerId: "speaker-one" },
      { id: "word-three", sourceId: "take-one", startMs: 1320, endMs: 1700, text: "this.", speakerId: "speaker-one" },
      { id: "word-four", sourceId: "take-one", startMs: 2400, endMs: 2800, text: "Finally.", speakerId: "speaker-one" },
    ],
  });
}

function edit(value = transcript()) {
  return EditDecisionList.parse({
    editVersion: "0.1.0", title: "Launch edit", transcriptDigest: transcriptDigest(value),
    output: { width: 1280, height: 720, fps: 30, audioFadeMs: 30, audioTargetLufs: -14 },
    segments: [{
      id: "solution", sourceId: "take-one", startWordId: "word-one", endWordId: "word-three",
      preRollMs: 30, postRollMs: 80, beat: "solution", quote: "We fixed this.",
      reason: "This sentence states the complete product change.",
    }],
  });
}

describe("transcript-addressed footage editing (ADR-0034)", () => {
  it("packs phrase context deterministically while preserving word addresses", () => {
    const first = packTranscript(transcript());
    expect(first).toBe(packTranscript(transcript()));
    expect(first).toContain("[word-one..word-three 00:00.500-00:01.700]");
    expect(first).toContain("[word-four..word-four 00:02.400-00:02.800]");
    expect(first).toContain(`transcript-digest: ${transcriptDigest(transcript())}`);
  });

  it("resolves exact word boundaries, handles, quote, and duration", () => {
    expect(resolveEdit(transcript(), edit())).toEqual([expect.objectContaining({
      sourceId: "take-one", startMs: 470, endMs: 1780, durationMs: 1310,
      quote: "We fixed this.",
    })]);
  });

  it("refuses stale transcript digests and quote drift", () => {
    const stale = structuredClone(edit()); stale.transcriptDigest = sha("f");
    expect(() => resolveEdit(transcript(), stale)).toThrow(/transcriptDigest/);
    const drift = structuredClone(edit()); drift.segments[0].quote = "We sort of fixed this.";
    expect(() => resolveEdit(transcript(), drift)).toThrow(/quote drift/);
  });

  it("rejects overlapping tokens and context truncation", () => {
    const overlapping = structuredClone(transcript()); overlapping.tokens[1].startMs = 800;
    expect(LockedTranscript.safeParse(overlapping).success).toBe(false);
    expect(() => packTranscript(transcript(), { maxChars: 1000, sourceIds: ["missing"] })).toThrow(/unknown transcript source/);
  });
});
