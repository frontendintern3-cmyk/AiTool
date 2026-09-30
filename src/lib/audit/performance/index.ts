import type { CrawlResult, CrawledPage, ModuleResult, Check, Issue } from "../types";
import { resolveBrowserExecutablePath } from "../../browser";

const MAX_PAGES_TO_TEST = 3;
type Strategy = "mobile" | "desktop";

export interface PerformanceRunResult {
  pageUrl: string;
  strategy: Strategy;
  status: "ok" | "unavailable";
  errorMessage?: string;
  performanceScore: number | null;
  lcpMs: number | null;
  fcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  ttfbMs: number | null;
  speedIndexMs: number | null;
  totalBlockingTimeMs: number | null;
  opportunities: { id: string; title: string; description: string; displayValue: string | null }[];
  source: "lighthouse-local";
}

function selectPagesToTest(pages: CrawledPage[]): CrawledPage[] {
  const eligible = pages.filter((p) => p.statusCode === 200 && p.isIndexable);
  const homepage = eligible.find((p) => p.pageType === "homepage");
  const selected = homepage ? [homepage] : [];
  const seenTypes = new Set(homepage ? [homepage.pageType] : []);

  for (const p of eligible) {
    if (selected.length >= MAX_PAGES_TO_TEST) break;
    if (seenTypes.has(p.pageType)) continue;
    seenTypes.add(p.pageType);
    selected.push(p);
  }
  return selected.slice(0, MAX_PAGES_TO_TEST);
}

async function runLighthouseFor(url: string, strategy: Strategy, port: number): Promise<PerformanceRunResult> {
  const base: PerformanceRunResult = {
    pageUrl: url,
    strategy,
    status: "unavailable",
    performanceScore: null,
    lcpMs: null,
    fcpMs: null,
    cls: null,
    inpMs: null,
    ttfbMs: null,
    speedIndexMs: null,
    totalBlockingTimeMs: null,
    opportunities: [],
    source: "lighthouse-local",
  };

  try {
    const lighthouse = (await import("lighthouse")).default;
    const config =
      strategy === "desktop"
        ? {
            extends: "lighthouse:default",
            settings: {
              formFactor: "desktop" as const,
              screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
              throttlingMethod: "simulate" as const,
              onlyCategories: ["performance"],
            },
          }
        : {
            extends: "lighthouse:default",
            settings: {
              formFactor: "mobile" as const,
              screenEmulation: { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false },
              throttlingMethod: "simulate" as const,
              onlyCategories: ["performance"],
            },
          };

    const runnerResult = await lighthouse(url, { port, logLevel: "error" }, config as never);
    if (!runnerResult?.lhr) {
      return { ...base, errorMessage: "Lighthouse produced no result" };
    }

    const lhr = runnerResult.lhr;
    const audits = lhr.audits;
    const opportunities = Object.values(audits)
      .filter((a) => a.details?.type === "opportunity" && (a.score ?? 1) < 1)
      .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
      .slice(0, 5)
      .map((a) => ({ id: a.id, title: a.title, description: a.description, displayValue: a.displayValue ?? null }));

    return {
      ...base,
      status: "ok",
      performanceScore: lhr.categories.performance?.score != null ? Math.round(lhr.categories.performance.score * 100) : null,
      lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
      fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      inpMs: audits["interaction-to-next-paint"]?.numericValue ?? null,
      ttfbMs: audits["server-response-time"]?.numericValue ?? null,
      speedIndexMs: audits["speed-index"]?.numericValue ?? null,
      totalBlockingTimeMs: audits["total-blocking-time"]?.numericValue ?? null,
      opportunities,
    };
  } catch (err) {
    return { ...base, errorMessage: err instanceof Error ? err.message : "Lighthouse run failed" };
  }
}

function buildIssuesFromRuns(runs: PerformanceRunResult[]): Issue[] {
  const issues: Issue[] = [];
  const thresholds: { key: keyof PerformanceRunResult; label: string; poor: number; needsWork: number; unit: string }[] = [
    { key: "lcpMs", label: "Largest Contentful Paint (LCP)", poor: 4000, needsWork: 2500, unit: "ms" },
    { key: "cls", label: "Cumulative Layout Shift (CLS)", poor: 0.25, needsWork: 0.1, unit: "" },
    { key: "totalBlockingTimeMs", label: "Total Blocking Time (TBT)", poor: 600, needsWork: 200, unit: "ms" },
  ];

  for (const t of thresholds) {
    const poorPages = runs.filter((r) => r.status === "ok" && typeof r[t.key] === "number" && (r[t.key] as number) > t.poor);
    if (poorPages.length === 0) continue;
    issues.push({
      category: "performance",
      checkId: `perf-${String(t.key)}-poor`,
      title: `Poor ${t.label}`,
      description: `${t.label} exceeds the "poor" threshold (${t.poor}${t.unit}) on ${poorPages.length} tested run(s).`,
      whyItMatters: `${t.label} is one of Google's Core Web Vitals and directly affects both user experience and search ranking eligibility for the "good" CWV bucket.`,
      severity: "critical",
      affectedPages: poorPages.map((p) => `${p.pageUrl} (${p.strategy})`),
      evidence: `Worst observed: ${Math.max(...poorPages.map((p) => p[t.key] as number)).toFixed(2)}${t.unit}`,
      confidence: "HIGH",
    });
  }

  const lowScorePages = runs.filter((r) => r.status === "ok" && r.performanceScore !== null && r.performanceScore < 50);
  if (lowScorePages.length > 0) {
    issues.push({
      category: "performance",
      checkId: "perf-lighthouse-score-low",
      title: "Low Lighthouse Performance Score",
      description: `Lighthouse performance score is below 50 on ${lowScorePages.length} tested run(s).`,
      whyItMatters: "A low Lighthouse score reflects multiple compounding performance issues that materially slow down the page for real users.",
      severity: "critical",
      affectedPages: lowScorePages.map((p) => `${p.pageUrl} (${p.strategy})`),
      evidence: `Lowest score: ${Math.min(...lowScorePages.map((p) => p.performanceScore!))}/100`,
      confidence: "HIGH",
    });
  }

  return issues;
}

export async function runPerformance(crawl: CrawlResult): Promise<{ result: ModuleResult; recommendations: Record<string, string>; runs: PerformanceRunResult[] }> {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return {
      result: { status: "unavailable", category: "performance", checks: [], issues: [], errorMessage: crawl.errorMessage ?? "No pages were crawled" },
      recommendations: {},
      runs: [],
    };
  }

  const pagesToTest = selectPagesToTest(crawl.pages);
  if (pagesToTest.length === 0) {
    return {
      result: { status: "unavailable", category: "performance", checks: [], issues: [], errorMessage: "No indexable pages available to test" },
      recommendations: {},
      runs: [],
    };
  }

  let chromeLauncher: typeof import("chrome-launcher");
  let chrome: import("chrome-launcher").LaunchedChrome;
  try {
    chromeLauncher = await import("chrome-launcher");
    const chromePath = resolveBrowserExecutablePath();
    chrome = await chromeLauncher.launch({
      chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
      ...(chromePath ? { chromePath } : {}),
    });
  } catch (err) {
    return {
      result: {
        status: "unavailable",
        category: "performance",
        checks: [],
        issues: [],
        errorMessage: "No Chromium-based browser available to run Lighthouse locally.",
      },
      recommendations: {},
      runs: [],
    };
  }

  const runs: PerformanceRunResult[] = [];
  try {
    for (const page of pagesToTest) {
      for (const strategy of ["mobile", "desktop"] as Strategy[]) {
        const run = await runLighthouseFor(page.url, strategy, chrome.port);
        runs.push(run);
      }
    }
  } finally {
    try {
      await chrome.kill();
    } catch {
      // ignore
    }
  }

  const checks: Check[] = runs.map((r) => ({
    id: `perf-run-${r.strategy}`,
    title: `Lighthouse ${r.strategy} run`,
    passed: r.status === "ok" && (r.performanceScore ?? 0) >= 50,
    severity: r.status === "ok" && (r.performanceScore ?? 0) >= 90 ? "info" : r.status === "ok" && (r.performanceScore ?? 0) >= 50 ? "warning" : "critical",
    confidence: r.status === "ok" ? "HIGH" : "UNAVAILABLE",
    evidence: r.status === "ok" ? `${r.pageUrl} (${r.strategy}): score ${r.performanceScore}/100` : `${r.pageUrl} (${r.strategy}): ${r.errorMessage}`,
  }));

  const issues = buildIssuesFromRuns(runs);
  const recommendations: Record<string, string> = {
    "perf-lcpMs-poor": "Optimize the largest above-the-fold element (usually a hero image or heading): compress/resize images, preload the LCP resource, and remove render-blocking CSS/JS above it.",
    "perf-cls-poor": "Reserve explicit width/height (or aspect-ratio) for images, embeds, and ads, and avoid injecting content above existing content after load.",
    "perf-totalBlockingTimeMs-poor": "Break up long JavaScript tasks, defer/async non-critical scripts, and remove unused JavaScript.",
    "perf-lighthouse-score-low": "Address the highest-impact opportunities from the Lighthouse run (see the Opportunities list) — typically image optimization, render-blocking resources, and unused JS/CSS.",
  };

  const anyOk = runs.some((r) => r.status === "ok");
  return {
    result: {
      status: anyOk ? (runs.some((r) => r.status !== "ok") ? "partial" : "ok") : "unavailable",
      category: "performance",
      checks,
      issues,
      errorMessage: anyOk ? undefined : "All Lighthouse runs failed",
    },
    recommendations,
    runs,
  };
}
