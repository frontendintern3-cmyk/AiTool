import fs from "node:fs/promises";
import path from "node:path";
import type { CrawlResult, CrawledPage } from "../types";
import { launchBrowser } from "../../browser";

const MAX_EXTRA_PAGES = 2;

export interface ScreenshotResult {
  label: string;
  pageUrl: string;
  viewport: "desktop" | "mobile";
  path: string; // public/ relative URL
  width: number;
  height: number;
}

const VIEWPORTS: { name: "desktop" | "mobile"; width: number; height: number }[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function selectPages(pages: CrawledPage[]): CrawledPage[] {
  const eligible = pages.filter((p) => p.statusCode === 200 && p.isIndexable);
  const homepage = eligible.find((p) => p.pageType === "homepage");
  const rest = eligible.filter((p) => p !== homepage && ["service", "product", "contact", "about"].includes(p.pageType));
  return [...(homepage ? [homepage] : []), ...rest.slice(0, MAX_EXTRA_PAGES)];
}

function slugFor(url: string): string {
  try {
    const u = new URL(url);
    const slug = (u.pathname === "/" ? "homepage" : u.pathname.replace(/^\/|\/$/g, "").replace(/[^a-z0-9-]+/gi, "-")).toLowerCase();
    return slug || "homepage";
  } catch {
    return "page";
  }
}

/** Captures homepage (desktop + mobile) plus a couple of other key pages
 * (desktop only, to bound Playwright launch time) as real PNG screenshots
 * saved under public/screenshots/<auditId>/ — never a placeholder image. */
export async function runScreenshots(crawl: CrawlResult, auditId: string): Promise<{ screenshots: ScreenshotResult[]; errorMessage?: string }> {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return { screenshots: [], errorMessage: crawl.errorMessage ?? "No pages were crawled" };
  }

  const targets = selectPages(crawl.pages);
  if (targets.length === 0) {
    return { screenshots: [], errorMessage: "No indexable pages available to capture" };
  }

  const outDir = path.join(process.cwd(), "public", "screenshots", auditId);
  await fs.mkdir(outDir, { recursive: true });

  let browser: import("playwright").Browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    return { screenshots: [], errorMessage: "No browser available to capture screenshots." };
  }

  const results: ScreenshotResult[] = [];
  try {
    for (const [i, target] of targets.entries()) {
      const viewportsForThisPage = i === 0 ? VIEWPORTS : VIEWPORTS.slice(0, 1);
      for (const viewport of viewportsForThisPage) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        try {
          await page.goto(target.url, { waitUntil: "networkidle", timeout: 20000 });
          const filename = `${slugFor(target.url)}-${viewport.name}.png`;
          const filePath = path.join(outDir, filename);
          await page.screenshot({ path: filePath, fullPage: viewport.name === "mobile" ? false : false });
          results.push({
            label: `${target.pageType === "homepage" ? "Homepage" : target.pageType} — ${viewport.name === "desktop" ? "Desktop" : "Mobile"}`,
            pageUrl: target.url,
            viewport: viewport.name,
            path: `/screenshots/${auditId}/${filename}`,
            width: viewport.width,
            height: viewport.height,
          });
        } catch {
          // one page failing to screenshot shouldn't stop the others
        } finally {
          await context.close().catch(() => {});
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return { screenshots: results, errorMessage: results.length === 0 ? "All screenshot captures failed" : undefined };
}
