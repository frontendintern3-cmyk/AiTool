import type { CrawlResult, CrawledPage, ModuleResult } from "../types";
import { buildModuleResult, runPageRule, runSiteRule, type PageRuleDef, type RuleOutcome, type SiteRuleDef } from "../helpers";

const crawledOk = (p: CrawledPage) => p.statusCode !== null && !p.fetchError;

const pageRules: PageRuleDef[] = [
  {
    id: "title-missing",
    title: "Missing Title Tag",
    category: "technical_seo",
    severity: "critical",
    confidence: "HIGH",
    description: "Pages without a <title> tag lose control over how they appear in search results and browser tabs.",
    whyItMatters: "Search engines rely heavily on the title tag as the primary signal for what a page is about and as the clickable headline in results.",
    recommendation: "Add a unique, descriptive <title> (50-60 characters) to every page that reflects its primary search intent.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      const title = p.title?.trim() ?? "";
      return { passed: title.length > 0, evidence: title.length > 0 ? `Title: "${title}"` : `${p.url} has no <title> tag` };
    },
  },
  {
    id: "title-length",
    title: "Title Tag Length Not Optimal",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "Title tags outside the ~30-60 character range are often truncated or under-optimized in search results.",
    whyItMatters: "Titles that are too long get cut off in the SERP snippet; titles that are too short waste an opportunity to include relevant keywords.",
    recommendation: "Rewrite the title to fall between 30 and 60 characters while keeping it unique and descriptive.",
    test: (p) => {
      if (!crawledOk(p) || !p.title) return null;
      const len = p.title.trim().length;
      const passed = len >= 30 && len <= 60;
      return { passed, evidence: `Title is ${len} characters: "${p.title}"` };
    },
  },
  {
    id: "meta-description-missing",
    title: "Missing Meta Description",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "Pages without a meta description let search engines auto-generate the result snippet.",
    whyItMatters: "A written meta description gives you control over the search-result snippet and can materially affect click-through rate.",
    recommendation: "Write a unique meta description (120-160 characters) summarizing the page and including the primary keyword.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      const meta = p.metaDescription?.trim() ?? "";
      return { passed: meta.length > 0, evidence: meta.length > 0 ? `Meta description present (${meta.length} chars)` : `${p.url} has no meta description` };
    },
  },
  {
    id: "meta-description-length",
    title: "Meta Description Length Not Optimal",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "Meta descriptions outside ~120-160 characters are often truncated or too thin to be useful in search results.",
    whyItMatters: "Search engines truncate long descriptions and may ignore very short ones in favor of auto-generated snippets.",
    recommendation: "Rewrite the meta description to fall between 120 and 160 characters.",
    test: (p) => {
      if (!crawledOk(p) || !p.metaDescription) return null;
      const len = p.metaDescription.trim().length;
      const passed = len >= 70 && len <= 160;
      return { passed, evidence: `Meta description is ${len} characters` };
    },
  },
  {
    id: "canonical-missing",
    title: "Missing Canonical Tag",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "Pages without a canonical tag leave search engines to guess which URL variant is authoritative.",
    whyItMatters: "Without a canonical, duplicate URL parameters or tracking variants can split ranking signals across multiple URLs.",
    recommendation: "Add a self-referencing <link rel=\"canonical\"> tag to every indexable page.",
    test: (p) => {
      if (!crawledOk(p) || !p.isIndexable) return null;
      return { passed: !!p.canonical, evidence: p.canonical ? `Canonical: ${p.canonical}` : `${p.url} has no canonical tag` };
    },
  },
  {
    id: "https-enforced",
    title: "Page Not Served Over HTTPS",
    category: "technical_seo",
    severity: "critical",
    confidence: "HIGH",
    description: "Pages served over plain HTTP are flagged as \"Not secure\" by browsers and are disadvantaged in ranking.",
    whyItMatters: "HTTPS is a confirmed, if lightweight, ranking signal, and browsers actively warn users off non-HTTPS pages.",
    recommendation: "Serve every page over HTTPS and redirect all HTTP requests to their HTTPS equivalent.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      const isHttps = p.url.startsWith("https://");
      return { passed: isHttps, evidence: isHttps ? "Served over HTTPS" : `${p.url} is served over plain HTTP` };
    },
  },
  {
    id: "broken-status-code",
    title: "Broken Page (4xx/5xx)",
    category: "technical_seo",
    severity: "critical",
    confidence: "HIGH",
    description: "Crawled URLs returning a 4xx or 5xx status code are broken for both users and search engines.",
    whyItMatters: "Broken pages waste crawl budget, create dead ends for users, and (if internally linked) pass no value.",
    recommendation: "Fix the underlying error, restore the page, or 301-redirect the URL to a relevant live page.",
    test: (p) => {
      if (p.statusCode === null) return { passed: false, evidence: `${p.url} failed to load: ${p.fetchError ?? "unknown error"}` };
      const passed = p.statusCode < 400;
      return { passed, evidence: `${p.url} returned HTTP ${p.statusCode}` };
    },
  },
  {
    id: "redirect-chain",
    title: "Multi-Hop Redirect Chain",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "Some internal links resolve through more than one redirect hop before reaching their final destination.",
    whyItMatters: "Each redirect hop adds latency and dilutes a small amount of link equity; search engines may also give up following very long chains.",
    recommendation: "Update internal links to point directly at the final URL and collapse redirect chains to a single hop.",
    test: (p) => {
      if (!crawledOk(p) || p.redirectChain.length === 0) return null;
      const passed = p.redirectChain.length <= 1;
      return { passed, evidence: `${p.redirectChain.length}-hop redirect chain ending at ${p.url}` };
    },
  },
  {
    id: "broken-internal-links",
    title: "Broken Internal Links",
    category: "technical_seo",
    severity: "warning",
    confidence: "MEDIUM",
    description: "Pages link internally to URLs that returned an error or could not be reached.",
    whyItMatters: "Broken internal links hurt user experience and waste crawl budget on dead ends.",
    recommendation: "Update or remove links pointing to broken internal URLs, or restore the missing pages.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      const passed = p.brokenLinks.length === 0;
      return { passed, evidence: passed ? "No broken internal links detected" : `Links to: ${p.brokenLinks.slice(0, 3).join(", ")}` };
    },
  },
  {
    id: "schema-missing",
    title: "No Structured Data Detected",
    category: "technical_seo",
    severity: "warning",
    confidence: "MEDIUM",
    description: "The page has no detectable JSON-LD or microdata structured markup.",
    whyItMatters: "Structured data helps search engines (and AI answer engines) understand entities on the page and can unlock rich results.",
    recommendation: "Add relevant schema.org JSON-LD (e.g. Organization, WebPage, BreadcrumbList, and page-type-specific schema) to the page.",
    test: (p) => {
      if (!crawledOk(p) || !p.isIndexable) return null;
      return { passed: p.schemaTypes.length > 0, evidence: p.schemaTypes.length > 0 ? `Detected: ${p.schemaTypes.join(", ")}` : `${p.url} has no structured data` };
    },
  },
  {
    id: "og-tags-missing",
    title: "Missing Open Graph Tags",
    category: "technical_seo",
    severity: "info",
    confidence: "HIGH",
    description: "The page has no Open Graph meta tags.",
    whyItMatters: "Open Graph tags control how the page appears when shared on social platforms; missing tags mean an unpredictable auto-generated preview.",
    recommendation: "Add og:title, og:description, og:image, and og:url meta tags.",
    test: (p) => {
      if (!crawledOk(p) || !p.isIndexable) return null;
      const hasCore = !!p.ogTags["og:title"] && !!p.ogTags["og:description"];
      return { passed: hasCore, evidence: hasCore ? "Core Open Graph tags present" : `${p.url} is missing og:title/og:description` };
    },
  },
];

function buildDuplicateContentRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "duplicate-content",
    title: "Duplicate Content Across Pages",
    category: "technical_seo",
    severity: "warning",
    confidence: "MEDIUM",
    description: "Two or more crawled pages have near-identical extracted body content.",
    whyItMatters: "Duplicate content splits ranking signals between URLs and can cause search engines to pick the wrong page to rank.",
    recommendation: "Consolidate duplicate pages, add canonical tags pointing to the preferred version, or differentiate the content.",
    test: () => {
      const byHash = new Map<string, string[]>();
      for (const p of pages) {
        if (!p.contentHash || p.wordCount < 30) continue;
        const list = byHash.get(p.contentHash) ?? [];
        list.push(p.url);
        byHash.set(p.contentHash, list);
      }
      const duplicateGroups = Array.from(byHash.values()).filter((g) => g.length > 1);
      if (duplicateGroups.length === 0) return { passed: true, evidence: "No duplicate content detected across crawled pages" };
      const example = duplicateGroups[0];
      return {
        passed: false,
        evidence: `${duplicateGroups.length} group(s) of duplicate pages found. Example: ${example.join(" ≈ ")}`,
      };
    },
  };
}

function buildOrphanPagesRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "orphan-pages",
    title: "Orphan Pages (No Internal Links In)",
    category: "technical_seo",
    severity: "warning",
    confidence: "MEDIUM",
    description: "Pages that were discovered (e.g. via sitemap) but receive no internal links from any other crawled page.",
    whyItMatters: "Orphan pages are hard for both users and search engines to discover through normal navigation, and tend to rank poorly.",
    recommendation: "Add internal links to orphan pages from relevant navigation, category, or content pages.",
    test: () => {
      const linkedTargets = new Set<string>();
      for (const p of pages) {
        for (const link of p.internalLinks) {
          try {
            linkedTargets.add(new URL(link.href).toString().replace(/\/$/, ""));
          } catch {
            // ignore
          }
        }
      }
      const orphans = pages.filter((p) => p.pageType !== "homepage" && !linkedTargets.has(p.url.replace(/\/$/, "")));
      if (orphans.length === 0) return { passed: true, evidence: "No orphan pages detected among crawled pages" };
      return {
        passed: false,
        evidence: `${orphans.length} page(s) with no internal links found: ${orphans.slice(0, 3).map((p) => p.url).join(", ")}`,
        confidence: "LOW",
      };
    },
  };
}

function buildRobotsTxtRule(crawl: CrawlResult): SiteRuleDef {
  return {
    id: "robots-txt-missing",
    title: "robots.txt Not Found",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "No robots.txt file was found at the site root.",
    whyItMatters: "robots.txt is the standard place to give crawlers guidance on which sections of the site to avoid, and to point them to the sitemap.",
    recommendation: "Add a robots.txt file at the domain root with sensible crawl rules and a Sitemap: directive.",
    test: () => ({
      passed: crawl.robotsTxt.found,
      evidence: crawl.robotsTxt.found ? "robots.txt found" : "No robots.txt found at /robots.txt",
    }),
  };
}

function buildSitemapRule(crawl: CrawlResult): SiteRuleDef {
  return {
    id: "sitemap-missing",
    title: "XML Sitemap Not Found",
    category: "technical_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "No XML sitemap could be discovered via robots.txt or the default /sitemap.xml location.",
    whyItMatters: "A sitemap helps search engines discover and prioritize pages, especially on larger or less well-linked sites.",
    recommendation: "Generate an XML sitemap listing all indexable pages and reference it in robots.txt.",
    test: () => ({
      passed: crawl.sitemapUrls.length > 0,
      evidence: crawl.sitemapUrls.length > 0 ? `${crawl.sitemapUrls.length} URLs found in sitemap(s)` : "No sitemap.xml discovered",
    }),
  };
}

export function runTechnicalSeo(crawl: CrawlResult): { result: ModuleResult; recommendations: Record<string, string> } {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return buildModuleResult("technical_seo", [], "unavailable", crawl.errorMessage ?? "No pages were crawled");
  }

  const outcomes: RuleOutcome[] = [
    ...pageRules.map((rule) => runPageRule(rule, crawl.pages)),
    runSiteRule(buildDuplicateContentRule(crawl.pages)),
    runSiteRule(buildOrphanPagesRule(crawl.pages)),
    runSiteRule(buildRobotsTxtRule(crawl)),
    runSiteRule(buildSitemapRule(crawl)),
  ];

  return buildModuleResult("technical_seo", outcomes);
}
