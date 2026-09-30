import { CategoryDetail } from "@/components/audit/category-detail";

export default async function OnPageSeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CategoryDetail
      auditId={id}
      category="on_page_seo"
      title="On-Page SEO"
      description="Headings, alt text, internal linking, and content depth for each crawled page."
    />
  );
}
