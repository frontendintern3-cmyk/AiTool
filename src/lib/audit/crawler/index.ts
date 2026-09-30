import type { CrawlResult, CrawledPage } from "../types";
import { fetchRobotsTxt, isPathAllowed } from "./robots";
import { discoverSitemapUrls } from "./sitemap";
import { fetchPage, headCheck } from "./fetcher";
import { parseHtml, classifyPageType } from "./parse";
import { launchBrowser } from "../../browser";

export const DEFAULT_MAX_PAGES = 40;
const MAX_BROKEN_LINK_CHECKS = 60;
const IMPORTANT_PATH_HINTS = [
  "about",
  "contact",
  "service",
  "product",
  "course",
  "blog",
  "location",
  "pricing",
  "faq",
];

export interface CrawlOptions {
  maxPages?: number;
  onProgress?: (crawled: number, discovered: number) => void;
}

export async function crawlWebsite(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  let origin: string;
  try {
    origin = new URL(startUrl).origin;
  } catch {
    return {
      status: "unavailable",
      pages: [],
      pagesDiscovered: 0,
      robotsTxt: { found: false, content: null, disallowedPaths: [], agentGroups: {} },
      sitemapUrls: [],
      errorMessage: "Invalid URL",
    };
  }

  const robots = await fetchRobotsTxt(origin);
  const sitemapUrls = await discoverSitemapUrls(origin, robots.sitemaps);

  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl)];
  const discovered = new Set<string>(queue);

  // Prioritize sitemap URLs that look like important page types, then the rest.
  const prioritized = sitemapUrls
    .filter((u) => sameOrigin(u, origin))
    .sort((a, b) => score(b) - score(a));
  function score(u: string) {
    return IMPORTANT_PATH_HINTS.some((hint) => u.toLowerCase().includes(hint)) ? 1 : 0;
  }
  for (const u of prioritized) {
    if (!discovered.has(normalizeUrl(u))) {
      discovered.add(normalizeUrl(u));
      queue.push(normalizeUrl(u));
    }
  }

  const pages: CrawledPage[] = [];
  let browser: import("playwright").Browser | null = null;
  let browserFailed = false;

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      let pathname = "/";
      try {
        pathname = new URL(url).pathname;
      } catch {
        continue;
      }
      if (!isPathAllowed(pathname, robots)) continue;

      const fetched = await fetchPage(url);
      const isHomepage = pages.length === 0 && normalizeUrl(url) === normalizeUrl(startUrl);

      if (fetched.error || !fetched.statusCode) {
        pages.push(emptyPageResult(url, fetched, isHomepage));
        options.onProgress?.(pages.length, discovered.size);
        continue;
      }

      const isHtml = (fetched.contentType || "").includes("html") || fetched.body.startsWith("<");
      if (!isHtml || fetched.statusCode >= 400) {
        pages.push(emptyPageResult(url, fetched, isHomepage, fetched.statusCode >= 400 ? `HTTP ${fetched.statusCode}` : "Non-HTML content"));
        options.onProgress?.(pages.length, discovered.size);
        continue;
      }

      let html = fetched.body;
      let parsed = parseHtml(html, fetched.finalUrl);
      let renderedWithJs = false;

      if (parsed.looksLikeJsShell && !browserFailed) {
        try {
          browser ??= await launchBrowser();
          const rendered = await renderWithBrowser(browser, fetched.finalUrl);
          if (rendered) {
            html = rendered;
            parsed = parseHtml(html, fetched.finalUrl);
            renderedWithJs = true;
          }
        } catch {
          browserFailed = true;
        }
      }

      const pageType = classifyPageType(fetched.finalUrl, isHomepage, parsed.h1);
      const hasNoindex = /noindex/i.test(parsed.robotsMeta || "") || /noindex/i.test(fetched.headers["x-robots-tag"] || "");
      const isIndexable = fetched.statusCode === 200 && !hasNoindex;

      pages.push({
        url: fetched.finalUrl,
        pageType,
        statusCode: fetched.statusCode,
        title: parsed.title,
        metaDescription: parsed.metaDescription,
        h1: parsed.h1,
        h2: parsed.h2,
        h3: parsed.h3,
        wordCount: parsed.wordCount,
        canonical: parsed.canonical,
        robotsMeta: parsed.robotsMeta,
        hreflang: parsed.hreflang,
        schemaTypes: parsed.schemaTypes,
        ogTags: parsed.ogTags,
        twitterTags: parsed.twitterTags,
        images: parsed.images,
        internalLinks: parsed.internalLinks,
        externalLinks: parsed.externalLinks,
        brokenLinks: [],
        redirectChain: fetched.redirectChain,
        responseTimeMs: fetched.responseTimeMs,
        contentType: fetched.contentType,
        isIndexable,
        contentHash: parsed.contentHash,
        renderedWithJs,
        rawHtml: html,
        headers: fetched.headers,
        iconUrl: parsed.iconUrl,
      });

      options.onProgress?.(pages.length, discovered.size);

      for (const link of parsed.internalLinks) {
        const normalized = normalizeUrl(link.href);
        if (!discovered.has(normalized) && discovered.size < maxPages * 4) {
          discovered.add(normalized);
          queue.push(normalized);
        }
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  await checkBrokenLinks(pages, visited);

  return {
    status: pages.length > 0 ? "ok" : "unavailable",
    pages,
    pagesDiscovered: discovered.size,
    robotsTxt: {
      found: robots.found,
      content: robots.content,
      disallowedPaths: robots.disallowedPaths,
      agentGroups: robots.agentGroups,
    },
    sitemapUrls,
    errorMessage: pages.length === 0 ? "No pages could be crawled" : undefined,
  };
}

async function renderWithBrowser(browser: import("playwright").Browser, url: string): Promise<string | null> {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    return await page.content();
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

function emptyPageResult(
  url: string,
  fetched: Awaited<ReturnType<typeof fetchPage>>,
  isHomepage: boolean,
  reason?: string
): CrawledPage {
  return {
    url,
    pageType: isHomepage ? "homepage" : "other",
    statusCode: fetched.statusCode,
    title: null,
    metaDescription: null,
    h1: [],
    h2: [],
    h3: [],
    wordCount: 0,
    canonical: null,
    robotsMeta: null,
    hreflang: [],
    schemaTypes: [],
    ogTags: {},
    twitterTags: {},
    images: [],
    internalLinks: [],
    externalLinks: [],
    brokenLinks: [],
    redirectChain: fetched.redirectChain,
    responseTimeMs: fetched.responseTimeMs,
    contentType: fetched.contentType,
    isIndexable: false,
    contentHash: "",
    renderedWithJs: false,
    rawHtml: "",
    headers: fetched.headers,
    fetchError: fetched.error || reason,
    iconUrl: null,
  };
}

async function checkBrokenLinks(pages: CrawledPage[], visited: Set<string>): Promise<void> {
  const statusByUrl = new Map<string, number | null>();
  for (const p of pages) statusByUrl.set(normalizeUrl(p.url), p.statusCode);

  const uncheckedTargets = new Set<string>();
  for (const p of pages) {
    for (const link of p.internalLinks) {
      const normalized = normalizeUrl(link.href);
      if (!visited.has(normalized) && !statusByUrl.has(normalized)) uncheckedTargets.add(link.href);
    }
  }

  const targets = Array.from(uncheckedTargets).slice(0, MAX_BROKEN_LINK_CHECKS);
  const results = await Promise.all(targets.map(async (t) => [t, await headCheck(t)] as const));
  const brokenSet = new Set(results.filter(([, r]) => r.statusCode === null || r.statusCode >= 400).map(([t]) => t));

  for (const p of pages) {
    p.brokenLinks = p.internalLinks.filter((l) => brokenSet.has(l.href)).map((l) => l.href);
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return url;
  }
}

function sameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}
