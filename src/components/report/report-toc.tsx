const SECTIONS = [
  { id: "s1", label: "01 Summary" },
  { id: "s2", label: "02 Performance" },
  { id: "s3", label: "03 Technical SEO" },
  { id: "s4", label: "04 AI Visibility" },
  { id: "s5", label: "05 On-Page SEO" },
  { id: "s6", label: "06 Content" },
  { id: "s7", label: "07 CRO" },
  { id: "s8", label: "08 Accessibility" },
  { id: "s9", label: "09 Security" },
  { id: "s10", label: "10 Competitors" },
  { id: "s11", label: "11 Action Plan" },
  { id: "s12", label: "12 Screenshots" },
  { id: "s13", label: "13 Top 25" },
];

export function ReportToc() {
  return (
    <nav className="report-toc sticky top-0 z-10 -mx-8 px-8 py-2 bg-background/95 backdrop-blur border-b overflow-x-auto whitespace-nowrap">
      <div className="flex gap-1">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="font-mono text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground rounded px-2 py-1 shrink-0"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
