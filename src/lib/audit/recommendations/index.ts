import type { AuditCategory, Confidence, Difficulty, Issue, Priority, Severity } from "../types";

export interface RecommendationDraft {
  issueCheckId: string;
  category: AuditCategory;
  priority: Priority;
  title: string;
  evidence: string;
  recommendedAction: string;
  businessImpact: string;
  seoImpact: string;
  difficulty: Difficulty;
  estimatedTime: string;
  expectedOutcome: string;
  isQuickWin: boolean;
  compositeScore: number;
}

const EASY_HINTS = ["missing", "og-tags", "hreflang", "title-length", "meta-description-length", "generic-anchor", "insecure-cookies"];
const HARD_HINTS = ["duplicate-content", "orphan-pages", "perf-", "axe-", "a11y-"];

function inferDifficulty(checkId: string): Difficulty {
  if (HARD_HINTS.some((h) => checkId.includes(h))) return "hard";
  if (EASY_HINTS.some((h) => checkId.includes(h))) return "easy";
  return "medium";
}

function estimatedTimeFor(difficulty: Difficulty, affectedCount: number): string {
  const scale = affectedCount > 15 ? "upper" : affectedCount > 5 ? "mid" : "lower";
  const table: Record<Difficulty, Record<"lower" | "mid" | "upper", string>> = {
    easy: { lower: "1-2 hours", mid: "2-4 hours", upper: "4-8 hours" },
    medium: { lower: "2-6 hours", mid: "1-2 days", upper: "2-4 days" },
    hard: { lower: "1-3 days", mid: "3-5 days", upper: "1-2 weeks" },
  };
  return table[difficulty][scale];
}

function priorityFor(severity: Severity, confidence: Confidence, affectedRatio: number): Priority {
  if (severity === "critical") return "critical";
  if (severity === "warning") {
    if (confidence === "HIGH" && affectedRatio >= 0.25) return "high";
    return "medium";
  }
  return "low";
}

function impactText(category: AuditCategory, severity: Severity, affectedCount: number): { business: string; seo: string } {
  const scope = affectedCount > 0 ? `across ${affectedCount} page(s)` : "site-wide";
  const impactWord = severity === "critical" ? "High" : severity === "warning" ? "Medium" : "Low";

  const businessByCategory: Record<AuditCategory, string> = {
    technical_seo: `${impactWord} — crawlability/indexability issues ${scope} can directly suppress organic visibility and lead flow.`,
    on_page_seo: `${impactWord} — weak on-page signals ${scope} reduce the odds of ranking for the page's target queries.`,
    content: `${impactWord} — content gaps ${scope} leave user questions unanswered, hurting both conversion and topical authority.`,
    accessibility: `${impactWord} — accessibility barriers ${scope} exclude some users entirely and carry legal/compliance risk (e.g. ADA/WCAG).`,
    security: `${impactWord} — security gaps ${scope} erode user trust and, for missing HTTPS/headers, may trigger browser warnings that scare off visitors.`,
    performance: `${impactWord} — slow performance ${scope} increases bounce rate and directly correlates with lower conversion rates.`,
    ai_visibility: `${impactWord} — weak AI-answer-engine signals ${scope} reduce the odds of being cited by ChatGPT/Perplexity/AI Overviews, an increasingly important discovery channel.`,
    cro: `${impactWord} — conversion friction ${scope} directly reduces how many visitors turn into leads/customers from existing traffic. Framed as potential improvement, not a guaranteed lift.`,
  };

  const seoByCategory: Record<AuditCategory, string> = {
    technical_seo: `${impactWord} SEO impact — affects how reliably search engines can crawl, index, and rank the affected pages.`,
    on_page_seo: `${impactWord} SEO impact — affects relevance signals search engines use to match the page to queries.`,
    content: `${impactWord} SEO impact — affects topical depth and the page's ability to satisfy search intent.`,
    accessibility: `Low-to-Medium SEO impact — mostly a UX/compliance issue, with indirect SEO benefit via better semantic HTML.`,
    security: `Low-to-Medium SEO impact — HTTPS is a confirmed (light) ranking factor; other headers are not, but reduce risk.`,
    performance: `High SEO impact — Core Web Vitals are a direct, confirmed ranking factor.`,
    ai_visibility: `Emerging impact — not a confirmed traditional-SEO ranking factor, but increasingly relevant to being surfaced/cited by AI answer engines.`,
    cro: `No direct SEO impact — this is a conversion-rate lever, not a ranking factor.`,
  };

  return { business: businessByCategory[category], seo: seoByCategory[category] };
}

function expectedOutcomeText(category: AuditCategory, severity: Severity): string {
  const base: Record<AuditCategory, string> = {
    technical_seo: "Improves crawlability and indexability, reducing the risk of pages being missed or mis-ranked by search engines.",
    on_page_seo: "Strengthens topical relevance signals, improving the page's ability to rank for its target queries.",
    content: "Closes a content gap expected for this industry, improving topical completeness and user trust.",
    accessibility: "Removes a barrier for users relying on assistive technology and reduces WCAG-related compliance risk.",
    security: "Reduces attack surface and removes a trust signal that can otherwise deter users or trigger browser warnings.",
    performance: "Improves Core Web Vitals, which can lift both user experience and search ranking eligibility.",
    ai_visibility: "Improves how easily AI crawlers and answer engines can access, parse, and cite the site's content.",
    cro: "Potential improvement to lead/conversion rate from existing traffic — not a measured or guaranteed lift.",
  };
  const prefix = severity === "critical" ? "High-priority fix — " : "";
  return prefix + base[category];
}

/** Composite ranking score (documented, not arbitrary):
 *   compositeScore = severityWeight * confidenceWeight * log(1 + affectedCount) - effortWeight
 * severityWeight: critical=3, warning=2, info=1
 * confidenceWeight: HIGH=1, MEDIUM=0.75, LOW=0.5
 * effortWeight: easy=1, medium=2, hard=3
 * Higher composite score = higher-impact, lower-effort, better-evidenced fix. */
function compositeScore(severity: Severity, confidence: Confidence, affectedCount: number, difficulty: Difficulty): number {
  const severityWeight = severity === "critical" ? 3 : severity === "warning" ? 2 : 1;
  const confidenceWeight = confidence === "HIGH" ? 1 : confidence === "MEDIUM" ? 0.75 : 0.5;
  const effortWeight = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  return severityWeight * confidenceWeight * Math.log(1 + affectedCount) - effortWeight;
}

export function buildRecommendations(
  issues: Issue[],
  recommendationText: Record<string, string>,
  totalPagesCrawled: number
): RecommendationDraft[] {
  return issues.map((issue) => {
    const affectedCount = issue.affectedPages.length;
    const affectedRatio = totalPagesCrawled > 0 ? affectedCount / totalPagesCrawled : 0;
    const difficulty = inferDifficulty(issue.checkId);
    const priority = priorityFor(issue.severity, issue.confidence, affectedRatio);
    const impact = impactText(issue.category, issue.severity, affectedCount);
    const score = compositeScore(issue.severity, issue.confidence, affectedCount, difficulty);

    return {
      issueCheckId: issue.checkId,
      category: issue.category,
      priority,
      title: issue.title,
      evidence: issue.evidence,
      recommendedAction: recommendationText[issue.checkId] ?? `Address: ${issue.description}`,
      businessImpact: impact.business,
      seoImpact: impact.seo,
      difficulty,
      estimatedTime: estimatedTimeFor(difficulty, affectedCount),
      expectedOutcome: expectedOutcomeText(issue.category, issue.severity),
      isQuickWin: difficulty === "easy" && (issue.severity === "critical" || issue.severity === "warning"),
      compositeScore: score,
    };
  });
}

export function rankTop25(drafts: RecommendationDraft[]): RecommendationDraft[] {
  return [...drafts].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 25);
}
