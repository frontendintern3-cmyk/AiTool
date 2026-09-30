import { CategoryDetail } from "@/components/audit/category-detail";

export default async function TechnicalSeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CategoryDetail
      auditId={id}
      category="technical_seo"
      title="Technical SEO"
      description="Crawlability, indexability, and on-site technical health, measured directly from the crawl."
    />
  );
}
