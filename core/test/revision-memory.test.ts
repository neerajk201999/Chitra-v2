import { describe, expect, it } from "vitest";
import {
  RevisionMemory,
  compileRevisionContext,
  validateRevisionContextQuery,
  type RevisionMemoryT,
} from "../src/creative/memory.js";

const sha = (char: string) => char.repeat(64);

function entry(id: string, scope: object, status: "accepted" | "rejected" | "reverted" = "accepted") {
  return {
    id,
    scope,
    subject: { id: "film-one", digest: sha("a"), register: "brand-film" },
    source: { reviewDigest: sha("b"), findingId: "uniform-motion", principleIds: ["CR-MOT-3"] },
    decision: { status, decidedBy: "reviewer-one", reason: "The human director made an explicit decision." },
    change: { artifact: "score", patchDigest: sha("c"), summary: "Protected a still hold before the final reveal." },
    outcome: {
      assessment: status === "accepted" ? "improved" : "not-measured",
      evidence: status === "accepted" ? [{ kind: "human-review", digest: sha("d"), note: "The revised cut was watched and explicitly preferred." }] : [],
      note: status === "accepted" ? "The payoff gained weight without slowing comprehension." : "The proposed direction was rejected before implementation.",
    },
    guidance: {
      do: "Protect one still hold before this brand's final product reveal.",
      avoid: "Do not keep every beat moving through the final product reveal.",
      tags: ["payoff", "rest"],
    },
    createdAt: "2026-07-18T09:00:00+05:30",
  };
}

function fixture(): RevisionMemoryT {
  return RevisionMemory.parse({
    memoryVersion: "0.1.0",
    entries: [
      entry("project-hold", { kind: "project", projectId: "film-one" }),
      entry("brand-hold", { kind: "brand", brandId: "brand-one" }),
      entry("other-brand", { kind: "brand", brandId: "brand-two" }),
      entry("rejected-loop", { kind: "brand", brandId: "brand-one" }, "rejected"),
      entry("reverted-change", { kind: "project", projectId: "film-one" }, "reverted"),
    ],
  });
}

describe("accepted revision memory (ADR-0032)", () => {
  it("requires evidence for accepted changes and calibration for universal rules", () => {
    const missingEvidence = entry("missing-evidence", { kind: "brand", brandId: "brand-one" });
    missingEvidence.outcome.evidence = [];
    expect(RevisionMemory.safeParse({ memoryVersion: "0.1.0", entries: [missingEvidence] }).success).toBe(false);
    expect(RevisionMemory.safeParse({ memoryVersion: "0.1.0", entries: [entry("unsafe-universal", { kind: "universal" })] }).success).toBe(false);
    const promoted = { ...entry("promoted-rest", { kind: "universal" }), promotion: { studyDigest: sha("e"), caseCount: 20, minimumReviewersPerCase: 3 } };
    expect(RevisionMemory.safeParse({ memoryVersion: "0.1.0", entries: [promoted] }).success).toBe(true);
  });

  it("isolates project and brand memories and excludes reverted entries", () => {
    const context = compileRevisionContext(fixture(), { projectId: "film-one", brandId: "brand-one", register: "brand-film" });
    expect(context.directives.map((item) => item.id)).toEqual(["project-hold", "brand-hold", "rejected-loop"]);
    expect(context.directives.find((item) => item.id === "rejected-loop")?.effect).toBe("avoid");
    expect(context.directives.some((item) => item.id === "other-brand")).toBe(false);
    expect(context.directives.some((item) => item.id === "reverted-change")).toBe(false);
  });

  it("prioritizes matching principles and emits deterministic bounded context", () => {
    const memory = fixture();
    const query = { projectId: "film-one", brandId: "brand-one", register: "brand-film" as const, principleIds: ["CR-MOT-3" as const], maxChars: 512 };
    const first = compileRevisionContext(memory, query);
    const second = compileRevisionContext(memory, query);
    expect(first).toEqual(second);
    expect(JSON.stringify(first).length).toBeLessThanOrEqual(512);
    expect(first.omittedByBudget).toBeGreaterThan(0);
  });

  it("rejects typoed retrieval filters instead of silently returning no memory", () => {
    expect(validateRevisionContextQuery({ register: "brand-movie", principleIds: ["CR-MOTION-3"] }).ok).toBe(false);
  });

  it("requires evidence for any outcome represented as measured", () => {
    const rejectedMeasured = entry("rejected-measured", { kind: "brand", brandId: "brand-one" }, "rejected");
    rejectedMeasured.outcome.assessment = "worse";
    expect(RevisionMemory.safeParse({ memoryVersion: "0.1.0", entries: [rejectedMeasured] }).success).toBe(false);
  });
});
