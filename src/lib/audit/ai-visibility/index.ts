import type { CrawlResult, CrawledPage, ModuleResult } from "../types";
import { buildModuleResult, runSiteRule, type RuleOutcome, type SiteRuleDef } from "../helpers";
import { isAgentAllowed, type RobotsInfo } from "../crawler/robots";

const FETCH_TIMEOUT_MS = 8000;

// The crawlers most site owners actually care about controlling for AI answer
// engines. Allowing a crawler is not evidence of citation/visibility — the
// spec is explicit that this checks crawl policy only.
const AI_CRAWLERS = [
  { id: "GPTBot", label: "ChatGPT / OpenAI (GPTBot)" },
  { id: "ChatGPT-User", label: "ChatGPT browsing (ChatGPT-User)" },
  { id: "ClaudeBot", label: "Claude (ClaudeBot)" },
  { id: "Google-Extended", label: "Google AI (Gemini / AI Overviews)" },
  { id: "PerplexityBot", label: "Perplexity" },
  { id: "Amazonbot", label: "Amazon (Alexa/Rufus)" },
  { id: "Bytespider", label: "ByteDance (TikTok)" },
  { id: "CCBot", label: "Common Crawl (feeds many LLM training sets)" },
];

const ANSWER_ENGINE_SCHEMA = ["FAQPage", "HowTo", "Course", "Review", "AggregateRating", "BreadcrumbList", "QAPage"];

async function checkLlmsTxt(origin: string): Promise<{ found: boolean; path: string | null }> {
  for (const path of ["/llms.txt", "/llms-full.txt"]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(new URL(path, origin).toString(), { signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      if (res.ok) return { found: true, path };
    } catch {
      // try the next candidate
    }
  }
  return { found: false, path: null };
}

function toRobotsInfo(crawl: CrawlResult): RobotsInfo {
  return {
    found: crawl.robotsTxt.found,
    content: crawl.robotsTxt.content,
    disallowedPaths: crawl.robotsTxt.disallowedPaths,
    allowedPaths: [],
    sitemaps: [],
    agentGroups: crawl.robotsTxt.agentGroups,
  };
}

function buildLlmsTxtRule(llms: { found: boolean; path: string | null }): SiteRuleDef {
  return {
    id: "llms-txt-missing",
    title: "llms.txt Not Detected",
    category: "ai_visibility",
    severity: "info",
    confidence: "HIGH",
    description: "No /llms.txt or /llms-full.txt file was found.",
    whyItMatters:
      "llms.txt is an emerging, unofficial convention some sites use to give AI systems a plain-language map of the site — it is not a confirmed ranking or citation factor, just a discoverability experiment worth considering.",
    recommendation: "Consider publishing an /llms.txt describing the site's key sections in plain language for AI crawlers, as an emerging practice — not a guaranteed visibility lever.",
    test: () => ({
      passed: llms.found,
      evidence: llms.found ? `${llms.path} found` : "No llms.txt or llms-full.txt found",
    }),
  };
}

function buildAiCrawlerRule(crawl: CrawlResult, origin: string): SiteRuleDef {
  return {
    id: "ai-crawler-blocked",
    title: "AI Crawler Blocked in robots.txt",
    category: "ai_visibility",
    severity: "warning",
    confidence: "HIGH",
    description: "One or more well-known AI crawlers are disallowed by robots.txt.",
    whyItMatters: "Blocking an AI crawler prevents that platform from accessing the site at all. Allowing it doesn't guarantee citation, but blocking it forecloses the possibility.",
    recommendation: "Review whether blocking these crawlers is intentional; if you want AI-answer visibility, allow the ones that matter to your audience.",
    test: () => {
      if (!crawl.robotsTxt.found) {
        return { passed: true, evidence: "No robots.txt found — nothing is explicitly blocked", confidence: "MEDIUM" };
      }
      const robots = toRobotsInfo(crawl);
      const blocked = AI_CRAWLERS.filter((c) => !isAgentAllowed(c.id, "/", robots));
      return {
        passed: blocked.length === 0,
        evidence: blocked.length === 0 ? "No AI crawler blocks detected in robots.txt" : `Blocked: ${blocked.map((c) => c.label).join(", ")}`,
      };
    },
  };
}

function buildOrganizationSchemaRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "ai-organization-schema-missing",
    title: "No Organization/Entity Schema Detected",
    category: "ai_visibility",
    severity: "warning",
    confidence: "HIGH",
    description: "No page carries Organization (or similar entity) structured data.",
    whyItMatters: "Entity schema is one of the clearest signals AI systems and knowledge graphs use to recognize \"who this business is\" independent of page text.",
    recommendation: "Add Organization JSON-LD (name, url, logo, sameAs social profiles) to the homepage at minimum.",
    test: () => {
      const found = pages.some((p) => p.schemaTypes.some((t) => /organization|localbusiness/i.test(t)));
      return { passed: found, evidence: found ? "Organization-type schema found" : "No Organization/LocalBusiness schema found on any crawled page" };
    },
  };
}

function buildAnswerEngineSchemaRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "ai-answer-schema-missing",
    title: "No Answer-Engine-Relevant Schema Detected",
    category: "ai_visibility",
    severity: "info",
    confidence: "MEDIUM",
    description: `None of ${ANSWER_ENGINE_SCHEMA.join(", ")} were detected on any crawled page.`,
    whyItMatters: "FAQ/HowTo/Review-style schema gives AI answer engines a structured, quotable version of content that's easier to extract than prose.",
    recommendation: "Add FAQPage schema to pages with genuine Q&A content, and Review/AggregateRating where real reviews exist — only markup what's actually visible on the page.",
    test: () => {
      const found = Array.from(new Set(pages.flatMap((p) => p.schemaTypes))).filter((t) => ANSWER_ENGINE_SCHEMA.includes(t));
      return { passed: found.length > 0, evidence: found.length > 0 ? `Detected: ${found.join(", ")}` : "None detected" };
    },
  };
}

function buildAnswerReadinessRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "ai-answer-readiness",
    title: "Low Question-Answer Content Formatting",
    category: "ai_visibility",
    severity: "info",
    confidence: "LOW",
    description: "Few or no crawled pages have question-formatted headings (a heuristic for FAQ-style, answer-ready content).",
    whyItMatters: "Content structured as an explicit question followed by a direct answer is easier for both featured snippets and AI answer engines to extract and quote.",
    recommendation: "On key pages, add a short FAQ section phrased as real questions your audience asks, each followed by a direct 1-3 sentence answer.",
    test: () => {
      const eligible = pages.filter((p) => p.isIndexable && p.statusCode === 200);
      if (eligible.length === 0) return { passed: false, evidence: "No indexable pages to evaluate", confidence: "UNAVAILABLE" };
      const withQuestions = eligible.filter((p) => [...p.h2, ...p.h3].some((h) => h.trim().endsWith("?")));
      const ratio = withQuestions.length / eligible.length;
      return { passed: ratio >= 0.15, evidence: `${withQuestions.length}/${eligible.length} pages have question-formatted headings` };
    },
  };
}

function buildContentChunkingRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "ai-content-chunking",
    title: "Weak Content Chunking (Few Subheadings)",
    category: "ai_visibility",
    severity: "info",
    confidence: "MEDIUM",
    description: "Many crawled pages have fewer than two H2 subheadings.",
    whyItMatters: "AI systems (and featured snippets) tend to extract content in chunks defined by headings — a wall of text with no subheadings is harder to excerpt cleanly.",
    recommendation: "Break long pages into clearly labeled H2/H3 sections so individual sections can be extracted and cited on their own.",
    test: () => {
      const eligible = pages.filter((p) => p.isIndexable && p.statusCode === 200 && p.wordCount > 150);
      if (eligible.length === 0) return { passed: false, evidence: "No substantial indexable pages to evaluate", confidence: "UNAVAILABLE" };
      const wellChunked = eligible.filter((p) => p.h2.length >= 2);
      const ratio = wellChunked.length / eligible.length;
      return { passed: ratio >= 0.5, evidence: `${wellChunked.length}/${eligible.length} substantial pages have 2+ H2 subheadings` };
    },
  };
}

export async function runAiVisibility(crawl: CrawlResult, startUrl: string): Promise<{ result: ModuleResult; recommendations: Record<string, string> }> {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return buildModuleResult("ai_visibility", [], "unavailable", crawl.errorMessage ?? "No pages were crawled");
  }

  let origin: string;
  try {
    origin = new URL(startUrl).origin;
  } catch {
    return buildModuleResult("ai_visibility", [], "unavailable", "Invalid URL");
  }

  const llms = await checkLlmsTxt(origin);

  const outcomes: RuleOutcome[] = [
    runSiteRule(buildLlmsTxtRule(llms)),
    runSiteRule(buildAiCrawlerRule(crawl, origin)),
    runSiteRule(buildOrganizationSchemaRule(crawl.pages)),
    runSiteRule(buildAnswerEngineSchemaRule(crawl.pages)),
    runSiteRule(buildAnswerReadinessRule(crawl.pages)),
    runSiteRule(buildContentChunkingRule(crawl.pages)),
  ];

  const { result, recommendations } = buildModuleResult("ai_visibility", outcomes);

  const crawlerAccess = AI_CRAWLERS.map((c) => ({
    name: c.label,
    allowed: !crawl.robotsTxt.found || isAgentAllowed(c.id, "/", toRobotsInfo(crawl)),
  }));

  result.extra = {
    llmsTxt: llms,
    crawlerAccess,
  };

  return { result, recommendations };
}
