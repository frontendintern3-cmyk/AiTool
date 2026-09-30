import Link from "next/link";
import { db } from "@/lib/db";
import { IssueList, type IssueRow } from "@/components/audit/issue-list";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
const CATEGORY_LABELS: Record<string, string> = {
  technical_seo: "Technical SEO",
  on_page_seo: "On-Page SEO",
  content: "Content",
  ai_visibility: "AI Visibility",
  cro: "CRO",
  accessibility: "Accessibility",
  security: "Security",
  performance: "Performance",
};

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; severity?: string }>;
}) {
  const { id } = await params;
  const { category, severity } = await searchParams;

  const issues = await db.auditIssue.findMany({
    where: { auditId: id, ...(category ? { category } : {}), ...(severity ? { severity } : {}) },
    include: { recommendations: true },
  });
  issues.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const rows: IssueRow[] = issues.map((i) => ({
    id: i.id,
    checkId: i.checkId,
    title: i.title,
    description: i.description,
    whyItMatters: i.whyItMatters,
    severity: i.severity,
    affectedCount: i.affectedCount,
    evidence: i.evidence,
    confidence: i.confidence,
    recommendedAction: i.recommendations[0]?.recommendedAction,
    estimatedTime: i.recommendations[0]?.estimatedTime,
  }));

  const allIssues = await db.auditIssue.findMany({ where: { auditId: id }, select: { category: true, severity: true } });
  const categoryCounts = countBy(allIssues, "category");
  const severityCounts = countBy(allIssues, "severity");

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">All Issues</h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">{allIssues.length} issues detected across every audited category.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href={`/audit/${id}/issues`} active={!category && !severity} label={`All (${allIssues.length})`} />
        {Object.entries(severityCounts).map(([sev, count]) => (
          <FilterChip
            key={sev}
            href={`/audit/${id}/issues?severity=${sev}${category ? `&category=${category}` : ""}`}
            active={severity === sev}
            label={`${sev} (${count})`}
            capitalize
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <FilterChip
            key={cat}
            href={`/audit/${id}/issues?category=${cat}${severity ? `&severity=${severity}` : ""}`}
            active={category === cat}
            label={`${CATEGORY_LABELS[cat] ?? cat} (${count})`}
          />
        ))}
      </div>

      <IssueList issues={rows} emptyLabel="No issues match this filter." />
    </div>
  );
}

function FilterChip({ href, active, label, capitalize }: { href: string; active: boolean; label: string; capitalize?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer",
        active
          ? "font-extrabold bg-blue-50/90 text-blue-600 border border-blue-200/80 shadow-2xs"
          : "font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 border border-transparent",
        capitalize && "capitalize"
      )}
    >
      {label}
    </Link>
  );
}

function countBy<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = String(item[key]);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
