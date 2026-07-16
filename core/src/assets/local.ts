import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

/** Resolve a declared asset without allowing a symlink or path to escape the project. */
export function resolveProjectAsset(projectDir: string, relative: string): string {
  const root = realpathSync(path.resolve(projectDir));
  const candidate = path.resolve(root, relative);
  if (!existsSync(candidate)) throw new Error(`asset not found: ${relative} (resolved to ${candidate})`);
  const real = realpathSync(candidate);
  if (real !== root && !real.startsWith(root + path.sep)) throw new Error(`asset escapes project through a symlink: ${relative}`);
  if (!statSync(real).isFile()) throw new Error(`asset is not a file: ${relative}`);
  return real;
}
