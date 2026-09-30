"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, CircleDashed, AlertTriangle } from "lucide-react";
import { STAGE_ORDER, type AuditProgress, type Stage } from "@/lib/audit/types";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<Stage, string> = {
  discovery: "Website Discovery",
  crawling: "Crawling Website",
  technical_seo: "Technical SEO",
  performance: "Performance Analysis",
  on_page_seo: "On-Page SEO",
  content: "Content Analysis",
  ai_analysis: "AI Content Analysis",
  ai_visibility: "AI Visibility / GEO",
  cro: "Conversion (CRO)",
  accessibility: "Accessibility",
  security: "Security",
  screenshots: "Capturing Screenshots",
  competitors: "Competitor Analysis",
  scoring: "Scoring",
  recommendations: "Generating Recommendations",
};

interface StatusResponse {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  currentStage: string | null;
  progress: AuditProgress | null;
  errorMessage: string | null;
}

export default function AuditProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/audits/${id}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        if (cancelled) return;
        setStatus(data);

        if (data.status === "COMPLETED") {
          router.push(`/audit/${id}`);
          return;
        }
      } finally {
        if (!cancelled) timer = setTimeout(poll, 1500);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, router]);

  const progress = status?.progress;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 font-sans">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50/90 text-blue-600 border border-blue-200/80 mb-3 shadow-2xs">
            Live Audit Pipeline
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Running your audit</h1>
          <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-500">
            This crawls the live site and runs real checks — usually a couple of minutes depending on site size.
          </p>
        </div>

        {status?.status === "FAILED" && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-2xs">
            <AlertTriangle className="size-5 mt-0.5 shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">The audit failed to complete.</p>
              <p className="mt-1 text-xs text-rose-600">{status.errorMessage ?? "An unexpected error occurred."}</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <ol className="space-y-1.5">
            {STAGE_ORDER.map((stage) => {
              const state = progress?.stages?.[stage] ?? "pending";
              return (
                <li
                  key={stage}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm transition-all",
                    state === "running" && "border-blue-200 bg-blue-50/70 text-blue-900 font-bold shadow-2xs",
                    state === "done" && "border-slate-100 bg-slate-50/60 text-slate-800 font-medium",
                    state === "pending" && "border-transparent bg-transparent text-slate-400 font-normal",
                    state === "failed" && "border-rose-200 bg-rose-50/60 text-rose-800 font-semibold"
                  )}
                >
                  {state === "done" && <Check className="size-4 text-emerald-600 shrink-0 stroke-[2.5]" />}
                  {state === "running" && <Loader2 className="size-4 animate-spin shrink-0 text-blue-600" />}
                  {state === "pending" && <CircleDashed className="size-4 text-slate-300 shrink-0" />}
                  {state === "failed" && <AlertTriangle className="size-4 text-rose-500 shrink-0" />}
                  <span className={cn(state === "pending" && "text-slate-400")}>{STAGE_LABELS[stage]}</span>
                  {state === "done" && (
                    <span className="ml-auto text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Done
                    </span>
                  )}
                  {state === "running" && (
                    <span className="ml-auto text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                      In Progress
                    </span>
                  )}
                  {state === "failed" && <span className="ml-auto text-xs text-rose-600 font-semibold">Unable to verify</span>}
                </li>
              );
            })}
          </ol>
        </div>

        {progress && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Discovered" value={progress.pagesDiscovered} />
            <Stat label="Crawled" value={progress.pagesCrawled} />
            <Stat label="Issues" value={progress.issuesFound} />
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 py-3 px-2 shadow-2xs">
      <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
