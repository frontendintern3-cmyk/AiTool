import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";

export interface RecommendationRow {
  id: string;
  rank: number | null;
  priority: string;
  category: string;
  title: string;
  recommendedAction: string;
  businessImpact: string;
  seoImpact: string;
  difficulty: string;
  estimatedTime: string;
  expectedOutcome: string;
  isQuickWin: boolean;
}

const PRIORITY_TONE: Record<string, StatusPillTone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

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

export function RecommendationsTable({ rows, showRank }: { rows: RecommendationRow[]; showRank?: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm font-medium text-slate-500 shadow-2xs">
        No recommendations in this view.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showRank && <TableHead className="w-12">#</TableHead>}
          <TableHead className="min-w-[220px]">Recommendation</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead>Est. Time</TableHead>
          <TableHead className="min-w-[220px]">Business Impact</TableHead>
          <TableHead className="min-w-[220px]">Expected Outcome</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            {showRank && (
              <TableCell>
                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {r.rank}
                </span>
              </TableCell>
            )}
            <TableCell className="max-w-xs">
              <div className="font-extrabold text-slate-900">{r.title}</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">{r.recommendedAction}</div>
              {r.isQuickWin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-tight uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  ⚡ Quick Win
                </span>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-700">
              {CATEGORY_LABELS[r.category] ?? r.category}
            </TableCell>
            <TableCell>
              <StatusPill
                tone={PRIORITY_TONE[r.priority] ?? "neutral"}
                label={r.priority.toUpperCase()}
                size="xs"
              />
            </TableCell>
            <TableCell className="capitalize text-xs sm:text-sm font-semibold text-slate-700">{r.difficulty}</TableCell>
            <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-slate-600">{r.estimatedTime}</TableCell>
            <TableCell className="text-xs sm:text-sm font-medium text-slate-600">{r.businessImpact}</TableCell>
            <TableCell className="text-xs sm:text-sm font-medium text-slate-600">{r.expectedOutcome}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
