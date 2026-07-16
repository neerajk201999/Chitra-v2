import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { materializeIntake } from "../src/intake/materialize.js";
import { validateIntake } from "../src/intake/schema.js";

const base = () => ({
  intakeVersion: "0.1.0",
  tier: "intake",
  projectId: "launch-film",
  title: "Launch film",
  objective: {
    primary: "Create a precise product launch film",
    audience: "product leaders",
    singleMessage: "Complex work becomes clear",
  },
  deliverable: { register: "brand-film", targetDurationMs: 20000, width: 1920, height: 1080 },
  sources: [{
    id: "user-direction",
    kind: "direction-prompt",
    roles: ["content", "constraint"],
    origin: { type: "inline", content: "Quiet, exact, and never playful." },
    usage: "Defines the primary creative direction",
    rights: "owned",
  }],
  preferences: [{
    id: "quiet-motion",
    statement: "Prefer restrained camera motion",
    polarity: "prefer",
    priority: "must",
    sourceIds: ["user-direction"],
  }],
});

describe("multimodal Intake IR (ADR-0017)", () => {
  it("accepts prompt-only intake and applies stable defaults", () => {
    const result = validateIntake(base());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intake.sources[0].evidence).toEqual([]);
    expect(result.intake.constraints.mustAvoid).toEqual([]);
    expect(result.intake.assumptions).toEqual([]);
  });

  it("rejects duplicate IDs, unknown provenance links, and non-portable paths", () => {
    const duplicate = base();
    duplicate.sources.push({ ...structuredClone(duplicate.sources[0]) });
    expect(validateIntake(duplicate).ok).toBe(false);

    const unknown = base();
    unknown.preferences[0].sourceIds = ["missing-source"];
    expect(validateIntake(unknown).ok).toBe(false);

    const traversal = base();
    traversal.sources[0].origin = { type: "path", path: "../secret.mov" } as never;
    expect(validateIntake(traversal).ok).toBe(false);
  });

  it("locks inline, local, captured URL, and evidence bytes deterministically", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "chitra-intake-"));
    mkdirSync(path.join(root, "assets"));
    mkdirSync(path.join(root, "evidence"));
    writeFileSync(path.join(root, "assets", "reference.mp4"), "reference-bytes");
    writeFileSync(path.join(root, "assets", "site.png"), "site-capture");
    writeFileSync(path.join(root, "evidence", "style-dna.json"), "{}\n");
    const input = base();
    input.sources.push({
      id: "reference-film", kind: "reference-video", roles: ["motion", "structure"],
      origin: { type: "path", path: "assets/reference.mp4" },
      usage: "Informs pacing without copying content", rights: "reference-only",
      evidence: [{ kind: "style-dna", path: "evidence/style-dna.json" }],
    } as never);
    input.sources.push({
      id: "product-site", kind: "webpage", roles: ["content", "brand"],
      origin: { type: "url", url: "https://example.com", capturedPath: "assets/site.png" },
      usage: "Supplies current product and brand evidence", rights: "owned",
    } as never);

    const first = await materializeIntake(input, root);
    const second = await materializeIntake(input, root);
    expect(second).toEqual(first);
    for (const source of first.sources) {
      expect(source.origin.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(source.origin.bytes).toBeGreaterThan(0);
    }
    expect(first.sources[1].evidence[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails loudly when claimed bytes change or a symlink escapes the project", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "chitra-intake-root-"));
    const outside = path.join(mkdtempSync(path.join(os.tmpdir(), "chitra-intake-outside-")), "outside.mov");
    writeFileSync(outside, "outside");
    symlinkSync(outside, path.join(root, "linked.mov"));
    const escaped = base();
    escaped.sources[0].origin = { type: "path", path: "linked.mov" } as never;
    await expect(materializeIntake(escaped, root)).rejects.toThrow(/escapes the project/);

    writeFileSync(path.join(root, "source.mov"), "actual");
    const stale = base();
    stale.sources[0].origin = { type: "path", path: "source.mov", sha256: "0".repeat(64) } as never;
    await expect(materializeIntake(stale, root)).rejects.toThrow(/sha256 mismatch/);
  });
});
