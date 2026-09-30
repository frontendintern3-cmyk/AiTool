import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SeverityBadge, ConfidenceBadge } from "./severity-badge";

export interface IssueRow {
  id: string;
  checkId: string;
  title: string;
  description: string;
  whyItMatters: string;
  severity: string;
  affectedCount: number;
  evidence: string;
  confidence: string;
  recommendedAction?: string;
  estimatedTime?: string;
}

export function IssueList({ issues, emptyLabel }: { issues: IssueRow[]; emptyLabel?: string }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm font-medium text-slate-500 shadow-2xs">
        {emptyLabel ?? "No issues detected."}
      </div>
    );
  }

  return (
    <Accordion className="w-full space-y-2.5">
      {issues.map((issue) => (
        <AccordionItem
          key={issue.id}
          value={issue.id}
          className="bg-white border border-slate-200/90 rounded-2xl px-4 py-1 shadow-2xs hover:shadow-md transition-all overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline py-3 cursor-pointer">
            <div className="flex flex-1 flex-wrap items-center gap-2.5 sm:gap-3 text-left">
              <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 shrink-0">
                {issue.checkId}
              </span>
              <SeverityBadge severity={issue.severity} />
              <span className="font-extrabold text-slate-900 text-sm">{issue.title}</span>
              {issue.affectedCount > 0 && (
                <span className="text-[11px] font-semibold text-slate-500 ml-auto mr-2">
                  {issue.affectedCount} page{issue.affectedCount === 1 ? "" : "s"} affected
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <div className="space-y-3 text-sm border-t border-slate-100 pt-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Why it matters</p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700">{issue.whyItMatters}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Evidence</p>
                <p className="mt-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 break-all">
                  {issue.evidence}
                </p>
              </div>
              {issue.recommendedAction && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Recommendation</p>
                  <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700">{issue.recommendedAction}</p>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <ConfidenceBadge confidence={issue.confidence} />
                {issue.estimatedTime && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Est. effort: {issue.estimatedTime}
                  </span>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
