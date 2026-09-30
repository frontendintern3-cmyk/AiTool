import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 8000;
const MAX_SITEMAP_URLS = 200;
const MAX_NESTED_SITEMAPS = 5;

async function fetchXml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Fetches sitemap(s) starting from known locations, following sitemap-index
 * nesting up to a bound, and returns a deduped, capped list of page URLs. */
export async function discoverSitemapUrls(origin: string, sitemapHints: string[]): Promise<string[]> {
  const candidates = sitemapHints.length > 0 ? sitemapHints : [new URL("/sitemap.xml", origin).toString()];
  const seen = new Set<string>();
  const urls = new Set<string>();
  let nestedProcessed = 0;

  const queue = [...candidates];

  while (queue.length > 0 && urls.size < MAX_SITEMAP_URLS) {
    const sitemapUrl = queue.shift()!;
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);

    const xml = await fetchXml(sitemapUrl);
    if (!xml) continue;

    const $ = cheerio.load(xml, { xmlMode: true });

    const sitemapIndexEntries = $("sitemapindex > sitemap > loc")
      .map((_, el) => $(el).text().trim())
      .get();

    if (sitemapIndexEntries.length > 0 && nestedProcessed < MAX_NESTED_SITEMAPS) {
      for (const nested of sitemapIndexEntries) {
        if (!seen.has(nested)) queue.push(nested);
      }
      nestedProcessed++;
      continue;
    }

    $("urlset > url > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) urls.add(loc);
    });
  }

  return Array.from(urls).slice(0, MAX_SITEMAP_URLS);
}
