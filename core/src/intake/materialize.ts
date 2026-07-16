import { createHash } from "node:crypto";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { Intake, type IntakeSourceT, type IntakeT } from "./schema.js";

type Fingerprint = { sha256: string; bytes: number };

const hashText = (value: string): Fingerprint => ({
  sha256: createHash("sha256").update(value, "utf8").digest("hex"),
  bytes: Buffer.byteLength(value, "utf8"),
});

async function hashFile(file: string): Promise<Fingerprint> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return { sha256: hash.digest("hex"), bytes: statSync(file).size };
}

function projectFile(root: string, relative: string): string {
  const candidate = path.resolve(root, relative);
  if (!existsSync(candidate)) throw new Error(`Intake source not found: ${relative}`);
  const real = realpathSync(candidate);
  if (real !== root && !real.startsWith(root + path.sep))
    throw new Error(`Intake source escapes the project through a symlink: ${relative}`);
  if (!statSync(real).isFile()) throw new Error(`Intake source is not a file: ${relative}`);
  return real;
}

function verifyClaim(label: string, claimed: { sha256?: string; bytes?: number }, actual: Fingerprint) {
  if (claimed.sha256 && claimed.sha256 !== actual.sha256)
    throw new Error(`${label} sha256 mismatch: claimed ${claimed.sha256}, actual ${actual.sha256}`);
  if (claimed.bytes != null && claimed.bytes !== actual.bytes)
    throw new Error(`${label} byte count mismatch: claimed ${claimed.bytes}, actual ${actual.bytes}`);
}

async function lockSource(source: IntakeSourceT, root: string): Promise<IntakeSourceT> {
  let origin: IntakeSourceT["origin"];
  if (source.origin.type === "inline") {
    const actual = hashText(source.origin.content);
    verifyClaim(`source ${source.id}`, source.origin, actual);
    origin = { ...source.origin, ...actual };
  } else if (source.origin.type === "path") {
    const actual = await hashFile(projectFile(root, source.origin.path));
    verifyClaim(`source ${source.id}`, source.origin, actual);
    origin = { ...source.origin, ...actual };
  } else if (source.origin.capturedPath) {
    const actual = await hashFile(projectFile(root, source.origin.capturedPath));
    verifyClaim(`source ${source.id} capture`, source.origin, actual);
    origin = { ...source.origin, ...actual };
  } else {
    origin = source.origin;
  }

  const evidence = await Promise.all(source.evidence.map(async (item) => {
    const actual = await hashFile(projectFile(root, item.path));
    verifyClaim(`source ${source.id} evidence ${item.path}`, item, actual);
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
