import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { launchBrowser } from "@/lib/browser";
import { buildAuditPptx, fetchLogoDataUri, type PptxIssue } from "@/lib/report/pptx";

async function handleExport(req: NextRequest, auditId: string): Promise<NextResponse | Response> {
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  const audit = await db.audit.findUnique({ where: { id: auditId }, include: { website: true } });
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  if (audit.status !== "COMPLETED") {
    return NextResponse.json({ error: "Audit is not complete yet" }, { status: 409 });
  }

  const slug = (audit.businessName || audit.website.domain).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (format === "pdf") {
    let browser;
    try {
      browser = await launchBrowser();
    } catch {
      return NextResponse.json({ error: "No browser available to render the PDF." }, { status: 503 });
    }
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      const origin = req.nextUrl.origin;
      await page.goto(`${origin}/audit/${auditId}`, { waitUntil: "networkidle", timeout: 30000 });
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" } });
      await context.close();
      return new NextResponse(new Blob([new Uint8Array(pdf)]), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slug}-audit.pdf"`,
        },
      });
    } catch (err) {
      return NextResponse.json({ error: `PDF generation failed: ${err instanceof Error ? err.message : "unknown error"}` }, { status: 500 });
    } finally {
      await browser.close().catch(() => {});
    }
  }

  if (format === "pptx") {
    try {
      const [scores, allIssues, quickWins, topRecommendations, performanceRuns, competitors, screenshots, homepage, counts] = await Promise.all([
        db.auditScore.findMany({ where: { auditId, category: { not: "overall" } } }),
        db.auditIssue.findMany({ where: { auditId }, include: { recommendations: true } }),
        db.recommendation.findMany({ where: { auditId, isQuickWin: true }, orderBy: { compositeScore: "desc" } }),
        db.recommendation.findMany({ where: { auditId }, orderBy: { compositeScore: "desc" }, take: 25 }),
        db.performanceMetric.findMany({ where: { auditId } }),
        db.competitor.findMany({ where: { auditId } }),
        db.screenshot.findMany({ where: { auditId } }),
        db.page.findFirst({ where: { auditId, pageType: "homepage" } }),
        db.audit.findUnique({ where: { id: auditId }, select: { _count: { select: { pages: true, issues: true } } } }),
      ]);

      const overall = await db.auditScore.findFirst({ where: { auditId, category: "overall" } });
      const aiSummary = audit.aiSummary as { status?: string; executiveSummary?: string | null; strengths?: string[] } | null;
      const moduleExtras = audit.moduleExtras as
        | {
            content?: { pageTypeCoverage?: { label: string; found: boolean; pageCount: number }[] };
            ai_visibility?: { llmsTxt?: { found: boolean; path: string | null }; crawlerAccess?: { name: string; allowed: boolean }[] };
            accessibility?: { pagesTested?: number; totalPagesEligible?: number; note?: string };
          }
        | null;
      const siteOrigin = new URL(audit.website.url).origin;
      const siteLogoData = await fetchLogoDataUri(audit.siteLogoUrl, siteOrigin);

      const toIssue = (i: (typeof allIssues)[number]): PptxIssue => ({
        title: i.title,
        severity: i.severity,
        affectedCount: i.affectedCount,
        category: i.category,
        evidence: i.evidence,
        recommendedAction: i.recommendations[0]?.recommendedAction,
        source: i.source,
      });
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const sortIssues = (issues: PptxIssue[]) => [...issues].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

      const issuesByCategory: Record<string, PptxIssue[]> = {};
      for (const issue of allIssues) {
        const mapped = toIssue(issue);
        (issuesByCategory[mapped.category] ??= []).push(mapped);
      }
      for (const key of Object.keys(issuesByCategory)) issuesByCategory[key] = sortIssues(issuesByCategory[key]);

      const criticalIssues = sortIssues(allIssues.filter((i) => i.severity === "critical").map(toIssue));

      const pptxBuffer = await buildAuditPptx({
        siteName: audit.businessName || audit.website.domain,
        siteUrl: audit.website.url,
        industry: audit.industry,
        auditDateLabel: audit.completedAt?.toLocaleDateString() ?? "—",
        overallScore: overall?.score ?? null,
        scores: scores.map((s) => ({ category: s.category, score: s.score })),
        strengths: aiSummary?.strengths ?? [],
        aiExecutiveSummary: aiSummary?.status === "ok" ? aiSummary.executiveSummary ?? null : null,
        criticalIssues,
        quickWins: quickWins.map((r) => ({
          title: r.title,
          priority: r.priority,
          difficulty: r.difficulty,
          estimatedTime: r.estimatedTime,
          isQuickWin: r.isQuickWin,
          compositeScore: r.compositeScore,
        })),
        topRecommendations: topRecommendations.map((r) => ({
          title: r.title,
          priority: r.priority,
          difficulty: r.difficulty,
          estimatedTime: r.estimatedTime,
          isQuickWin: r.isQuickWin,
          compositeScore: r.compositeScore,
        })),
        siteLogoData,
        issuesByCategory,
        performanceRuns: performanceRuns.map((r) => ({
          pageUrl: r.pageUrl,
          strategy: r.strategy,
          status: r.status,
          performanceScore: r.performanceScore,
          lcpMs: r.lcpMs,
          cls: r.cls,
          totalBlockingTimeMs: r.totalBlockingTimeMs,
        })),
        competitors: [
          {
            hostname: `${audit.website.domain} (this site)`,
            title: homepage?.title ?? null,
            wordCount: homepage?.wordCount ?? null,
            https: homepage ? homepage.url.startsWith("https://") : null,
            hasSchema: homepage ? ((homepage.schemaTypes as string[] | null)?.length ?? 0) > 0 : null,
            h1Count: homepage ? (homepage.h1 as string[] | null)?.length ?? null : null,
            responseTimeMs: homepage?.responseTimeMs ?? null,
            isOurSite: true,
          },
          ...competitors.map((c) => ({
            hostname: (() => {
              try {
                return new URL(c.url).hostname;
              } catch {
                return c.url;
              }
            })(),
            title: c.status === "ok" ? c.title : `Data unavailable (${c.errorMessage})`,
            wordCount: c.wordCount,
            https: c.httpsEnabled,
            hasSchema: c.hasSchema,
            h1Count: c.h1Count,
            responseTimeMs: c.responseTimeMs,
          })),
        ],
        pageTypeCoverage: moduleExtras?.content?.pageTypeCoverage ?? [],
        aiVisibility: {
          llmsTxtFound: moduleExtras?.ai_visibility?.llmsTxt?.found ?? false,
          llmsTxtPath: moduleExtras?.ai_visibility?.llmsTxt?.path ?? null,
          crawlerAccess: moduleExtras?.ai_visibility?.crawlerAccess ?? [],
        },
        accessibilityNote: moduleExtras?.accessibility
          ? `Automated scan covered ${moduleExtras.accessibility.pagesTested ?? 0} of ${moduleExtras.accessibility.totalPagesEligible ?? 0} eligible pages. ${moduleExtras.accessibility.note ?? ""}`
          : null,
        screenshotFilePaths: screenshots.map((s) => ({
          label: s.label,
          filePath: path.join(process.cwd(), "public", s.path.replace(/^\//, "")),
        })),
        pagesCrawled: counts?._count.pages ?? 0,
        issuesFound: counts?._count.issues ?? 0,
      });

      return new NextResponse(new Blob([new Uint8Array(pptxBuffer)]), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${slug}-audit.pptx"`,
        },
      });
    } catch (err) {
      return NextResponse.json({ error: `PPTX generation failed: ${err instanceof Error ? err.message : "unknown error"}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unsupported format. Use format=pdf|pptx." }, { status: 400 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleExport(req, id);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleExport(req, id);
}
