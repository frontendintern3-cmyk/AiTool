import type { CrawlResult, CrawledPage, Check, Issue, ModuleResult, Severity } from "../types";
import { launchBrowser } from "../../browser";

const MAX_PAGES_TO_TEST = 5;

interface AxeViolationNode {
  target: string[];
  html: string;
}

interface AxeViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeViolationNode[];
}

function mapImpactToSeverity(impact: AxeViolation["impact"]): Severity {
  if (impact === "critical" || impact === "serious") return "critical";
  if (impact === "moderate") return "warning";
  return "info";
}

function selectPagesToTest(pages: CrawledPage[]): CrawledPage[] {
  const eligible = pages.filter((p) => p.statusCode === 200 && p.isIndexable);
  const homepage = eligible.find((p) => p.pageType === "homepage");
  const seenTypes = new Set<string>(homepage ? [homepage.pageType] : []);
  const selected = homepage ? [homepage] : [];

  for (const p of eligible) {
    if (selected.length >= MAX_PAGES_TO_TEST) break;
    if (seenTypes.has(p.pageType)) continue;
    seenTypes.add(p.pageType);
    selected.push(p);
  }
  for (const p of eligible) {
    if (selected.length >= MAX_PAGES_TO_TEST) break;
    if (!selected.includes(p)) selected.push(p);
  }
  return selected.slice(0, MAX_PAGES_TO_TEST);
}

export async function runAccessibility(crawl: CrawlResult): Promise<{ result: ModuleResult; recommendations: Record<string, string> }> {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return {
      result: { status: "unavailable", category: "accessibility", checks: [], issues: [], errorMessage: crawl.errorMessage ?? "No pages were crawled" },
      recommendations: {},
    };
  }

  const pagesToTest = selectPagesToTest(crawl.pages);
  if (pagesToTest.length === 0) {
    return {
      result: { status: "unavailable", category: "accessibility", checks: [], issues: [], errorMessage: "No indexable pages available to test" },
      recommendations: {},
    };
  }

  let browser: import("playwright").Browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    return {
      result: {
        status: "unavailable",
        category: "accessibility",
        checks: [],
        issues: [],
        errorMessage: "No browser available to run automated accessibility checks (axe-core requires a Chromium instance).",
      },
      recommendations: {},
    };
  }

  const checks: Check[] = [];
  const violationsById = new Map<string, { violation: AxeViolation; pages: Set<string> }>();
  const recommendations: Record<string, string> = {};
  let pagesTested = 0;
  let pagesFailed = 0;

  try {
    const { default: AxeBuilder } = await import("@axe-core/playwright");

    for (const crawledPage of pagesToTest) {
      // @axe-core/playwright requires a page created from an explicit context —
      // browser.newPage()'s implicit context makes AxeBuilder throw
      // "Please use browser.newContext()".
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.goto(crawledPage.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const axeResults = await new AxeBuilder({ page }).analyze();
        pagesTested++;

        const violations = axeResults.violations as unknown as AxeViolation[];
        for (const v of violations) {
          const entry = violationsById.get(v.id) ?? { violation: v, pages: new Set<string>() };
          entry.pages.add(crawledPage.url);
          violationsById.set(v.id, entry);
          recommendations[`a11y-${v.id}`] = `Fix: ${v.help}. See ${v.helpUrl}`;
        }

        checks.push({
          id: "axe-scan-completed",
          title: "Automated Accessibility Scan Completed",
          passed: violations.length === 0,
          severity: violations.length === 0 ? "info" : "warning",
          confidence: "HIGH",
          evidence: `${crawledPage.url}: ${violations.length} automated violation type(s) detected`,
        });
      } catch (err) {
        pagesFailed++;
        checks.push({
          id: "axe-scan-failed",
          title: "Automated Accessibility Scan Failed",
          passed: false,
          severity: "info",
          confidence: "UNAVAILABLE",
          evidence: `Could not scan ${crawledPage.url}: ${err instanceof Error ? err.message : "unknown error"}`,
        });
      } finally {
        await context.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const issues: Issue[] = Array.from(violationsById.values()).map(({ violation, pages }) => ({
    category: "accessibility",
    checkId: `a11y-${violation.id}`,
    title: violation.help,
    description: violation.description,
    whyItMatters:
      "Detected by an automated axe-core scan — this is a subset of full WCAG 2.1 AA compliance and does not replace manual accessibility testing (keyboard-only navigation, screen reader testing, etc.).",
    severity: mapImpactToSeverity(violation.impact),
    affectedPages: Array.from(pages),
    evidence: `${violation.nodes.length} element(s) affected across ${pages.size} tested page(s). Example: ${violation.nodes[0]?.html?.slice(0, 150) ?? "n/a"}`,
    confidence: "MEDIUM",
  }));

  return {
    result: {
      status: pagesTested > 0 ? (pagesFailed > 0 ? "partial" : "ok") : "unavailable",
      category: "accessibility",
      checks,
      issues,
      errorMessage: pagesTested === 0 ? "All accessibility scans failed" : undefined,
      extra: {
        pagesTested,
        pagesFailed,
        totalPagesEligible: crawl.pages.filter((p) => p.statusCode === 200 && p.isIndexable).length,
        note: "Automated axe-core checks only — not a substitute for manual WCAG 2.1 AA testing.",
      },
    },
    recommendations,
  };
}
