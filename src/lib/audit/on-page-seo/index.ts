import type { CrawlResult, CrawledPage, ModuleResult } from "../types";
import { buildModuleResult, runPageRule, runSiteRule, type PageRuleDef, type RuleOutcome, type SiteRuleDef } from "../helpers";

const crawledOk = (p: CrawledPage) => p.statusCode !== null && !p.fetchError && p.isIndexable;

const pageRules: PageRuleDef[] = [
  {
    id: "h1-missing",
    title: "Missing H1",
    category: "on_page_seo",
    severity: "critical",
    confidence: "HIGH",
    description: "The page has no H1 heading.",
    whyItMatters: "The H1 is the clearest on-page signal of what the page is about, for both users and search engines.",
    recommendation: "Add a single, descriptive H1 that reflects the page's primary topic and target query.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      return { passed: p.h1.length > 0, evidence: p.h1.length > 0 ? `H1: "${p.h1[0]}"` : `${p.url} has no H1` };
    },
  },
  {
    id: "h1-multiple",
    title: "Multiple H1 Tags",
    category: "on_page_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "The page has more than one H1 heading.",
    whyItMatters: "Multiple H1s dilute the topical signal of the page and can confuse both users and search engines about the primary subject.",
    recommendation: "Keep exactly one H1 per page and demote additional top-level headings to H2.",
    test: (p) => {
      if (!crawledOk(p) || p.h1.length === 0) return null;
      return { passed: p.h1.length === 1, evidence: `Found ${p.h1.length} H1 tags: ${p.h1.slice(0, 3).join(" | ")}` };
    },
  },
  {
    id: "heading-hierarchy-skip",
    title: "Heading Hierarchy Skips Levels",
    category: "on_page_seo",
    severity: "info",
    confidence: "MEDIUM",
    description: "The page has H3 tags but no H2 tags, skipping a level in the heading hierarchy.",
    whyItMatters: "A clean heading hierarchy helps assistive technology and search engines parse page structure correctly.",
    recommendation: "Restructure headings so H3s are nested under an H2, keeping a logical H1 > H2 > H3 order.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      if (p.h3.length === 0) return null;
      return { passed: p.h2.length > 0, evidence: `${p.h3.length} H3 tags found with ${p.h2.length} H2 tags` };
    },
  },
  {
    id: "images-missing-alt",
    title: "Images Missing Alt Text",
    category: "on_page_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "One or more images on the page have no alt attribute.",
    whyItMatters: "Alt text is essential for accessibility and gives search engines (and AI image understanding) context about the image.",
    recommendation: "Add descriptive alt text to every meaningful image; use empty alt=\"\" for purely decorative images.",
    test: (p) => {
      if (!crawledOk(p) || p.images.length === 0) return null;
      const missing = p.images.filter((img) => !img.hasAlt);
      return {
        passed: missing.length === 0,
        evidence: missing.length === 0 ? `All ${p.images.length} images have alt text` : `${missing.length}/${p.images.length} images missing alt text`,
      };
    },
  },
  {
    id: "thin-content",
    title: "Thin Content",
    category: "on_page_seo",
    severity: "warning",
    confidence: "MEDIUM",
    description: "The page has very little body text (under 150 words).",
    whyItMatters: "Thin pages rarely have enough substance to rank for meaningful queries and can be seen as low-value by search engines.",
    recommendation: "Expand the page with substantive, unique content that fully answers the target query — aim for at least 300 words on informational pages.",
    test: (p) => {
      if (!crawledOk(p) || p.pageType === "other") return null;
      return { passed: p.wordCount >= 150, evidence: `${p.wordCount} words of body content` };
    },
  },
  {
    id: "internal-links-low",
    title: "Low Internal Link Count",
    category: "on_page_seo",
    severity: "info",
    confidence: "MEDIUM",
    description: "The page has very few internal links pointing to other pages on the site.",
    whyItMatters: "Internal links distribute ranking signal and help both users and search engines discover related content.",
    recommendation: "Add contextual internal links to related services, articles, or category pages.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      return { passed: p.internalLinks.length >= 3, evidence: `${p.internalLinks.length} internal links found` };
    },
  },
  {
    id: "generic-anchor-text",
    title: "Generic Anchor Text",
    category: "on_page_seo",
    severity: "info",
    confidence: "LOW",
    description: "The page uses generic anchor text like \"click here\" or \"read more\" for internal links.",
    whyItMatters: "Descriptive anchor text gives users and search engines more context about the linked page's topic.",
    recommendation: "Replace generic anchor text with descriptive phrases that reflect the destination page's topic.",
    test: (p) => {
      if (!crawledOk(p) || p.internalLinks.length === 0) return null;
      const generic = ["click here", "read more", "learn more", "here", "this page"];
      const genericLinks = p.internalLinks.filter((l) => generic.includes(l.anchorText.toLowerCase().trim()));
      return { passed: genericLinks.length === 0, evidence: genericLinks.length === 0 ? "No generic anchor text found" : `${genericLinks.length} generic-anchor links found` };
    },
  },
];

function buildDuplicateTitlesRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "duplicate-titles",
    title: "Duplicate Title Tags",
    category: "on_page_seo",
    severity: "warning",
    confidence: "HIGH",
    description: "Two or more pages share the exact same title tag.",
    whyItMatters: "Duplicate titles make it hard for search engines and users to distinguish between pages in search results.",
    recommendation: "Write a unique, descriptive title for every page.",
    test: () => {
      const byTitle = new Map<string, string[]>();
      for (const p of pages) {
        if (!p.title || !p.isIndexable) continue;
        const key = p.title.trim().toLowerCase();
        const list = byTitle.get(key) ?? [];
        list.push(p.url);
        byTitle.set(key, list);
      }
      const dupes = Array.from(byTitle.entries()).filter(([, urls]) => urls.length > 1);
      if (dupes.length === 0) return { passed: true, evidence: "No duplicate title tags found" };
      return { passed: false, evidence: `${dupes.length} duplicate title group(s). Example: "${dupes[0][0]}" used on ${dupes[0][1].length} pages` };
    },
  };
}

function buildDuplicateMetaRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "duplicate-meta-descriptions",
    title: "Duplicate Meta Descriptions",
    category: "on_page_seo",
    severity: "info",
    confidence: "HIGH",
    description: "Two or more pages share the exact same meta description.",
    whyItMatters: "Duplicate descriptions waste the opportunity to differentiate each page's snippet in search results.",
    recommendation: "Write a unique meta description for every page.",
    test: () => {
      const byMeta = new Map<string, string[]>();
      for (const p of pages) {
        if (!p.metaDescription || !p.isIndexable) continue;
        const key = p.metaDescription.trim().toLowerCase();
        const list = byMeta.get(key) ?? [];
        list.push(p.url);
        byMeta.set(key, list);
      }
      const dupes = Array.from(byMeta.entries()).filter(([, urls]) => urls.length > 1);
      if (dupes.length === 0) return { passed: true, evidence: "No duplicate meta descriptions found" };
      return { passed: false, evidence: `${dupes.length} duplicate meta description group(s) found` };
    },
  };
}

export function runOnPageSeo(crawl: CrawlResult): { result: ModuleResult; recommendations: Record<string, string> } {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return buildModuleResult("on_page_seo", [], "unavailable", crawl.errorMessage ?? "No pages were crawled");
  }

  const outcomes: RuleOutcome[] = [
    ...pageRules.map((rule) => runPageRule(rule, crawl.pages)),
    runSiteRule(buildDuplicateTitlesRule(crawl.pages)),
    runSiteRule(buildDuplicateMetaRule(crawl.pages)),
  ];

  return buildModuleResult("on_page_seo", outcomes);
}
