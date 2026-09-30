// Shared types for the audit engine. Kept as plain TS unions (not Prisma enums)
// because the SQLite dev datasource doesn't map native enums the way Postgres
// does — this keeps the schema portable and validation happens here instead.

export type Severity = "critical" | "warning" | "info";
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
export type ModuleStatus = "ok" | "partial" | "unavailable";
export type Priority = "critical" | "high" | "medium" | "low";
export type Difficulty = "easy" | "medium" | "hard";

export type AuditCategory =
  | "technical_seo"
  | "on_page_seo"
  | "content"
  | "accessibility"
  | "security"
  | "performance"
  | "ai_visibility"
  | "cro";

export type Industry =
  | "Education"
  | "Healthcare"
  | "SaaS"
  | "Technology"
  | "E-commerce"
  | "Finance"
  | "Real Estate"
  | "Travel"
  | "Hospitality"
  | "Manufacturing"
  | "Consulting"
  | "Legal"
  | "Sports"
  | "Media"
  | "Government"
  | "Automotive"
  | "Other";

export const INDUSTRIES: Industry[] = [
  "Education",
  "Healthcare",
  "SaaS",
  "Technology",
  "E-commerce",
  "Finance",
  "Real Estate",
  "Travel",
  "Hospitality",
  "Manufacturing",
  "Consulting",
  "Legal",
  "Sports",
  "Media",
  "Government",
  "Automotive",
  "Other",
];

export type PageType =
  | "homepage"
  | "service"
  | "product"
  | "course"
  | "blog"
  | "category"
  | "location"
  | "contact"
  | "about"
  | "other";

export interface ImageRef {
  src: string;
  alt: string | null;
  hasAlt: boolean;
}

export interface LinkRef {
  href: string;
  anchorText: string;
  isInternal: boolean;
}

export interface CrawledPage {
  url: string;
  pageType: PageType;
  statusCode: number | null;
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
  brokenLinks: string[];
  redirectChain: string[];
  responseTimeMs: number;
  contentType: string | null;
  isIndexable: boolean;
  contentHash: string;
  renderedWithJs: boolean;
  rawHtml: string;
  headers: Record<string, string>;
  fetchError?: string;
  iconUrl: string | null;
}

export interface CrawlResult {
  status: ModuleStatus;
  pages: CrawledPage[];
  pagesDiscovered: number;
  robotsTxt: {
    found: boolean;
    content: string | null;
    disallowedPaths: string[];
    agentGroups: Record<string, { disallow: string[]; allow: string[] }>;
  };
  sitemapUrls: string[];
  errorMessage?: string;
}

export interface Check {
  id: string;
  title: string;
  passed: boolean;
  severity: Severity;
  confidence: Confidence;
  evidence: string;
}

export interface Issue {
  category: AuditCategory;
  checkId: string;
  title: string;
  description: string;
  whyItMatters: string;
  severity: Severity;
  affectedPages: string[];
  evidence: string;
  confidence: Confidence;
  /** "rule" (deterministic check, default) or "ai" (LLM reading of crawled text,
   * quote-verified against the source page before it's ever accepted as an issue). */
  source?: "rule" | "ai";
  sourceQuotes?: { url: string; quote: string }[];
}

export interface ModuleResult {
  status: ModuleStatus;
  category: AuditCategory;
  checks: Check[];
  issues: Issue[];
  errorMessage?: string;
  extra?: Record<string, unknown>;
}

export interface AuditProgress {
  pagesDiscovered: number;
  pagesCrawled: number;
  issuesFound: number;
  critical: number;
  warnings: number;
  passed: number;
  stages: Record<string, "pending" | "running" | "done" | "failed">;
}

export const STAGE_ORDER = [
  "discovery",
  "crawling",
  "technical_seo",
  "performance",
  "on_page_seo",
  "content",
  "ai_analysis",
  "ai_visibility",
  "cro",
  "accessibility",
  "security",
  "screenshots",
  "competitors",
  "scoring",
  "recommendations",
] as const;

export type Stage = (typeof STAGE_ORDER)[number];

export interface AuditInput {
  url: string;
  industry: Industry;
  businessName?: string;
  targetCountry?: string;
  targetCity?: string;
  targetAudience?: string;
  competitorUrls?: string[];
}
