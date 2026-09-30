import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { SidebarNav } from "@/components/audit/sidebar-nav";

export default async function AuditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await db.audit.findUnique({ where: { id }, include: { website: true } });

  if (!audit) notFound();
  if (audit.status !== "COMPLETED") redirect(`/audit/${id}/progress`);

  return (
    <div className="flex-1 flex min-h-0 bg-slate-50/70 font-sans">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-[#165bf6] hover:text-[#1d4ed8] transition-colors">
            ← New audit
          </Link>
          <div className="mt-2 font-black text-slate-900 truncate tracking-tight text-sm" title={audit.website.domain}>
            {audit.businessName || audit.website.domain}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">{audit.industry}</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <SidebarNav auditId={id} />
        </div>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
        <div className="report-scroll-container max-w-6xl mx-auto px-6 py-6 sm:px-8 sm:py-8 space-y-6">{children}</div>
      </div>
    </div>
  );
}
