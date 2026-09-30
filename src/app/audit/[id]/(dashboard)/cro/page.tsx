import { CategoryDetail } from "@/components/audit/category-detail";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function CroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CategoryDetail
      auditId={id}
      category="cro"
      title="Conversion Rate Optimization (CRO)"
      description="CTA presence, forms, trust signals, and messaging widgets detected from static HTML."
      extra={
        <Alert>
          <AlertDescription>
            These reflect potential improvement opportunities, not a measured conversion rate — never a promised lift. Sticky CTA
            behavior, exit-intent popups, and live chat availability at runtime aren&apos;t observable from a crawl.
          </AlertDescription>
        </Alert>
      }
    />
  );
}
