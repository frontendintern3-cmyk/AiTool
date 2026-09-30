import { CategoryDetail } from "@/components/audit/category-detail";

export default async function SecurityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CategoryDetail
      auditId={id}
      category="security"
      title="Security"
      description="Publicly observable HTTPS, response header, and cookie signals. Not a penetration test."
    />
  );
}
