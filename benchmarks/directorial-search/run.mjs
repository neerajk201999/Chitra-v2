#!/usr/bin/env node
import { readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BlindDirectionSelection, DirectorialProbeManifest, DirectorialSearchDraft,
  Intake, generateDirectorialProbes, lockDirectorialSearch, materializeIntake,
  makeDirectionSelectionReceipt,
} from "../../core/dist/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(here, ".work"), directionsDir = path.join(work, "directions"), probesDir = path.join(work, "probes");
const cli = path.join(here, "../../core/dist/cli/index.js");
const check = process.argv.includes("--check"), keep = process.argv.includes("--keep");
const command = (bin, args) => {
  const result = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.error || result.status !== 0) throw new Error(`${bin} failed: ${(result.stderr || result.stdout || result.error?.message || "").slice(-1600)}`);
  return result.stdout;
};
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const intake = Intake.parse({
  intakeVersion: "0.1.0", tier: "intake", projectId: "aether-search", title: "Aether direction search",
  objective: { primary: "Make real-time private-market intelligence feel immediate", audience: "investors and operators", singleMessage: "The market moves before databases update" },
  deliverable: { register: "brand-film", targetDurationMs: 12000, width: 960, height: 540 },
  sources: [{ id: "owner-brief", kind: "direction-prompt", roles: ["content", "constraint", "brand"], origin: { type: "inline", content: "Show live signals replacing static database research. Precise, uncommon, no dashboard montage." }, usage: "Defines the product promise, visual restraint, and anti-template boundary", rights: "owned" }],
  preferences: [{ id: "single-image", statement: "Prefer one memorable image over a list of features", polarity: "prefer", priority: "must", sourceIds: ["owner-brief"] }],
  brand: { name: "Aether", constraints: [{ id: "no-dashboard-grid", statement: "Do not default to a generic dashboard grid", priority: "must", sourceIds: ["owner-brief"] }] },
  constraints: { mustInclude: ["Real-time market signals"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: ["The central promise must read without audio"] },
  assumptions: [], openQuestions: [],
});

const concepts = {
  "signal-rift": {
    governingIdea: "The static market tears open and live signal passes through.", visualThesis: "One diagonal rupture separates stale order from living information.",
    mechanism: "A before-and-after transformation occurs inside one continuous frame.", hero: "A quiet typographic field is split by one luminous diagonal signal.", motion: "Pressure accumulates, the field ruptures once, and information flows through the opening.",
    tension: "Research looks complete while the market has already changed", resolution: "A live signal interrupts the frozen picture", requirement: "typography-layout",
  },
  "orbit-proof": {
    governingIdea: "Evidence orbits one company until the hidden pattern becomes undeniable.", visualThesis: "A single company nucleus gathers sparse evidence into an intelligible orbit.",
    mechanism: "Discovery accumulates from fragments into one legible causal system.", hero: "A restrained company nucleus holds the frame while evidence locks into orbit.", motion: "Signals arrive from unequal distances, settle into orbit, then align into one proof chain.",
    tension: "Individual updates feel disconnected and easy to miss", resolution: "The orbit reveals one connected market event", requirement: "typography-layout",
  },
  "living-index": {
    governingIdea: "The market index is not a list; it is a living constellation.", visualThesis: "A sparse constellation compresses into one precise live-market mark.",
    mechanism: "Scale creates awe first, then coordinated convergence creates comprehension.", hero: "A large ring of independent signals surrounds a small declarative promise.", motion: "Distributed points breathe independently before converging into a controlled living index.",
    tension: "Twenty million companies appear too vast to understand", resolution: "The constellation behaves as one addressable live system", requirement: "particles",
  },
};

function direction(id, concept) {
  return {
    directionVersion: "0.3.0", irVersion: "0.1.0", tier: "direction", id: `${id}-direction`, title: `Aether — ${id}`, register: "brand-film",
    logline: `Aether makes a changing private market visible through ${id}.`, narrativeArc: `${concept.tension}; the visual mechanism changes state; ${concept.resolution}.`, tone: ["precise", "alive"], audience: "investors and operators",
    deliverable: { targetDurationMs: 12000, width: 960, height: 540 },
    creativeConcept: { emotionalPromise: "Complexity becomes immediate and graspable", governingIdea: concept.governingIdea, tension: concept.tension, resolution: concept.resolution, visualThesis: concept.visualThesis, soundThesis: "One restrained pressure tone resolves into a clear signal pulse" },
    productionApproach: { requirements: [{ id: `${id}-hero`, description: `Render the ${id} hero system as one unmistakable still`, importance: "must", capabilityId: concept.requirement, support: "native", approach: "Use native typed elements in a bounded diagnostic Score", acceptanceTest: "The hero premise reads from one silent frame without explanatory layout" }] },
    trace: { intakeProjectId: "aether-search", objective: { primary: "Make real-time private-market intelligence feel immediate", audience: "investors and operators", singleMessage: "The market moves before databases update" }, constraints: { mustInclude: ["Real-time market signals"], mustAvoid: ["Generic feature-list slideshow"], legal: [], accessibility: ["The central promise must read without audio"] }, sourceIds: ["owner-brief"], preferenceIds: ["single-image"], brandConstraintIds: ["no-dashboard-grid"], assumptionIds: [] },
    scenes: [{ id: `${id}-beat`, narrativeRole: "hero proof of the governing idea", shotIntent: "The viewer understands that static research has become live", heroMoment: concept.hero, pacingWeight: 1.5, sourceIds: ["owner-brief"], preferenceIds: ["single-image"] }],
  };
}

const style = {
  name: "aether-probe", palette: { bg: "#08090c", surface: "#171922", primary: "#665cff", accent: "#ff4d6d", text: "#f7f5ef", textDim: "#a6a7b0", onMedia: "#ffffff" },
  fonts: { display: "Space Grotesk", text: "Inter", mono: "JetBrains Mono" }, displayWeight: 600, textWeight: 400, trackingDisplay: -0.025, grain: 0,
};
function score(id) {
  const scene = { id: `${id}-scene`, reason: `Test the ${id} governing image before any timeline is authored`, durationMs: 2000, background: "bg", elements: [], choreography: [], transitionOut: { type: "cut", duration: "standard" } };
  if (id === "signal-rift") scene.elements = [
    { type: "text", id: "rift-promise", role: "hero", textRole: "display", content: "THE MARKET\nMOVED.", color: "text", maxWidth: 52, align: "left", position: { anchor: "left", x: 12, y: 48 } },
    { type: "shape", id: "rift-line", role: "support", shape: "line", color: "accent", opacity: 1, position: { anchor: "center", x: 63, y: 50 }, width: 2, height: 76, radius: 1 },
    { type: "text", id: "rift-live", role: "support", textRole: "title", content: "NOW SEE IT LIVE", color: "accent", maxWidth: 28, align: "left", position: { anchor: "left", x: 70, y: 52 } },
  ];
  if (id === "orbit-proof") scene.elements = [
    { type: "shape", id: "orbit-core", role: "hero", shape: "circle", color: "primary", opacity: 1, position: { anchor: "center", x: 50, y: 50 }, width: 34, height: 60, radius: 50 },
    { type: "shape", id: "orbit-one", role: "ambient", shape: "circle", color: "accent", opacity: 0.8, position: { anchor: "center", x: 28, y: 31 }, width: 5, height: 9, radius: 50 },
    { type: "shape", id: "orbit-two", role: "ambient", shape: "circle", color: "accent", opacity: 0.55, position: { anchor: "center", x: 73, y: 68 }, width: 3, height: 5, radius: 50 },
    { type: "text", id: "orbit-copy", role: "support", textRole: "title", content: "ONE COMPANY.\nEVERY SIGNAL.", color: "text", maxWidth: 34, align: "center", position: { anchor: "center", x: 50, y: 50 } },
  ];
  if (id === "living-index") scene.elements = [
    { type: "particles", id: "index-ring", role: "hero", formation: "ring", color: "accent", count: 72, radius: 31, dotSize: 6, glow: 1.2, seed: 17, position: { anchor: "center", x: 50, y: 50 }, width: 72, height: 72 },
    { type: "text", id: "index-value", role: "support", textRole: "display", content: "20M+", color: "text", maxWidth: 30, align: "center", position: { anchor: "center", x: 50, y: 47 } },
    { type: "text", id: "index-copy", role: "support", textRole: "body", content: "PRIVATE COMPANIES. ALIVE.", color: "text-dim", maxWidth: 38, align: "center", position: { anchor: "center", x: 50, y: 62 } },
  ];
  return { irVersion: "0.1.0", tier: "score", meta: { title: `Aether ${id} probe`, register: "brand-film", width: 960, height: 540, fps: 30, seed: 17, safeZone: "16x9-standard" }, style, scenes: [scene] };
}

function searchDraft(candidateIds = Object.keys(concepts)) {
  const candidates = candidateIds.map((id) => ({ id, directionPath: `directions/${id}.json`, probeScorePath: `probes/${id}.json`, hypothesis: { narrativeMechanism: concepts[id].mechanism, heroComposition: concepts[id].hero, motionPremise: concepts[id].motion, tradeoff: `${id} commits to one strong visual law and gives up explanatory breadth.`, failureMode: `${id} fails if the single governing image reads as decoration rather than product meaning.` }, probes: [{ id: `${id}-hero-probe`, role: "hero", sceneId: `${id}-scene`, directionBeatId: `${id}-beat`, offsetMs: 900, question: "Does this image communicate live intelligence without a dashboard or voiceover?" }] }));
  const comparisons = [];
  for (let left = 0; left < candidateIds.length; left++) for (let right = left + 1; right < candidateIds.length; right++) comparisons.push({ leftCandidateId: candidateIds[left], rightCandidateId: candidateIds[right], ideaDifference: `${candidateIds[left]} and ${candidateIds[right]} make different causal claims about how intelligence becomes visible.`, storyDifference: `${candidateIds[left]} transforms one state while ${candidateIds[right]} builds understanding through another narrative mechanism.`, imageDifference: `${candidateIds[left]} uses ${concepts[candidateIds[left]].hero} By contrast, ${candidateIds[right]} uses ${concepts[candidateIds[right]].hero}`, whyBothSurvive: "Both remain brief-specific, producible, and different enough to deserve a watched probe." });
  return DirectorialSearchDraft.parse({ searchVersion: "0.1.0", id: "aether-directorial-search", intakeProjectId: "aether-search", register: "brand-film", decision: { question: "Which single image makes live private-market intelligence feel inevitable?", successDefinition: "A silent first watch yields one clear product-specific premise and desire to see the change unfold.", viewerMoment: "The viewer realizes that a static database cannot represent a market already moving." }, candidates, comparisons });
}

function makeSelection(manifest, winnerCandidateId) {
  const winner = manifest.candidates.find((candidate) => candidate.candidateId === winnerCandidateId);
  const ordered = [...manifest.candidates].sort((a, b) => (a.blindId === winner.blindId ? -1 : b.blindId === winner.blindId ? 1 : a.blindId.localeCompare(b.blindId)));
  return BlindDirectionSelection.parse({
    selectionVersion: "0.1.0", probeManifestDigest: manifest.manifestDigest,
    reviewer: { id: "blind-director", kind: "model", expertise: ["creative-direction", "visual-design", "motion-design"], model: "fixture-independent-reviewer", runId: "aether-blind-run" },
    blindness: { candidateIdentitySeenBeforeDecision: false, directionFilesSeenBeforeDecision: false, privateMappingSeenBeforeDecision: false },
    candidates: manifest.candidates.map((candidate) => ({ blindId: candidate.blindId, firstRead: "One governing image is visible before any explanatory reading begins.", intendedFeeling: "immediacy", achievedFeeling: candidate.blindId === winner.blindId ? "immediacy" : "curiosity", strongestQuality: "The frame commits to one dominant visual relationship rather than a feature grid.", concern: candidate.blindId === winner.blindId ? "The rupture must remain product-specific once motion begins." : "The frame needs a sharper causal connection to real-time intelligence.", scores: { governingIdeaLegibility: candidate.blindId === winner.blindId ? 5 : 3, emotionalCharge: candidate.blindId === winner.blindId ? 5 : 3, visualHierarchy: candidate.blindId === winner.blindId ? 5 : 4, brandSpecificity: candidate.blindId === winner.blindId ? 4 : 3, narrativePotential: candidate.blindId === winner.blindId ? 5 : 4, motionPotential: candidate.blindId === winner.blindId ? 5 : 4 }, confidence: "high", evidenceIds: candidate.probes.map((probe) => probe.id) })),
    ranking: ordered.map((candidate) => candidate.blindId), winner: winner.blindId,
    rationale: "The winning frame expresses change, tension, and a motion premise in one product-relevant image.", decisiveEvidenceIds: winner.probes.map((probe) => probe.id),
    rejected: ordered.slice(1).map((candidate) => ({ blindId: candidate.blindId, reason: "This candidate is visually controlled but its causal product premise is less immediate.", salvage: "Retain its spatial restraint as a supporting beat only after the winning Direction is approved." })),
    uncertainties: ["A still cannot prove that the selected motion premise will remain elegant over time."],
  });
}

rmSync(work, { recursive: true, force: true }); mkdirSync(directionsDir, { recursive: true }); mkdirSync(probesDir, { recursive: true });
try {
  const lockedIntake = await materializeIntake(intake, work);
  const intakeFile = path.join(work, "intake.json"), searchFile = path.join(work, "search.json"), lockedFile = path.join(work, "search.lock.json");
  writeJson(intakeFile, lockedIntake);
  for (const [id, concept] of Object.entries(concepts)) { writeJson(path.join(directionsDir, `${id}.json`), direction(id, concept)); writeJson(path.join(probesDir, `${id}.json`), score(id)); }
  const draft = searchDraft(); writeJson(searchFile, draft);
  const locked = lockDirectorialSearch(lockedIntake, draft, work); writeJson(lockedFile, locked);

  const cliLockFile = path.join(work, "search.cli.lock.json");
  command(process.execPath, [cli, "direction-search-lock", intakeFile, searchFile, "--project", work, "-o", cliLockFile]);
  if (JSON.stringify(JSON.parse(readFileSync(cliLockFile, "utf8"))) !== JSON.stringify(locked)) throw new Error("CLI search lock differs from library contract");

  const probes = await generateDirectorialProbes(lockedIntake, locked, work, path.join(work, "evidence"));
  if (probes.cached || probes.manifest.candidates.length !== 3 || probes.manifest.pairwise.length !== 3 || probes.manifest.nearDuplicatePairs.length) throw new Error("valid three-way probe coverage drifted");
  if (!probes.manifest.pairwise.every((comparison) => comparison.rgbMae > 0.01)) throw new Error("materially different fixture probes were marked near-identical");
  const packetText = readFileSync(path.join(probes.directory, probes.manifest.blindPacket.path), "utf8");
  for (const secret of ["signal-rift", "orbit-proof", "living-index", "directionPath", "directionBeatId", "sceneId", "probeScorePath"])
    if (packetText.includes(secret)) throw new Error(`blind reviewer packet leaks ${secret}`);
  const repeated = await generateDirectorialProbes(lockedIntake, locked, work, path.join(work, "evidence"));
  if (!repeated.cached || JSON.stringify(repeated.manifest) !== JSON.stringify(probes.manifest)) throw new Error("directorial probe cache did not reuse exact evidence");
  const cliProbeOutput = command(process.execPath, [cli, "direction-probes", intakeFile, lockedFile, "--project", work, "-o", path.join(work, "evidence")]);
  if (!cliProbeOutput.includes("reused")) throw new Error("CLI did not verify and reuse probe cache");

  const selection = makeSelection(probes.manifest, "signal-rift"), receipt = makeDirectionSelectionReceipt(probes.manifest, selection, probes.directory);
  if (receipt.selected.candidateId !== "signal-rift" || receipt.selected.directionPath !== "directions/signal-rift.json") throw new Error("blind winner resolved to the wrong Direction");
  const selectionFile = path.join(work, "selection.json"), receiptFile = path.join(work, "selection.receipt.json"); writeJson(selectionFile, selection);
  command(process.execPath, [cli, "direction-select", probes.manifestPath, selectionFile, "-o", receiptFile]);
  if (JSON.stringify(JSON.parse(readFileSync(receiptFile, "utf8"))) !== JSON.stringify(receipt)) throw new Error("CLI selection receipt differs from library contract");

  const riftDirectionFile = path.join(directionsDir, "signal-rift.json"), originalDirection = readFileSync(riftDirectionFile);
  const changedDirection = JSON.parse(originalDirection); changedDirection.title = "Changed after lock"; writeJson(riftDirectionFile, changedDirection);
  try { await generateDirectorialProbes(lockedIntake, locked, work, path.join(work, "changed")); throw new Error("changed Direction was accepted"); }
  catch (error) { if (!String(error).includes("Direction changed after search lock")) throw error; }
  writeFileSync(riftDirectionFile, originalDirection);

  const originalManifest = readFileSync(probes.manifestPath), changedManifest = JSON.parse(originalManifest); changedManifest.pairwise[0].rgbMae = 0;
  writeJson(probes.manifestPath, changedManifest);
  try { await generateDirectorialProbes(lockedIntake, locked, work, path.join(work, "evidence")); throw new Error("changed private manifest was accepted"); }
  catch (error) { if (!String(error).includes("manifest digest drifted")) throw error; }
  writeFileSync(probes.manifestPath, originalManifest);
  const contactFile = path.join(probes.directory, probes.manifest.contactSheet.path), originalContact = readFileSync(contactFile); writeFileSync(contactFile, Buffer.concat([originalContact, Buffer.from("changed")]));
  try { makeDirectionSelectionReceipt(probes.manifest, selection, probes.directory); throw new Error("selection receipt accepted changed evidence"); }
  catch (error) { if (!String(error).includes("artifact changed")) throw error; }
  try { await generateDirectorialProbes(lockedIntake, locked, work, path.join(work, "evidence")); throw new Error("changed contact sheet was accepted"); }
  catch (error) { if (!String(error).includes("artifact changed")) throw error; }
  writeFileSync(contactFile, originalContact);

  const duplicateConcept = { ...concepts["signal-rift"], governingIdea: "A second conceptual route uses absence to expose the live market.", visualThesis: "A centered void interrupts a dense field and becomes a live aperture.", mechanism: "Absence rather than rupture creates the causal turn.", hero: "A centered void holds attention while the surrounding field recedes.", motion: "The field withdraws from one exact aperture before a signal returns.", tension: "Data density conceals the event that matters", resolution: "One live aperture isolates the decisive change" };
  concepts["silent-aperture"] = duplicateConcept;
  writeJson(path.join(directionsDir, "silent-aperture.json"), direction("silent-aperture", duplicateConcept));
  writeJson(path.join(probesDir, "silent-aperture.json"), score("signal-rift"));
  const duplicateDraft = searchDraft(["signal-rift", "silent-aperture"]);
  duplicateDraft.candidates[1].probes[0].sceneId = "signal-rift-scene";
  const duplicateLocked = lockDirectorialSearch(lockedIntake, duplicateDraft, work);
  const duplicateProbes = await generateDirectorialProbes(lockedIntake, duplicateLocked, work, path.join(work, "duplicate-evidence"));
  if (duplicateProbes.manifest.nearDuplicatePairs.length !== 1) throw new Error("near-identical probe pair was not detected");
  const duplicateSelection = makeSelection(duplicateProbes.manifest, "signal-rift");
  try { makeDirectionSelectionReceipt(duplicateProbes.manifest, duplicateSelection, duplicateProbes.directory); throw new Error("near-identical search was selectable"); }
  catch (error) { if (!String(error).includes("near-duplicate")) throw error; }

  const report = `# Still-first directorial search benchmark — 2026-07-18\n\n` +
    `- One locked Intake; three materially distinct Directions and one comparable hero probe per candidate.\n` +
    `- Search lock: Intake conformance, capability/register/deliverable fit, probe addresses, static gates, normalized Direction/Score digests.\n` +
    `- Probe evidence: three identity-free labelled stills, blind contact sheet, private mapping, three pairwise visual-difference facts.\n` +
    `- Blind packet leaks no candidate, Direction, Score, scene, or beat identities.\n` +
    `- Complete selection re-hashes evidence, then resolves the blind winner to the exact locked Direction with loser reasons and uncertainty retained.\n` +
    `- Repeated evidence: exact content-addressed cache reuse; CLI/library lock, probe, and receipt contracts agree.\n` +
    `- Changed Direction, changed private manifest, and changed contact sheet: rejected.\n` +
    `- Separate two-candidate fixture with pixel-identical probes: detected and blocked from selection.\n`;
  if (check) {
    const expected = readFileSync(path.join(here, "results.md"), "utf8");
    if (report !== expected) throw new Error(`directorial-search benchmark report drifted\n${report}`);
  } else process.stdout.write(report);
  console.log("✔ still-first directorial search: three locked concepts, identity-free probes, blind receipt, exact cache, duplicate search blocked, three integrity defects rejected");
} finally {
  if (!keep) rmSync(work, { recursive: true, force: true });
}
