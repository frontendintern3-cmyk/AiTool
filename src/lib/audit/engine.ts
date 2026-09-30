import { db } from "../db";
import { crawlWebsite } from "./crawler";
import { runTechnicalSeo } from "./technical-seo";
import { runOnPageSeo } from "./on-page-seo";
import { runContent } from "./content";
import { runAccessibility } from "./accessibility";
import { runSecurity } from "./security";
import { runPerformance } from "./performance";
import { runAiAnalysis } from "./ai-analysis";
import { runAiVisibility } from "./ai-visibility";
import { runCro } from "./cro";
import { runScreenshots } from "./screenshots";
import { runCompetitors } from "./competitors";
import { scoreModule, computeOverallScore, PHASE_1_WEIGHTS } from "./scoring";
import { buildRecommendations, rankTop25 } from "./recommendations";
import type { AuditProgress, Industry, Issue, ModuleResult, Stage } from "./types";
import { STAGE_ORDER } from "./types";
import { toJson } from "./json";

function initialProgress(): AuditProgress {
  const stages: AuditProgress["stages"] = {};
  for (const s of STAGE_ORDER) stages[s] = "pending";
  return { pagesDiscovered: 0, pagesCrawled: 0, issuesFound: 0, critical: 0, warnings: 0, passed: 0, stages };
}

async function updateProgress(auditId: string, patch: Partial<AuditProgress>, currentStage?: Stage) {
  const audit = await db.audit.findUnique({ where: { id: auditId }, select: { progress: true } });
  const prev = (audit?.progress as AuditProgress | null) ?? initialProgress();
  const next: AuditProgress = { ...prev, ...patch, stages: { ...prev.stages, ...(patch.stages ?? {}) } };
  await db.audit.update({
    where: { id: auditId },
    data: { progress: toJson(next), ...(currentStage ? { currentStage } : {}) },
  });
  return next;
}

async function setStage(auditId: string, stage: Stage, status: "running" | "done" | "failed") {
  await updateProgress(auditId, { stages: { [stage]: status } }, status === "running" ? stage : undefined);
}

export async function runAuditJob(auditId: string): Promise<void> {
  const audit = await db.audit.findUnique({ where: { id: auditId }, include: { website: true } });
  if (!audit) return;

  try {
    await db.audit.update({ where: { id: auditId }, data: { status: "RUNNING", startedAt: new Date(), progress: toJson(initialProgress()) } });

    // --- Discovery + Crawling ---
    await setStage(auditId, "discovery", "running");
    await setStage(auditId, "crawling", "running");
    const crawl = await crawlWebsite(audit.website.url, {
      onProgress: (crawled, discovered) => {
        void updateProgress(auditId, { pagesCrawled: crawled, pagesDiscovered: discovered });
      },
    });
    await setStage(auditId, "discovery", "done");
    await setStage(auditId, "crawling", crawl.status === "unavailable" ? "failed" : "done");

    const homepageIconUrl = crawl.pages.find((p) => p.pageType === "homepage")?.iconUrl ?? null;
    if (homepageIconUrl) {
      await db.audit.update({ where: { id: auditId }, data: { siteLogoUrl: homepageIconUrl } });
    }
    await updateProgress(auditId, { pagesCrawled: crawl.pages.length, pagesDiscovered: crawl.pagesDiscovered });

    if (crawl.pages.length > 0) {
      await db.page.createMany({
        data: crawl.pages.map((p) => ({
          auditId,
          url: p.url,
          pageType: p.pageType,
          statusCode: p.statusCode,
          title: p.title,
          metaDescription: p.metaDescription,
          h1: toJson(p.h1),
          h2: toJson(p.h2),
          h3: toJson(p.h3),
          wordCount: p.wordCount,
          canonical: p.canonical,
          robotsMeta: p.robotsMeta,
          hreflang: toJson(p.hreflang),
          schemaTypes: toJson(p.schemaTypes),
          ogTags: toJson(p.ogTags),
          twitterTags: toJson(p.twitterTags),
          images: toJson(p.images),
          internalLinks: toJson(p.internalLinks),
          externalLinks: toJson(p.externalLinks),
          brokenLinks: toJson(p.brokenLinks),
          redirectChain: toJson(p.redirectChain),
          responseTimeMs: p.responseTimeMs,
          contentType: p.contentType,
          isIndexable: p.isIndexable,
          contentHash: p.contentHash,
          renderedWithJs: p.renderedWithJs,
          fetchError: p.fetchError ?? null,
        })),
      });
    }

    const recommendationText: Record<string, string> = {};
    const moduleResults: ModuleResult[] = [];
    const moduleExtras: Record<string, unknown> = {};

    // --- Technical SEO ---
    await setStage(auditId, "technical_seo", "running");
    const technical = runTechnicalSeo(crawl);
    Object.assign(recommendationText, technical.recommendations);
    moduleResults.push(technical.result);
    await setStage(auditId, "technical_seo", technical.result.status === "unavailable" ? "failed" : "done");

    // --- Performance ---
    await setStage(auditId, "performance", "running");
    const performance = await runPerformance(crawl);
    Object.assign(recommendationText, performance.recommendations);
    moduleResults.push(performance.result);
    if (performance.runs.length > 0) {
      await db.performanceMetric.createMany({
        data: performance.runs.map((r) => ({
          auditId,
          pageUrl: r.pageUrl,
          strategy: r.strategy,
          status: r.status,
          errorMessage: r.errorMessage ?? null,
          performanceScore: r.performanceScore,
          lcpMs: r.lcpMs,
          fcpMs: r.fcpMs,
          cls: r.cls,
          inpMs: r.inpMs,
          ttfbMs: r.ttfbMs,
          speedIndexMs: r.speedIndexMs,
          totalBlockingTimeMs: r.totalBlockingTimeMs,
          opportunities: toJson(r.opportunities),
          source: r.source,
        })),
      });
    }
    await setStage(auditId, "performance", performance.result.status === "unavailable" ? "failed" : "done");

    // --- On-Page SEO ---
    await setStage(auditId, "on_page_seo", "running");
    const onPage = runOnPageSeo(crawl);
    Object.assign(recommendationText, onPage.recommendations);
    moduleResults.push(onPage.result);
    await setStage(auditId, "on_page_seo", onPage.result.status === "unavailable" ? "failed" : "done");

    // --- Content ---
    await setStage(auditId, "content", "running");
    const content = runContent(crawl, audit.industry as Industry);
    Object.assign(recommendationText, content.recommendations);
    moduleResults.push(content.result);
    await setStage(auditId, "content", content.result.status === "unavailable" ? "failed" : "done");

    // --- AI Analysis Layer --- (reads real crawled text, quote-verified before acceptance;
    // merged into the content category since it produces content-shaped issues, not a
    // separate scoreable category)
    await setStage(auditId, "ai_analysis", "running");
    const aiAnalysis = await runAiAnalysis(crawl, audit.industry as Industry, {
      businessName: audit.businessName,
      targetCountry: audit.targetCountry,
      targetCity: audit.targetCity,
      targetAudience: audit.targetAudience,
    });
    Object.assign(recommendationText, aiAnalysis.recommendations);
    content.result.checks.push(...aiAnalysis.result.checks);
    content.result.issues.push(...aiAnalysis.result.issues);
    await db.audit.update({ where: { id: auditId }, data: { aiSummary: toJson(aiAnalysis.summary) } });
    // "unavailable" here is usually just "no ANTHROPIC_API_KEY set" (an optional layer),
    // not a real failure, so this stage is marked done either way — the aiSummary.status
    // field is what the report checks to show "AI analysis not configured" vs real results.
    await setStage(auditId, "ai_analysis", "done");

    // --- AI Visibility / GEO / AEO ---
    await setStage(auditId, "ai_visibility", "running");
    const aiVisibility = await runAiVisibility(crawl, audit.website.url);
    Object.assign(recommendationText, aiVisibility.recommendations);
    moduleResults.push(aiVisibility.result);
    await setStage(auditId, "ai_visibility", aiVisibility.result.status === "unavailable" ? "failed" : "done");

    // --- CRO ---
    await setStage(auditId, "cro", "running");
    const cro = runCro(crawl, audit.industry as Industry);
    Object.assign(recommendationText, cro.recommendations);
    moduleResults.push(cro.result);
    await setStage(auditId, "cro", cro.result.status === "unavailable" ? "failed" : "done");

    // --- Accessibility ---
    await setStage(auditId, "accessibility", "running");
    const accessibility = await runAccessibility(crawl);
    Object.assign(recommendationText, accessibility.recommendations);
    moduleResults.push(accessibility.result);
    await setStage(auditId, "accessibility", accessibility.result.status === "unavailable" ? "failed" : "done");

    // --- Security ---
    await setStage(auditId, "security", "running");
    const security = runSecurity(crawl);
    Object.assign(recommendationText, security.recommendations);
    moduleResults.push(security.result);
    await setStage(auditId, "security", security.result.status === "unavailable" ? "failed" : "done");

    // --- Screenshots ---
    await setStage(auditId, "screenshots", "running");
    const screenshots = await runScreenshots(crawl, auditId);
    if (screenshots.screenshots.length > 0) {
      await db.screenshot.createMany({
        data: screenshots.screenshots.map((s) => ({
          auditId,
          label: s.label,
          pageUrl: s.pageUrl,
          viewport: s.viewport,
          path: s.path,
          width: s.width,
          height: s.height,
        })),
      });
    }
    // Screenshots are an artifact gallery, not a scored category — "unavailable" (e.g.
    // no browser reachable) is noted but never blocks the rest of the audit.
    await setStage(auditId, "screenshots", "done");

    // --- Competitors (manually-supplied URLs only, homepage comparison) ---
    await setStage(auditId, "competitors", "running");
    const competitorUrls = (audit.competitorUrls as string[] | null) ?? [];
    if (competitorUrls.length > 0) {
      const competitorResults = await runCompetitors(competitorUrls);
      await db.competitor.createMany({
        data: competitorResults.map((c) => ({
          auditId,
          url: c.url,
          status: c.status,
          errorMessage: c.errorMessage ?? null,
          title: c.title,
          metaDescription: c.metaDescription,
          wordCount: c.wordCount,
          httpsEnabled: c.httpsEnabled,
          hasSchema: c.hasSchema,
          h1Count: c.h1Count,
          responseTimeMs: c.responseTimeMs,
        })),
      });
    }
    await setStage(auditId, "competitors", "done");

    for (const m of moduleResults) {
      if (m.extra) moduleExtras[m.category] = m.extra;
    }
    await db.audit.update({ where: { id: auditId }, data: { moduleExtras: toJson(moduleExtras) } });

    // --- Issues ---
    const allIssues: Issue[] = moduleResults.flatMap((m) => m.issues);
    const createdIssues = await Promise.all(
      allIssues.map((issue) =>
        db.auditIssue.create({
          data: {
            auditId,
            category: issue.category,
            checkId: issue.checkId,
            title: issue.title,
            description: issue.description,
            whyItMatters: issue.whyItMatters,
            severity: issue.severity,
            affectedPages: toJson(issue.affectedPages),
            affectedCount: issue.affectedPages.length,
            evidence: issue.evidence,
            confidence: issue.confidence,
            source: issue.source ?? "rule",
            sourceQuotes: issue.sourceQuotes ? toJson(issue.sourceQuotes) : undefined,
          },
        })
      )
    );

    // --- Scoring ---
    await setStage(auditId, "scoring", "running");
    const categoryScores = moduleResults.map((m) => scoreModule(m, PHASE_1_WEIGHTS[m.category]));
    const overall = computeOverallScore(categoryScores);

    await db.auditScore.createMany({
      data: categoryScores.map((c) => ({
        auditId,
        category: c.category,
        score: c.score,
        weight: c.weight,
        passedCount: c.passedCount,
        warningCount: c.warningCount,
        criticalCount: c.criticalCount,
        confidence: c.confidence,
        status: c.status,
        notes: c.notes,
      })),
    });
    await db.auditScore.create({
      data: {
        auditId,
        category: "overall",
        score: overall.score,
        weight: 100,
        passedCount: categoryScores.reduce((s, c) => s + c.passedCount, 0),
        warningCount: categoryScores.reduce((s, c) => s + c.warningCount, 0),
        criticalCount: categoryScores.reduce((s, c) => s + c.criticalCount, 0),
        confidence: overall.confidence,
        status: overall.score !== null ? "ok" : "unavailable",
        notes:
          overall.excludedCategories.length > 0
            ? `Excluded from overall score (no data): ${overall.excludedCategories.join(", ")}`
            : null,
      },
    });
    await setStage(auditId, "scoring", "done");

    // --- Recommendations ---
    await setStage(auditId, "recommendations", "running");
    const drafts = buildRecommendations(allIssues, recommendationText, crawl.pages.length);
    const top25 = rankTop25(drafts);

    await db.recommendation.createMany({
      data: drafts.map((d) => {
        const issueDb = createdIssues.find((i) => i.checkId === d.issueCheckId);
        const rankIndex = top25.findIndex((t) => t.issueCheckId === d.issueCheckId);
        return {
          auditId,
          issueId: issueDb?.id ?? null,
          priority: d.priority,
          category: d.category,
          title: d.title,
          evidence: d.evidence,
          recommendedAction: d.recommendedAction,
          businessImpact: d.businessImpact,
          seoImpact: d.seoImpact,
          difficulty: d.difficulty,
          estimatedTime: d.estimatedTime,
          expectedOutcome: d.expectedOutcome,
          isQuickWin: d.isQuickWin,
          compositeScore: d.compositeScore,
          rank: rankIndex >= 0 ? rankIndex + 1 : null,
        };
      }),
    });
    await setStage(auditId, "recommendations", "done");

    const totalPassed = categoryScores.reduce((s, c) => s + c.passedCount, 0);
    const totalWarning = categoryScores.reduce((s, c) => s + c.warningCount, 0);
    const totalCritical = categoryScores.reduce((s, c) => s + c.criticalCount, 0);

    await db.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        currentStage: "done",
        progress: toJson({
          ...(await currentProgress(auditId)),
          issuesFound: allIssues.length,
          passed: totalPassed,
          warnings: totalWarning,
          critical: totalCritical,
        }),
      },
    });
  } catch (err) {
    console.error(`[audit ${auditId}] failed`, err);
    await db.audit
      .update({
        where: { id: auditId },
        data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Unknown error", completedAt: new Date() },
      })
      .catch(() => {});
  }
}

async function currentProgress(auditId: string): Promise<AuditProgress> {
  const audit = await db.audit.findUnique({ where: { id: auditId }, select: { progress: true } });
  return (audit?.progress as AuditProgress | null) ?? initialProgress();
}
