import fs from "node:fs";
import type { Browser } from "playwright";

/**
 * Resolves a Chromium-based browser executable without depending on Playwright's
 * own downloaded browser build (which requires network access to Playwright's CDN
 * and can be blocked/slow in sandboxed environments). Falls back to system Edge
 * on Windows, which ships with every Windows install and is Chromium-based.
 */
const KNOWN_EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

let cachedPath: string | null | undefined;

export function resolveBrowserExecutablePath(): string | null {
  if (cachedPath !== undefined) return cachedPath;

  const fromEnv = process.env.BROWSER_EXECUTABLE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) {
    cachedPath = fromEnv;
    return cachedPath;
  }

  for (const candidate of KNOWN_EDGE_PATHS) {
    if (fs.existsSync(/* turbopackIgnore: true */ candidate)) {
      cachedPath = candidate;
      return cachedPath;
    }
  }

  cachedPath = null;
  return cachedPath;
}

/**
 * Launches a Playwright Chromium browser, preferring the Playwright-managed
 * "msedge" channel (system Edge) so no separate browser download is required.
 * Throws if no usable browser can be found — callers should catch this and
 * mark the dependent module "unavailable" rather than crash the whole audit.
 */
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright");
  const executablePath = resolveBrowserExecutablePath();

  if (executablePath) {
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch {
      // fall through to channel-based launch
    }
  }

  try {
    return await chromium.launch({ channel: "msedge", headless: true });
  } catch (err) {
    return await chromium.launch({ headless: true });
  }
}
