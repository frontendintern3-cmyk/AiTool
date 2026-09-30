import { db } from "@/lib/db";
import { CategoryDetail } from "@/components/audit/category-detail";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PageTypeCoverageRow } from "@/lib/audit/content";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await db.audit.findUnique({ where: { id }, select: { moduleExtras: true } });
  const extras = (audit?.moduleExtras as Record<string, { pageTypeCoverage?: PageTypeCoverageRow[] }> | null)?.content;
  const coverage = extras?.pageTypeCoverage ?? [];

  return (
    <CategoryDetail
      auditId={id}
      category="content"
      title="Content"
      description="Industry-expected page types, structured data coverage, and content depth signals."
      extra={
        coverage.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Content Opportunity Matrix</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expected Page Type</TableHead>
                  <TableHead>Our Coverage</TableHead>
                  <TableHead>Pages Found</TableHead>
                  <TableHead>Competitor Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverage.map((row) => (
                  <TableRow key={row.pageType}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      <Badge variant={row.found ? "default" : "destructive"}>{row.found ? "Found" : "Missing"}</Badge>
                    </TableCell>
                    <TableCell>{row.pageCount}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{row.competitorCoverage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : undefined
      }
    />
  );
}
