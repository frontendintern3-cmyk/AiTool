export function FrequencyBars({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="grid gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1">
          <div className="flex items-center justify-between text-xs">
            <span>{row.label}</span>
            <span className="font-mono tabular-nums">
              {row.count}
              {total > 0 && <span className="text-muted-foreground">/{total}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-destructive/70" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
