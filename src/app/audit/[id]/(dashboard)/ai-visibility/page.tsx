import { db } from "@/lib/db";
import { CategoryDetail } from "@/components/audit/category-detail";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AiVisibilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await db.audit.findUnique({ where: { id }, select: { moduleExtras: true } });
  const extras = (
    audit?.moduleExtras as
      | { ai_visibility?: { llmsTxt?: { found: boolean; path: string | null }; crawlerAccess?: { name: string; allowed: boolean }[] } }
      | null
  )?.ai_visibility;

  return (
    <CategoryDetail
      auditId={id}
      category="ai_visibility"
      title="AI Visibility (GEO / AEO)"
      description="AI crawlability, structured data for answer engines, and answer-ready content formatting. Allowing a crawler is not evidence of citation or visibility — only of access."
      extra={
        extras ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-md border p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">llms.txt</h3>
              <Badge variant={extras.llmsTxt?.found ? "default" : "secondary"}>
                {extras.llmsTxt?.found ? `Found at ${extras.llmsTxt.path}` : "llms.txt not detected"}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                An emerging, unofficial convention — not a confirmed ranking or citation factor.
              </p>
            </div>
            <div className="rounded-md border p-4 md:col-span-1">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">AI Crawler Access (robots.txt)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crawler</TableHead>
                    <TableHead>Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extras.crawlerAccess?.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="text-sm">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={c.allowed ? "default" : "destructive"}>{c.allowed ? "Allowed" : "Blocked"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
