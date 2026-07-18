#!/usr/bin/env node
import { RevisionMemory, compileRevisionContext } from "../../core/dist/index.js";

const sha = (n) => n.toString(16).padStart(64, "0").slice(-64);
const make = (n, brandId, status = "accepted") => ({
  id: `revision-${n}`,
  scope: { kind: "brand", brandId },
  subject: { id: `film-${n}`, digest: sha(n + 1), register: "brand-film" },
  source: { reviewDigest: sha(n + 1001), findingId: `finding-${n}`, principleIds: [n % 2 ? "CR-MOT-3" : "CR-COMP-2"] },
  decision: { status, decidedBy: "human-reviewer", reason: "The human director explicitly decided this revision." },
  change: { artifact: "score", patchDigest: sha(n + 2001), summary: "Changed the authored timing and composition for the reviewed beat." },
  outcome: {
    assessment: status === "accepted" ? "improved" : "not-measured",
    evidence: status === "accepted" ? [{ kind: "human-review", digest: sha(n + 3001), note: "The rendered revision was watched and explicitly preferred." }] : [],
    note: status === "accepted" ? "The watched result improved the intended attention handoff." : "The proposal was rejected before implementation.",
  },
  guidance: {
    do: `Reuse accepted timing relation ${n} only when the same brand and principle apply.`,
    avoid: `Avoid rejected timing relation ${n} when the same brand and principle apply.`,
    tags: [n % 2 ? "rhythm" : "composition"],
  },
  createdAt: `2026-07-18T${String(n % 24).padStart(2, "0")}:00:00+05:30`,
});

const memory = RevisionMemory.parse({
  memoryVersion: "0.1.0",
  entries: Array.from({ length: 200 }, (_, index) => make(index + 1, index % 2 ? "brand-a" : "brand-b", index % 11 === 0 ? "rejected" : "accepted")),
});
const query = { brandId: "brand-a", register: "brand-film", principleIds: ["CR-MOT-3"], maxChars: 6000 };
const first = compileRevisionContext(memory, query);
const second = compileRevisionContext(memory, query);
const foreign = first.directives.filter((item) => item.scope.brandId !== "brand-a").length;
const serializedChars = JSON.stringify(first).length;
const checks = {
  deterministic: JSON.stringify(first) === JSON.stringify(second),
  brandLeaks: foreign,
  withinBudget: serializedChars <= query.maxChars,
  rejectedPreservedAsAvoid: first.directives.filter((item) => item.outcome === "not-measured").every((item) => item.effect === "avoid"),
};
if (!checks.deterministic || checks.brandLeaks || !checks.withinBudget || !checks.rejectedPreservedAsAvoid) process.exit(1);

const report = `# Accepted-revision memory benchmark\n\n` +
  `- Corpus: 200 typed revisions across two brands.\n` +
  `- Eligible exact-brand entries: ${first.eligible}.\n` +
  `- Selected under 6,000-character budget: ${first.selected}.\n` +
  `- Serialized complete-context characters: ${serializedChars}.\n` +
  `- Foreign-brand leaks: ${foreign}.\n` +
  `- Repeated compilation: byte-identical.\n` +
  `- Rejected proposals: retained only as avoid guidance.\n`;

if (process.argv.includes("--check")) {
  const { readFileSync } = await import("node:fs");
  const expected = readFileSync(new URL("./results.md", import.meta.url), "utf8");
  if (report !== expected) {
    console.error("revision-memory benchmark drifted\n\n" + report);
    process.exit(1);
  }
} else process.stdout.write(report);
