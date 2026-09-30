import type { AuditCategory, Confidence, ModuleResult } from "../types";

export interface CategoryScore {
  category: AuditCategory;
  score: number | null;
  weight: number;
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  confidence: Confidence;
  status: ModuleResult["status"];
  notes: string | null;
}

export interface OverallScore {
  score: number | null;
  confidence: Confidence;
  includedCategories: AuditCategory[];
  excludedCategories: AuditCategory[];
}

// Category weights, now matching the spec's original 8-category split
// (Technical 20 / Performance 15 / UX 10 / Accessibility 10 / Security 10 /
// Content 10 / AI Visibility 15 / CRO 10) with on_page_seo taking the "UX" 10
// since a dedicated UX/screenshots module hasn't shipped yet. Total is 100
// across whichever categories are actually present; computeOverallScore
// renormalizes if any category has no data (e.g. a crawl that fails outright).
export const PHASE_1_WEIGHTS: Record<AuditCategory, number> = {
  technical_seo: 20,
  performance: 15,
  on_page_seo: 10,
  content: 10,
  accessibility: 10,
  security: 10,
  ai_visibility: 15,
  cro: 10,
};

const CONFIDENCE_RANK: Record<Confidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNAVAILABLE: 0 };

function weakestConfidence(confidences: Confidence[]): Confidence {
  if (confidences.length === 0) return "UNAVAILABLE";
  return confidences.reduce((weakest, c) => (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[weakest] ? c : weakest));
}

/**
 * Score formula (documented, not arbitrary): for each category, every executed
 * check counts once. `passRate = passedCount / totalChecks`. Critical failures
 * carry an additional flat penalty beyond simply not passing, since a handful of
 * critical issues should weigh more than the same count of minor ones.
 *   score = clamp( round(passRate * 100) - criticalCount * 3, 0, 100 )
 * A category with zero applicable checks (module failed or nothing to check)
 * scores `null` with confidence UNAVAILABLE rather than an invented number.
 */
export function scoreModule(result: ModuleResult, weight: number): CategoryScore {
  if (result.status === "unavailable" || result.checks.length === 0) {
    return {
      category: result.category,
      score: null,
      weight,
      passedCount: 0,
      warningCount: 0,
      criticalCount: 0,
      confidence: "UNAVAILABLE",
      status: "unavailable",
      notes: result.errorMessage ?? "No checks could be evaluated for this category.",
    };
  }

  const passedCount = result.checks.filter((c) => c.passed).length;
  const criticalCount = result.checks.filter((c) => !c.passed && c.severity === "critical").length;
  const warningCount = result.checks.filter((c) => !c.passed && c.severity !== "critical").length;
  const total = result.checks.length;

  const passRate = passedCount / total;
  const score = Math.max(0, Math.min(100, Math.round(passRate * 100) - criticalCount * 3));

  const confidence = weakestConfidence(result.checks.map((c) => c.confidence));

  return {
    category: result.category,
    score,
    weight,
    passedCount,
    warningCount,
    criticalCount,
    confidence,
    status: result.status,
    notes: null,
  };
}

export function computeOverallScore(categoryScores: CategoryScore[]): OverallScore {
  const available = categoryScores.filter((c) => c.score !== null);
  const excluded = categoryScores.filter((c) => c.score === null).map((c) => c.category);

  if (available.length === 0) {
    return { score: null, confidence: "UNAVAILABLE", includedCategories: [], excludedCategories: excluded };
  }

  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = available.reduce((sum, c) => sum + c.score! * c.weight, 0);
  const score = Math.round(weightedSum / totalWeight);

  return {
    score,
    confidence: weakestConfidence(available.map((c) => c.confidence)),
    includedCategories: available.map((c) => c.category),
    excludedCategories: excluded,
  };
}
