import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer-core";

const ENV_KEYS = ["CHITRA_BROWSER_PATH", "PUPPETEER_EXECUTABLE_PATH"] as const;

function commandPath(command: string): string | null {
  const lookup = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(lookup, [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.split(/\r?\n/).map((x) => x.trim()).find(Boolean) ?? null : null;
}

export function browserCandidates(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string[] {
  const explicit = ENV_KEYS.map((key) => env[key]).filter((value): value is string => !!value);
  if (platform === "darwin") {
    return [...explicit,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    ];
  }
  if (platform === "win32") {
    const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter((value): value is string => !!value);
    return [...explicit, ...roots.flatMap((root) => [
      path.join(root, "Google/Chrome/Application/chrome.exe"),
      path.join(root, "Chromium/Application/chrome.exe"),
      path.join(root, "Microsoft/Edge/Application/msedge.exe"),
    ])];
  }
  return [...explicit,
    ...["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "microsoft-edge-stable"]
      .map(commandPath)
      .filter((value): value is string => !!value),
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
}

export function resolveBrowserExecutable(env: NodeJS.ProcessEnv = process.env): string {
  for (const candidate of [...new Set(browserCandidates(env))]) {
    if (existsSync(candidate)) return candidate;
  }
  const explicit = ENV_KEYS.find((key) => env[key]);
  if (explicit) throw new Error(`${explicit} points to a missing browser: ${env[explicit]}`);
  throw new Error(
    "No supported Chrome, Chromium, or Edge executable found. Install a Chromium-family browser " +
    "or set CHITRA_BROWSER_PATH=/absolute/path/to/browser. Chitra does not download a 500MB browser during npm install."
  );
}

export async function launchBrowser(options: Omit<LaunchOptions, "executablePath"> = {}): Promise<Browser> {
  return puppeteer.launch({ ...options, executablePath: resolveBrowserExecutable() });
}

