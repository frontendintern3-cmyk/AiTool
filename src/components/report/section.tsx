export function ReportSection({
  id,
  number,
  title,
  badge,
  children,
}: {
  id: string;
  number: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid gap-4 scroll-mt-14 font-sans">
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
        <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
          {number}
        </span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}
