import * as cheerio from "cheerio";
import crypto from "node:crypto";
import type { ImageRef, LinkRef, PageType } from "../types";

export interface ParsedPage {
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  wordCount: number;
  canonical: string | null;
  robotsMeta: string | null;
  hreflang: { lang: string; href: string }[];
  schemaTypes: string[];
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  images: ImageRef[];
  internalLinks: LinkRef[];
  externalLinks: LinkRef[];
  contentHash: string;
  looksLikeJsShell: boolean;
  iconUrl: string | null;
}

/** Strips script/style/nav/footer/header boilerplate and returns normalized
 * visible body text — shared by word-count/content-hash computation and by
 * the AI analysis module, which needs real page text to reason over. */
export function extractVisibleText(html: string, maxChars = 6000): string {
  const $body = cheerio.load(html);
  $body("script, style, noscript, nav, footer, header").remove();
  const text = $body("body").text().replace(/\s+/g, " ").trim();
  return Number.isFinite(maxChars) ? text.slice(0, maxChars) : text;
}

export function parseHtml(html: string, pageUrl: string): ParsedPage {
  const $ = cheerio.load(html);
  const origin = safeOrigin(pageUrl);

  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() || null;

  const h1 = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2 = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h3 = $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean);

  const hreflang = $('link[rel="alternate"][hreflang]')
    .map((_, el) => ({
      lang: $(el).attr("hreflang") || "",
      href: $(el).attr("href") || "",
    }))
    .get()
    .filter((h) => h.lang && h.href);

  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      collectSchemaTypes(json, schemaTypes);
    } catch {
      // malformed JSON-LD — ignored, but detectable separately as a technical issue
    }
  });
  $("[itemtype]").each((_, el) => {
    const itemtype = $(el).attr("itemtype");
    if (itemtype) {
      const parts = itemtype.split("/");
      schemaTypes.push(parts[parts.length - 1]);
    }
  });

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content");
    if (prop && content) ogTags[prop] = content;
  });

  const iconLinks = $('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]')
    .map((_, el) => ({
      rel: ($(el).attr("rel") || "").toLowerCase(),
      href: ($(el).attr("href") || "").trim(),
      sizes: ($(el).attr("sizes") || "").trim(),
    }))
    .get()
    .filter((i) => i.href);
  const iconUrl = pickBestIcon(iconLinks, ogTags["og:image"], pageUrl);

  const twitterTags: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr("name");
    const content = $(el).attr("content");
    if (name && content) twitterTags[name] = content;
  });

  const images: ImageRef[] = $("img")
    .map((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      const alt = $(el).attr("alt");
      return { src, alt: alt ?? null, hasAlt: !!alt && alt.trim().length > 0 };
    })
    .get()
    .filter((img) => img.src);

  const internalLinks: LinkRef[] = [];
  const externalLinks: LinkRef[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return;
    }
    let resolved: string;
    try {
      resolved = new URL(href, pageUrl).toString();
    } catch {
      return;
    }
    const anchorText = $(el).text().trim().slice(0, 200);
    const isInternal = origin ? safeOrigin(resolved) === origin : false;
    const ref: LinkRef = { href: resolved, anchorText, isInternal };
    if (isInternal) internalLinks.push(ref);
    else externalLinks.push(ref);
  });

  // Strip script/style/nav/footer boilerplate before computing word count & hash
  const bodyText = extractVisibleText(html, Infinity);
  const wordCount = bodyText.length === 0 ? 0 : bodyText.split(" ").filter(Boolean).length;

  const scriptTagCount = $("script").length;
  const looksLikeJsShell = wordCount < 60 && scriptTagCount > 3;

  const contentHash = crypto.createHash("sha1").update(bodyText.toLowerCase()).digest("hex");

  return {
    title,
    metaDescription,
    h1,
    h2,
    h3,
    wordCount,
    canonical,
    robotsMeta,
    hreflang,
    schemaTypes: Array.from(new Set(schemaTypes)),
    ogTags,
    twitterTags,
    images,
    internalLinks,
    externalLinks,
    contentHash,
    looksLikeJsShell,
    iconUrl,
  };
}

/** Prefers a proper apple-touch-icon (usually a clean square logo), then the
 * largest declared favicon size, then any favicon, then og:image as a last
 * resort. Returns null rather than guessing /favicon.ico — the caller tries
 * that as a real HTTP fetch, not something recorded as "the logo" unverified. */
function pickBestIcon(
  icons: { rel: string; href: string; sizes: string }[],
  ogImage: string | undefined,
  pageUrl: string
): string | null {
  const resolve = (href: string) => {
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      return null;
    }
  };

  const appleTouch = icons.find((i) => i.rel.includes("apple-touch-icon"));
  if (appleTouch) return resolve(appleTouch.href);

  const parseSize = (sizes: string) => {
    const match = sizes.match(/(\d+)x\d+/i);
    return match ? parseInt(match[1], 10) : 0;
  };
  const withSizes = [...icons].filter((i) => i.sizes && i.sizes.toLowerCase() !== "any").sort((a, b) => parseSize(b.sizes) - parseSize(a.sizes));
  if (withSizes[0]) return resolve(withSizes[0].href);

  if (icons[0]) return resolve(icons[0].href);
  if (ogImage) return resolve(ogImage);
  return null;
}

function collectSchemaTypes(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectSchemaTypes(n, out));
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj["@type"] === "string") out.push(obj["@type"]);
  else if (Array.isArray(obj["@type"])) out.push(...(obj["@type"] as string[]));
  if (Array.isArray(obj["@graph"])) collectSchemaTypes(obj["@graph"], out);
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const PAGE_TYPE_PATTERNS: [RegExp, PageType][] = [
  [/\/(course|courses|program|programs)(\/|$)/i, "course"],
  [/\/(product|products|shop|store)(\/|$)/i, "product"],
  [/\/(service|services)(\/|$)/i, "service"],
  [/\/(blog|articles|news|insights)(\/|$)/i, "blog"],
  [/\/(category|categories|collections)(\/|$)/i, "category"],
  [/\/(location|locations|branch|branches|store-locator)(\/|$)/i, "location"],
  [/\/(contact|contact-us)(\/?$)/i, "contact"],
  [/\/(about|about-us|who-we-are)(\/?$)/i, "about"],
];

export function classifyPageType(url: string, isHomepage: boolean, h1: string[]): PageType {
  if (isHomepage) return "homepage";
  const path = safePath(url);
  for (const [pattern, type] of PAGE_TYPE_PATTERNS) {
    if (pattern.test(path)) return type;
  }
  return "other";
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
