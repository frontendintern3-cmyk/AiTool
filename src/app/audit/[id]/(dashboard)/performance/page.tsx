import { db } from "@/lib/db";
import { CategoryDetail } from "@/components/audit/category-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function cwvStatus(metric: "lcp" | "cls" | "tbt", value: number | null): "Good" | "Needs Improvement" | "Poor" | "Data unavailable" {
  if (value === null) return "Data unavailable";
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    cls: [0.1, 0.25],
    tbt: [200, 600],
  };
  const [good, poor] = thresholds[metric];
  if (value <= good) return "Good";
  if (value <= poor) return "Needs Improvement";
  return "Poor";
}

function statusColor(status: string) {
  if (status === "Good") return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400";
  if (status === "Needs Improvement") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400";
  if (status === "Poor") return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400";
  return "bg-muted text-muted-foreground border-transparent";
}

export default async function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runs = await db.performanceMetric.findMany({ where: { auditId: id }, orderBy: { pageUrl: "asc" } });

  return (
    <CategoryDetail
      auditId={id}
      category="performance"
      title="Performance"
      description="Core Web Vitals and Lighthouse performance runs, measured locally against the live site (mobile + desktop)."
      extra={
        <div className="space-y-4">
          {runs.length === 0 && <p className="text-sm text-muted-foreground">Data unavailable — no Lighthouse runs completed.</p>}
          {runs.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate">{r.pageUrl}</span>
                  <Badge variant="outline" className="capitalize shrink-0 ml-2">
                    {r.strategy}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {r.status !== "ok" ? (
                  <p className="text-sm text-muted-foreground">Data unavailable: {r.errorMessage}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="text-2xl font-semibold tabular-nums">
                      {r.performanceScore}
                      <span className="text-sm text-muted-foreground">/100 Lighthouse Performance</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <MetricRow label="LCP" value={r.lcpMs} unit="ms" status={cwvStatus("lcp", r.lcpMs)} />
                        <MetricRow label="CLS" value={r.cls} unit="" status={cwvStatus("cls", r.cls)} decimals={3} />
                        <MetricRow label="TBT" value={r.totalBlockingTimeMs} unit="ms" status={cwvStatus("tbt", r.totalBlockingTimeMs)} />
                        <MetricRow label="FCP" value={r.fcpMs} unit="ms" status="Data unavailable" hideStatus />
                        <MetricRow label="TTFB" value={r.ttfbMs} unit="ms" status="Data unavailable" hideStatus />
                        <MetricRow label="Speed Index" value={r.speedIndexMs} unit="ms" status="Data unavailable" hideStatus />
                        <MetricRow label="INP" value={r.inpMs} unit="ms" status="Data unavailable" hideStatus note="Lab-based INP is limited without real interaction data" />
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      }
    />
  );
}

function MetricRow({
  label,
  value,
  unit,
  status,
  hideStatus,
  decimals = 0,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  status: string;
  hideStatus?: boolean;
  decimals?: number;
  note?: string;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>{value === null ? "Data unavailable" : `${value.toFixed(decimals)}${unit}`}</TableCell>
      <TableCell>
        {!hideStatus && value !== null ? (
          <Badge variant="outline" className={statusColor(status)}>
            {status}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{note ?? "—"}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
