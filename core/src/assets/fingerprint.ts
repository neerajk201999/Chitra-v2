import { createHash } from "node:crypto";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export type Fingerprint = { sha256: string; bytes: number };

export const hashText = (value: string): Fingerprint => ({
  sha256: createHash("sha256").update(value, "utf8").digest("hex"),
  bytes: Buffer.byteLength(value, "utf8"),
});

export async function hashFile(file: string): Promise<Fingerprint> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return { sha256: hash.digest("hex"), bytes: statSync(file).size };
}

export function lockedProjectFile(root: string, relative: string, label = "asset"): string {
  const candidate = path.resolve(root, relative);
  if (!existsSync(candidate)) throw new Error(`${label} not found: ${relative}`);
  const real = realpathSync(candidate);
  if (real !== root && !real.startsWith(root + path.sep))
    throw new Error(`${label} escapes the project through a symlink: ${relative}`);
  if (!statSync(real).isFile()) throw new Error(`${label} is not a file: ${relative}`);
  return real;
}

export function verifyFingerprint(label: string, claimed: { sha256?: string; bytes?: number }, actual: Fingerprint): void {
  if (claimed.sha256 && claimed.sha256 !== actual.sha256)
    throw new Error(`${label} sha256 mismatch: claimed ${claimed.sha256}, actual ${actual.sha256}`);
  if (claimed.bytes != null && claimed.bytes !== actual.bytes)
    throw new Error(`${label} byte count mismatch: claimed ${claimed.bytes}, actual ${actual.bytes}`);
}
