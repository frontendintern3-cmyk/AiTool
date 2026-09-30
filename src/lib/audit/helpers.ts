import type { AuditCategory, Check, CrawledPage, Confidence, Issue, ModuleResult, Severity } from "./types";

export interface PageRuleDef {
  id: string;
  title: string;
  category: AuditCategory;
  severity: Severity;
  confidence: Confidence;
  description: string;
  whyItMatters: string;
  recommendation: string;
  /** Return null when the rule doesn't apply to this page (excluded from both
   * the score denominator and the issue). Return {passed, evidence} otherwise. */
  test: (page: CrawledPage) => { passed: boolean; evidence: string } | null;
}

export interface RuleOutcome {
  checks: Check[];
  issue: Issue | null;
  recommendation: string;
}

/** Runs one rule across every crawled page, producing per-page Check rows
 * (used for the passed/warning/critical score counts) and — if any page
 * fails — a single grouped Issue with all affected page URLs as evidence. */
export function runPageRule(rule: PageRuleDef, pages: CrawledPage[]): RuleOutcome {
  const checks: Check[] = [];
  const failingPages: string[] = [];
  let firstFailingEvidence = "";

  for (const page of pages) {
    const result = rule.test(page);
    if (!result) continue;
    checks.push({
      id: rule.id,
      title: rule.title,
      passed: result.passed,
      severity: rule.severity,
      confidence: rule.confidence,
      evidence: result.evidence,
    });
    if (!result.passed) {
      failingPages.push(page.url);
      if (!firstFailingEvidence) firstFailingEvidence = result.evidence;
    }
  }

  if (failingPages.length === 0) {
    return { checks, issue: null, recommendation: rule.recommendation };
  }

  const issue: Issue = {
    category: rule.category,
    checkId: rule.id,
    title: rule.title,
    description: rule.description,
    whyItMatters: rule.whyItMatters,
    severity: rule.severity,
    affectedPages: failingPages,
    evidence: `${failingPages.length}/${checks.length} crawled pages affected. Example: ${firstFailingEvidence}`,
    confidence: rule.confidence,
  };

  return { checks, issue, recommendation: rule.recommendation };
}

export interface SiteRuleDef {
  id: string;
  title: string;
  category: AuditCategory;
  severity: Severity;
  confidence: Confidence;
  description: string;
  whyItMatters: string;
  recommendation: string;
  test: () => { passed: boolean; evidence: string; confidence?: Confidence } | null;
}

export function runSiteRule(rule: SiteRuleDef): RuleOutcome {
  const result = rule.test();
  if (!result) return { checks: [], issue: null, recommendation: rule.recommendation };

  const confidence = result.confidence ?? rule.confidence;
  const checks: Check[] = [
    { id: rule.id, title: rule.title, passed: result.passed, severity: rule.severity, confidence, evidence: result.evidence },
  ];

  if (result.passed) return { checks, issue: null, recommendation: rule.recommendation };

  const issue: Issue = {
    category: rule.category,
    checkId: rule.id,
    title: rule.title,
    description: rule.description,
    whyItMatters: rule.whyItMatters,
    severity: rule.severity,
    affectedPages: [],
    evidence: result.evidence,
    confidence,
  };

  return { checks, issue, recommendation: rule.recommendation };
}

/** Recommendation text keyed by rule id, collected alongside module results so the
 * recommendations engine never has to re-derive "what should be done" from scratch —
 * it's defined once, next to the rule that detects the problem. */
export type RecommendationMap = Record<string, string>;

export function buildModuleResult(
  category: AuditCategory,
  outcomes: RuleOutcome[],
  status: ModuleResult["status"] = "ok",
  errorMessage?: string
): { result: ModuleResult; recommendations: RecommendationMap } {
  const checks = outcomes.flatMap((o) => o.checks);
  const issues = outcomes.map((o) => o.issue).filter((i): i is Issue => i !== null);
  const recommendations: RecommendationMap = {};
  for (const o of outcomes) {
    if (o.checks.length > 0 || o.issue) {
      const id = o.issue?.checkId ?? o.checks[0]?.id;
      if (id) recommendations[id] = o.recommendation;
    }
  }

  return {
    result: { status, category, checks, issues, errorMessage },
    recommendations,
  };
}

export function wordCountOf(page: CrawledPage): number {
  return page.wordCount;
}
