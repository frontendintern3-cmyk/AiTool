import { db } from "@/lib/db";
import { CategoryDetail } from "@/components/audit/category-detail";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function AccessibilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await db.audit.findUnique({ where: { id }, select: { moduleExtras: true } });
  const extras = (audit?.moduleExtras as Record<string, { pagesTested?: number; totalPagesEligible?: number; note?: string }> | null)?.accessibility;

  return (
    <CategoryDetail
      auditId={id}
      category="accessibility"
      title="Accessibility"
      description="Automated WCAG-related checks via axe-core against a representative sample of pages."
      extra={
        extras ? (
          <Alert>
            <AlertDescription>
              Automated scan covered {extras.pagesTested ?? 0} of {extras.totalPagesEligible ?? 0} eligible pages.{" "}
              {extras.note}
            </AlertDescription>
          </Alert>
        ) : undefined
      }
    />
  );
}
