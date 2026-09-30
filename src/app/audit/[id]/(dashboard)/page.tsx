import { db } from "@/lib/db";
import { RingScore, GradeStamp } from "@/components/report/ring-score";
import { ReportSection } from "@/components/report/section";
import { ReportToc } from "@/components/report/report-toc";
import { IssueTable, type ReportIssueRow } from "@/components/report/issue-table";
import { FrequencyBars } from "@/components/report/frequency-bars";
import { RecommendationsTable, type RecommendationRow } from "@/components/audit/recommendations-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildRoadmap } from "@/lib/report/roadmap";
import type { PageTypeCoverageRow } from "@/lib/audit/content";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  technical_seo: "Technical SEO",
  performance: "Performance",
  on_page_seo: "On-Page SEO",
  content: "Content",
  ai_visibility: "AI Visibility",
  cro: "CRO",
  accessibility: "Accessibility",
  security: "Security",
};

function cwvStatus(kind: "lcp" | "cls" | "tbt", value: number | null): string {
  if (value === null) return "Data unavailable";
  const thresholds: Record<string, [number, number]> = { lcp: [2500, 4000], cls: [0.1, 0.25], tbt: [200, 600] };
  const [good, poor] = thresholds[kind];
  if (value <= good) return "Good";
  if (value <= poor) return "Needs Improvement";
  return "Poor";
}

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [audit, scores, allIssues, allRecommendations, performanceRuns, screenshots, competitors, homepage] = await Promise.all([
    db.audit.findUnique({ where: { id }, include: { website: true, _count: { select: { pages: true, issues: true } } } }),
    db.auditScore.findMany({ where: { auditId: id } }),
    db.auditIssue.findMany({ where: { auditId: id }, include: { recommendations: true } }),
    db.recommendation.findMany({ where: { auditId: id } }),
    db.performanceMetric.findMany({ where: { auditId: id } }),
    db.screenshot.findMany({ where: { auditId: id } }),
    db.competitor.findMany({ where: { auditId: id } }),
    db.page.findFirst({ where: { auditId: id, pageType: "homepage" } }),
  ]);

  if (!audit) return null;

  const overall = scores.find((s) => s.category === "overall") ?? null;
  const categoryScore = (cat: string) => scores.find((s) => s.category === cat) ?? null;

  const issuesByCategory = (cat: string) =>
    allIssues
      .filter((i) => i.category === cat)
      .sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity as "critical" | "warning" | "info"] - { critical: 0, warning: 1, info: 2 }[b.severity as "critical" | "warning" | "info"]));

  const toRows = (issues: typeof allIssues): ReportIssueRow[] =>
    issues.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      evidence: i.evidence,
      recommendedAction: i.recommendations[0]?.recommendedAction,
      affectedCount: i.affectedCount,
      source: i.source,
    }));

  const technicalIssues = issuesByCategory("technical_seo");
  const onPageIssues = issuesByCategory("on_page_seo");
  const contentIssues = issuesByCategory("content").filter((i) => i.source !== "ai");
  const aiIssues = allIssues.filter((i) => i.source === "ai" && i.checkId !== "ai-trust-assessment");
  const trustAssessment = allIssues.find((i) => i.checkId === "ai-trust-assessment");
  const accessibilityIssues = issuesByCategory("accessibility");
  const securityIssues = issuesByCategory("security");
  const criticalIssues = allIssues.filter((i) => i.severity === "critical");
  const quickWins = allRecommendations.filter((r) => r.isQuickWin).sort((a, b) => b.compositeScore - a.compositeScore);

  const aiSummary = audit.aiSummary as
    | { status: "ok" | "unavailable"; executiveSummary: string | null; strengths: string[]; errorMessage?: string }
    | null;

  const moduleExtras = audit.moduleExtras as
    | {
        content?: { pageTypeCoverage?: PageTypeCoverageRow[] };
        accessibility?: { pagesTested?: number; totalPagesEligible?: number; note?: string };
        ai_visibility?: { llmsTxt?: { found: boolean; path: string | null }; crawlerAccess?: { name: string; allowed: boolean }[] };
      }
    | null;
  const pageTypeCoverage = moduleExtras?.content?.pageTypeCoverage ?? [];
  const accessibilityExtra = moduleExtras?.accessibility;
  const aiVisibilityExtra = moduleExtras?.ai_visibility;
  const aiVisibilityIssues = issuesByCategory("ai_visibility");

  const technicalFrequency = [...technicalIssues]
    .sort((a, b) => b.affectedCount - a.affectedCount)
    .slice(0, 8)
    .map((i) => ({ label: i.title, count: i.affectedCount }));

  const roadmap = buildRoadmap(allRecommendations);

  const top25 = allRecommendations
    .filter((r) => r.rank !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const toRecRow = (r: (typeof allRecommendations)[number]): RecommendationRow => ({
    id: r.id,
    rank: r.rank,
    priority: r.priority,
    category: r.category,
    title: r.title,
    recommendedAction: r.recommendedAction,
    businessImpact: r.businessImpact,
    seoImpact: r.seoImpact,
    difficulty: r.difficulty,
    estimatedTime: r.estimatedTime,
    expectedOutcome: r.expectedOutcome,
    isQuickWin: r.isQuickWin,
  });

  return (
    <div className="space-y-10 pb-16 font-sans">
      {/* Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <span className="font-mono text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            WALRUS AI Visibility · Full Report
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
            {audit.businessName || audit.website.domain}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-2 max-w-2xl">
            Technical SEO, performance, content, accessibility, and security review, measured directly from a live crawl.
          </p>
          <div className="flex flex-wrap gap-2 mt-3.5 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
              <span className="text-slate-400 font-normal">Audit date:</span> {audit.completedAt?.toLocaleDateString() ?? "—"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
              <span className="text-slate-400 font-normal">Industry:</span> {audit.industry}
            </span>
            {audit.targetCountry && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                <span className="text-slate-400 font-normal">Market:</span> {audit.targetCountry}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs font-mono">
              {audit.website.url}
            </span>
          </div>
        </div>
        <GradeStamp score={overall?.score ?? null} />
      </div>

      <ReportToc />

      <Alert className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-2xs text-slate-700">
        <AlertDescription className="text-xs font-medium leading-relaxed text-slate-700">
          <b className="font-extrabold text-slate-900">How this was measured.</b> A same-origin crawl of up to 40 pages, robots.txt/sitemap/llms.txt discovery, local Lighthouse
          runs (mobile + desktop) via a real Chromium browser, automated axe-core accessibility scans, publicly observable security
          headers, real homepage screenshots, and (for any competitor URLs supplied) a homepage-only fetch of each — every number
          below traces back to one of those. {aiSummary?.status === "ok" ? (
            <>Content findings tagged <span className="font-mono text-[9px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase align-middle">AI analysis</span> come from
            an LLM reading the crawled page text and are only reported when the exact quote is verified against that page&apos;s real
            content — they are interpretation, not measurement.</>
          ) : (
            <>The AI analysis layer (executive summary + cross-page fact-consistency checks) did not run this time — {aiSummary?.errorMessage ?? "no ANTHROPIC_API_KEY configured"}.</>
          )} Automatic competitor discovery, Search Console, GA4, and backlink data require Phase 3 integrations and aren&apos;t
          guessed at here.
        </AlertDescription>
      </Alert>

      {/* 01 Executive Summary */}
      <ReportSection id="s1" number="01" title="Executive Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["technical_seo", "performance", "on_page_seo", "content", "ai_visibility", "cro", "accessibility", "security"].map((cat) => {
            const s = categoryScore(cat);
            return (
              <Card key={cat} className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all">
                <CardContent className="p-4 flex flex-col items-center gap-2.5 text-center">
                  <RingScore score={s?.score ?? null} size={64} />
                  <div className="text-xs font-extrabold text-slate-800">{CATEGORY_LABELS[cat]}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-3">
          <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-black text-sm text-slate-900 tracking-tight">Executive Summary</h3>
              {aiSummary?.status === "ok" && aiSummary.executiveSummary ? (
                <>
                  <p className="text-sm text-muted-foreground">{aiSummary.executiveSummary}</p>
                  {aiSummary.strengths.length > 0 && (
                    <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                      {aiSummary.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> to get an AI-written executive summary and
                  strengths list here. In the meantime, see the verified critical issues and quick wins below.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-medium text-sm">Critical Issues</h3>
              {criticalIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No critical issues detected.</p>
              ) : (
                <ul className="space-y-2">
                  {criticalIssues.slice(0, 6).map((issue) => (
                    <li key={issue.id} className="text-sm">
                      <span className="font-medium">{issue.title}</span>{" "}
                      <span className="text-muted-foreground text-xs">({issue.affectedCount} page(s))</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </ReportSection>

      {/* 02 Performance */}
      <ReportSection id="s2" number="02" title="Performance">
        {performanceRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Data unavailable — no Lighthouse runs completed.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {performanceRuns.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{r.pageUrl}</span>
                    <Badge variant="outline" className="capitalize">
                      {r.strategy}
                    </Badge>
                  </div>
                  {r.status !== "ok" ? (
                    <p className="text-sm text-muted-foreground">Data unavailable: {r.errorMessage}</p>
                  ) : (
                    <>
                      <div className="text-2xl font-semibold tabular-nums">
                        {r.performanceScore}
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <Metric label="LCP" value={r.lcpMs} unit="ms" status={cwvStatus("lcp", r.lcpMs)} />
                        <Metric label="CLS" value={r.cls} unit="" status={cwvStatus("cls", r.cls)} decimals={3} />
                        <Metric label="TBT" value={r.totalBlockingTimeMs} unit="ms" status={cwvStatus("tbt", r.totalBlockingTimeMs)} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ReportSection>

      {/* 03 Technical SEO */}
      <ReportSection id="s3" number="03" title="Technical SEO">
        {technicalFrequency.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Most common issues (by pages affected)</h3>
              <FrequencyBars rows={technicalFrequency} total={audit._count.pages} />
            </CardContent>
          </Card>
        )}
        <IssueTable rows={toRows(technicalIssues)} />
      </ReportSection>

      {/* 04 AI Visibility */}
      <ReportSection id="s4" number="04" title="AI Visibility (GEO / AEO)">
        <p className="text-xs text-muted-foreground">
          This audit does not claim visibility in ChatGPT/Gemini/Perplexity/Claude without direct platform evidence — that requires
          a monitoring integration, not a crawl. What follows is crawlability, structured data, and content-formatting signals only.
        </p>
        {aiVisibilityExtra && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">llms.txt</h3>
                <Badge variant={aiVisibilityExtra.llmsTxt?.found ? "default" : "secondary"}>
                  {aiVisibilityExtra.llmsTxt?.found ? `Found at ${aiVisibilityExtra.llmsTxt.path}` : "Not detected"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">AI Crawler Access</h3>
                <div className="flex flex-wrap gap-1.5">
                  {aiVisibilityExtra.crawlerAccess?.map((c) => (
                    <Badge key={c.name} variant={c.allowed ? "outline" : "destructive"} className="text-[10px]">
                      {c.name.split(" (")[0]}: {c.allowed ? "Allowed" : "Blocked"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <IssueTable rows={toRows(aiVisibilityIssues)} />
      </ReportSection>

      {/* 05 On-Page SEO */}
      <ReportSection id="s5" number="05" title="On-Page SEO">
        <IssueTable rows={toRows(onPageIssues)} />
      </ReportSection>

      {/* 06 Content (incl. AI analysis) */}
      <ReportSection id="s6" number="06" title="Content">
        {pageTypeCoverage.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Content Opportunity Matrix</h3>
              <div className="grid gap-2">
                {pageTypeCoverage.map((row) => (
                  <div key={row.pageType} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                    <span>{row.label}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant={row.found ? "default" : "destructive"}>{row.found ? "Found" : "Missing"}</Badge>
                      <span className="text-xs text-muted-foreground w-24 text-right">{row.competitorCoverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {trustAssessment && (
          <Alert>
            <Sparkles className="size-4" />
            <AlertDescription>
              <b>AI trust &amp; E-E-A-T assessment.</b> {trustAssessment.evidence}
            </AlertDescription>
          </Alert>
        )}

        {aiIssues.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">AI-identified findings (quote-verified)</h3>
            <IssueTable rows={toRows(aiIssues)} />
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Rule-based content checks</h3>
          <IssueTable rows={toRows(contentIssues)} />
        </div>
      </ReportSection>

      {/* 07 CRO */}
      <ReportSection id="s7" number="07" title="Conversion Rate Optimization (CRO)">
        <p className="text-xs text-muted-foreground">
          These reflect potential improvement opportunities from static analysis — not a measured conversion rate, and never a
          promised lift. Sticky CTA behavior, exit-intent popups, and live chat availability at runtime aren't observable from a
          crawl.
        </p>
        <IssueTable rows={toRows(issuesByCategory("cro"))} />
      </ReportSection>

      {/* 08 Accessibility */}
      <ReportSection id="s8" number="08" title="Accessibility">
        {accessibilityExtra && (
          <Alert>
            <AlertDescription>
              Automated scan covered {accessibilityExtra.pagesTested ?? 0} of {accessibilityExtra.totalPagesEligible ?? 0} eligible
              pages. {accessibilityExtra.note}
            </AlertDescription>
          </Alert>
        )}
        <IssueTable rows={toRows(accessibilityIssues)} />
      </ReportSection>

      {/* 09 Security */}
      <ReportSection id="s9" number="09" title="Security">
        <IssueTable rows={toRows(securityIssues)} />
      </ReportSection>

      {/* 10 Competitors */}
      <ReportSection id="s10" number="10" title="Competitors">
        <p className="text-xs text-muted-foreground">
          Homepage-only comparison for manually-supplied competitor URLs. Automatic competitor discovery and full-site benchmarking
          ship in Phase 3 — nothing below is guessed.
        </p>
        {competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No competitor URLs were provided for this audit.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Word Count</TableHead>
                  <TableHead>HTTPS</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>H1 Count</TableHead>
                  <TableHead>Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40">
                  <TableCell className="font-medium">{audit.website.domain} (this site)</TableCell>
                  <TableCell className="text-sm">{homepage?.title ?? "N/A"}</TableCell>
                  <TableCell>{homepage?.wordCount ?? "N/A"}</TableCell>
                  <TableCell>{homepage ? (homepage.url.startsWith("https://") ? "Yes" : "No") : "N/A"}</TableCell>
                  <TableCell>{homepage ? ((homepage.schemaTypes as string[])?.length > 0 ? "Yes" : "No") : "N/A"}</TableCell>
                  <TableCell>{homepage ? (homepage.h1 as string[])?.length : "N/A"}</TableCell>
                  <TableCell>{homepage?.responseTimeMs ? `${homepage.responseTimeMs}ms` : "N/A"}</TableCell>
                </TableRow>
                {competitors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{new URL(c.url).hostname}</TableCell>
                    <TableCell className="text-sm">{c.status === "ok" ? c.title ?? "N/A" : `Data unavailable (${c.errorMessage})`}</TableCell>
                    <TableCell>{c.wordCount ?? "N/A"}</TableCell>
                    <TableCell>{c.httpsEnabled === null ? "N/A" : c.httpsEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell>{c.hasSchema === null ? "N/A" : c.hasSchema ? "Yes" : "No"}</TableCell>
                    <TableCell>{c.h1Count ?? "N/A"}</TableCell>
                    <TableCell>{c.responseTimeMs ? `${c.responseTimeMs}ms` : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportSection>

      {/* 11 Action Plan / Roadmap */}
      <ReportSection id="s11" number="11" title="Action Plan &amp; 30/60/90 Roadmap">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Quick Wins</h3>
              {quickWins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low-effort/high-impact fixes identified.</p>
              ) : (
                <ul className="space-y-1.5">
                  {quickWins.slice(0, 8).map((r) => (
                    <li key={r.id} className="text-sm flex justify-between gap-2">
                      <span>{r.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{r.estimatedTime}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {roadmap.map((bucket) => (
            <Card key={bucket.window} className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
              <CardContent className="p-4 space-y-2">
                <div className="text-base font-black text-[#165bf6]">{bucket.window}</div>
                <div className="text-[11px] font-semibold text-slate-500 mb-2">{bucket.label}</div>
                {bucket.items.length === 0 ? (
                  <p className="text-xs font-medium text-slate-400">Nothing in this window.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs sm:text-sm font-medium text-slate-700">
                    {bucket.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-1.5">
                        <span className="text-blue-500 font-bold shrink-0">•</span>
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ReportSection>

      {/* 12 Screenshots */}
      <ReportSection id="s12" number="12" title="Screenshots">
        {screenshots.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">Data unavailable — no screenshots could be captured for this audit.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {screenshots.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.path} alt={s.label} className="w-full h-auto block" />
                <div className="px-3.5 py-2 text-xs font-semibold text-slate-600 border-t border-slate-100 bg-slate-50/50">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      {/* 13 Top 25 Recommendations */}
      <ReportSection id="s13" number="13" title="Top 25 Recommendations">
        <RecommendationsTable rows={top25.map(toRecRow)} showRank />
      </ReportSection>

      <div className="border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500">
        Generated by the audit engine on {audit.completedAt?.toLocaleString() ?? "—"}. {audit._count.pages} pages crawled,{" "}
        {audit._count.issues} issues detected across {scores.filter((s) => s.category !== "overall" && s.score !== null).length} scored
        categories.
      </div>
    </div>
  );
}

function Metric({ label, value, unit, status, decimals = 0 }: { label: string; value: number | null; unit: string; status: string; decimals?: number }) {
  const statusColor =
    status === "Good"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "Needs Improvement"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : status === "Poor"
      ? "text-rose-600 bg-rose-50 border-rose-200"
      : "text-slate-500 bg-slate-100 border-slate-200";

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-mono text-base font-black text-slate-900 tabular-nums mt-0.5">
        {value === null ? "—" : `${value.toFixed(decimals)}${unit}`}
      </div>
      <div className={cn("inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-tight", statusColor)}>
        {status}
      </div>
    </div>
  );
}
