import { realpathSync } from "node:fs";
import path from "node:path";
import { hashFile, hashText, lockedProjectFile, verifyFingerprint } from "../assets/fingerprint.js";
import { Intake, type IntakeSourceT, type IntakeT } from "./schema.js";

async function lockSource(source: IntakeSourceT, root: string): Promise<IntakeSourceT> {
  let origin: IntakeSourceT["origin"];
  if (source.origin.type === "inline") {
    const actual = hashText(source.origin.content);
    verifyFingerprint(`source ${source.id}`, source.origin, actual);
    origin = { ...source.origin, ...actual };
  } else if (source.origin.type === "path") {
    const actual = await hashFile(lockedProjectFile(root, source.origin.path, "Intake source"));
    verifyFingerprint(`source ${source.id}`, source.origin, actual);
    origin = { ...source.origin, ...actual };
  } else if (source.origin.capturedPath) {
    const actual = await hashFile(lockedProjectFile(root, source.origin.capturedPath, "Intake source capture"));
    verifyFingerprint(`source ${source.id} capture`, source.origin, actual);
    origin = { ...source.origin, ...actual };
  } else {
    origin = source.origin;
  }

  const evidence = await Promise.all(source.evidence.map(async (item) => {
    const actual = await hashFile(lockedProjectFile(root, item.path, "Intake evidence"));
    verifyFingerprint(`source ${source.id} evidence ${item.path}`, item, actual);
    return { ...item, ...actual };
  }));
  return { ...source, origin, evidence };
}

/** Validate and fingerprint every project-local byte without acquiring remote content. */
export async function materializeIntake(data: unknown, projectDir: string): Promise<IntakeT> {
  const intake = Intake.parse(data);
  const root = realpathSync(path.resolve(projectDir));
  const sources = await Promise.all(intake.sources.map((source) => lockSource(source, root)));
  return Intake.parse({ ...intake, sources });
}
