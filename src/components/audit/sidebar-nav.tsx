"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Gauge,
  Search,
  FileText,
  BookOpen,
  Accessibility,
  ShieldCheck,
  AlertCircle,
  ListChecks,
  Sparkles,
  Target,
  Download,
} from "lucide-react";

const PHASE_1_LINKS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/performance", label: "Performance", icon: Gauge },
  { href: "/technical-seo", label: "Technical SEO", icon: Search },
  { href: "/on-page-seo", label: "On-Page SEO", icon: FileText },
  { href: "/content", label: "Content", icon: BookOpen },
  { href: "/ai-visibility", label: "AI Visibility / GEO", icon: Sparkles },
  { href: "/cro", label: "CRO", icon: Target },
  { href: "/accessibility", label: "Accessibility", icon: Accessibility },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/issues", label: "Issues", icon: AlertCircle },
  { href: "/recommendations", label: "Recommendations", icon: ListChecks },
];

export function SidebarNav({ auditId }: { auditId: string }) {
  const pathname = usePathname();
  const base = `/audit/${auditId}`;

  return (
    <nav className="flex flex-col gap-1 p-2.5">
      {PHASE_1_LINKS.map((link) => {
        const href = `${base}${link.href}`;
        const active = pathname === href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm transition-all",
              active
                ? "bg-blue-50/90 text-blue-600 border border-blue-200/80 font-extrabold shadow-2xs"
                : "text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-900 border border-transparent"
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-[#165bf6]" : "text-slate-400")} />
            {link.label}
          </Link>
        );
      })}

      <div className="mt-4 mb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Export</div>
      {([
        { format: "pdf", label: "PDF Report" },
        { format: "pptx", label: "PowerPoint Deck" },
      ] as const).map(({ format, label }) => (
        <a
          key={format}
          href={`/api/audits/${auditId}/export?format=${format}`}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent transition-all"
        >
          <Download className="size-4 shrink-0 text-slate-400" />
          {label}
        </a>
      ))}
    </nav>
  );
}
