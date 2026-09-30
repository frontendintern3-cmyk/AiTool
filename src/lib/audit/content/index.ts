import type { CrawlResult, CrawledPage, Industry, ModuleResult } from "../types";
import { buildModuleResult, runPageRule, runSiteRule, type PageRuleDef, type RuleOutcome, type SiteRuleDef } from "../helpers";
import { getIndustryRules } from "../industry-rules";

const crawledOk = (p: CrawledPage) => p.statusCode !== null && !p.fetchError && p.isIndexable;

const pageRules: PageRuleDef[] = [
  {
    id: "blog-missing-author",
    title: "Blog Post Missing Author/Byline Signal",
    category: "content",
    severity: "info",
    confidence: "LOW",
    description: "No author byline pattern was detected on this blog/article page.",
    whyItMatters: "Author attribution is a basic E-E-A-T (Experience, Expertise, Authoritativeness, Trust) signal, especially for advice-oriented content.",
    recommendation: "Add a visible author byline (and ideally an author bio/page) to blog and article content.",
    test: (p) => {
      if (!crawledOk(p) || p.pageType !== "blog") return null;
      const hasAuthorSignal = p.schemaTypes.some((t) => /person|author/i.test(t)) || /\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(p.rawHtml || "");
      return { passed: hasAuthorSignal, evidence: hasAuthorSignal ? "Author signal detected" : `${p.url} has no detectable author byline` };
    },
  },
  {
    id: "blog-missing-freshness",
    title: "Blog Post Missing Published/Updated Date",
    category: "content",
    severity: "info",
    confidence: "LOW",
    description: "No published or modified date signal was detected on this blog/article page.",
    whyItMatters: "Visible freshness signals help both users and search engines judge how current the information is.",
    recommendation: "Add a visible published/updated date, and datePublished/dateModified in Article schema.",
    test: (p) => {
      if (!crawledOk(p) || p.pageType !== "blog") return null;
      const hasDateSignal = /datepublished|datemodified/i.test(p.rawHtml || "") || /<time[\s>]/i.test(p.rawHtml || "");
      return { passed: hasDateSignal, evidence: hasDateSignal ? "Date signal detected" : `${p.url} has no detectable date signal` };
    },
  },
];

function buildPageTypeCoverageRule(pages: CrawledPage[], industry: Industry): SiteRuleDef[] {
  const rules = getIndustryRules(industry);
  return rules.expectedPageTypes.map((expected) => ({
    id: `content-coverage-${expected.type}`,
    title: `No ${expected.label} Detected`,
    category: "content" as const,
    severity: "warning" as const,
    confidence: "MEDIUM" as const,
    description: `No crawled page was classified as "${expected.label}", which is typically expected for ${industry} sites.`,
    whyItMatters: rules.rationale,
    recommendation: `Add a clearly identifiable ${expected.label.toLowerCase()} and link it from primary navigation.`,
    test: () => {
      const found = pages.some((p) => p.pageType === expected.type);
      return {
        passed: found,
        evidence: found
          ? `${expected.label} found among crawled pages`
          : `No page matching "${expected.label}" pattern was found in ${pages.length} crawled pages (industry: ${industry})`,
        confidence: "LOW" as const,
      };
    },
  }));
}

function buildSchemaCoverageRule(pages: CrawledPage[], industry: Industry): SiteRuleDef {
  const rules = getIndustryRules(industry);
  return {
    id: "content-industry-schema-coverage",
    title: `Missing Industry-Relevant Structured Data`,
    category: "content",
    severity: "info",
    confidence: "LOW",
    description: `None of the expected schema types for ${industry} (${rules.expectedSchemaTypes.join(", ")}) were detected anywhere on the site.`,
    whyItMatters: rules.rationale,
    recommendation: `Add ${rules.expectedSchemaTypes.join(" / ")} structured data to relevant pages.`,
    test: () => {
      const allTypes = new Set(pages.flatMap((p) => p.schemaTypes));
      const found = rules.expectedSchemaTypes.filter((t) => allTypes.has(t));
      return {
        passed: found.length > 0,
        evidence: found.length > 0 ? `Found: ${found.join(", ")}` : `None of ${rules.expectedSchemaTypes.join(", ")} detected site-wide`,
      };
    },
  };
}

function buildContentSignalRules(pages: CrawledPage[], industry: Industry): SiteRuleDef[] {
  const rules = getIndustryRules(industry);
  return rules.contentSignals.map((signal) => ({
    id: `content-signal-${signal.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: `${signal.label} Not Detected`,
    category: "content" as const,
    severity: "info" as const,
    confidence: "LOW" as const,
    description: `No page contains text matching expected "${signal.label}" content for ${industry} sites.`,
    whyItMatters: rules.rationale,
    recommendation: `Add clear "${signal.label}" content to the relevant page(s).`,
    test: () => {
      const lowerKeywords = signal.keywords.map((k) => k.toLowerCase());
      const found = pages.some((p) => {
        const text = (p.rawHtml || "").toLowerCase();
        return lowerKeywords.some((k) => text.includes(k));
      });
      return {
        passed: found,
        evidence: found ? `"${signal.label}" signal found on at least one page` : `No page matched keywords: ${signal.keywords.join(", ")}`,
        confidence: "LOW" as const,
      };
    },
  }));
}

export interface PageTypeCoverageRow {
  pageType: string;
  label: string;
  found: boolean;
  pageCount: number;
  competitorCoverage: "Available in Phase 2";
}

export function runContent(
  crawl: CrawlResult,
  industry: Industry
): { result: ModuleResult; recommendations: Record<string, string> } {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return buildModuleResult("content", [], "unavailable", crawl.errorMessage ?? "No pages were crawled");
  }

  const rules = getIndustryRules(industry);
  const outcomes: RuleOutcome[] = [
    ...pageRules.map((rule) => runPageRule(rule, crawl.pages)),
    ...buildPageTypeCoverageRule(crawl.pages, industry).map(runSiteRule),
    runSiteRule(buildSchemaCoverageRule(crawl.pages, industry)),
    ...buildContentSignalRules(crawl.pages, industry).map(runSiteRule),
  ];

  const pageTypeCoverage: PageTypeCoverageRow[] = rules.expectedPageTypes.map((expected) => ({
    pageType: expected.type,
    label: expected.label,
    found: crawl.pages.some((p) => p.pageType === expected.type),
    pageCount: crawl.pages.filter((p) => p.pageType === expected.type).length,
    competitorCoverage: "Available in Phase 2",
  }));

  const { result, recommendations } = buildModuleResult("content", outcomes);
  result.extra = { pageTypeCoverage, industryRationale: rules.rationale };
  return { result, recommendations };
}
