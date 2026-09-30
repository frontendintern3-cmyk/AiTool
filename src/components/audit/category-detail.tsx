import { db } from "@/lib/db";
import { ScoreCard } from "./score-card";
import { IssueList, type IssueRow } from "./issue-list";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export async function CategoryDetail({
  auditId,
  category,
  title,
  description,
  extra,
}: {
  auditId: string;
  category: string;
  title: string;
  description: string;
  extra?: React.ReactNode;
}) {
  const [score, issues] = await Promise.all([
    db.auditScore.findUnique({ where: { auditId_category: { auditId, category } } }),
    db.auditIssue.findMany({ where: { auditId, category }, include: { recommendations: true } }),
  ]);

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

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">{description}</p>
      </div>

      <div className="max-w-xs">
        <ScoreCard
          title={title}
          score={score?.score ?? null}
          passedCount={score?.passedCount ?? 0}
          warningCount={score?.warningCount ?? 0}
          criticalCount={score?.criticalCount ?? 0}
        />
        {score?.notes && <p className="mt-2 text-xs font-semibold text-slate-500">{score.notes}</p>}
      </div>

      {extra}

      <div>
        <h2 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
          <span>Issues</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50/90 text-blue-600 border border-blue-200/80 shadow-2xs">
            {rows.length}
          </span>
        </h2>
        <IssueList issues={rows} />
      </div>
    </div>
  );
}
