import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function barColor(score: number | null) {
  if (score === null) return "bg-slate-200";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export interface ScoreCardProps {
  title: string;
  score: number | null;
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  href?: string;
  compact?: boolean;
}

export function ScoreCard({ title, score, passedCount, warningCount, criticalCount, compact }: ScoreCardProps) {
  return (
    <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all">
      <CardContent className={cn("space-y-2.5", compact ? "p-3.5" : "p-4 sm:p-5")}>
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{title}</div>
        {score === null ? (
          <div className="text-xs font-semibold text-slate-400 py-2">Data unavailable</div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-3xl font-black font-mono tracking-tight tabular-nums", scoreColor(score))}>
                {score}
              </span>
              <span className="text-xs font-bold text-slate-400">/100</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", barColor(score))} style={{ width: `${score}%` }} />
            </div>
            <div className="flex gap-2.5 text-[11px] font-semibold pt-1">
              <span className="text-emerald-600">{passedCount} Passed</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-600">{warningCount} Warnings</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600">{criticalCount} Critical</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
