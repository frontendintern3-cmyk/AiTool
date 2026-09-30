import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge } from "@/components/audit/severity-badge";
import { Badge } from "@/components/ui/badge";

export interface ReportIssueRow {
  id: string;
  title: string;
  severity: string;
  evidence: string;
  recommendedAction?: string;
  affectedCount: number;
  source: string;
}

export function IssueTable({ rows, emptyLabel }: { rows: ReportIssueRow[]; emptyLabel?: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm font-medium text-slate-500 shadow-2xs">
        {emptyLabel ?? "No issues detected — every check in this category passed."}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">Check</TableHead>
          <TableHead className="w-[120px]">Severity</TableHead>
          <TableHead className="min-w-[260px]">Finding & Evidence</TableHead>
          <TableHead className="min-w-[220px]">Recommended Fix</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-extrabold text-slate-900 whitespace-nowrap">
              <span>{row.title}</span>
              {row.source === "ai" && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black font-mono uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  AI
                </span>
              )}
            </TableCell>
            <TableCell>
              <SeverityBadge severity={row.severity} />
            </TableCell>
            <TableCell className="text-xs sm:text-sm font-medium text-slate-700 whitespace-normal">
              {row.evidence}
              {row.affectedCount > 1 && (
                <span className="ml-1 text-[11px] font-semibold text-slate-500">
                  ({row.affectedCount} pages)
                </span>
              )}
            </TableCell>
            <TableCell className="text-xs sm:text-sm font-medium text-slate-600 whitespace-normal">
              {row.recommendedAction ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
