function scoreColorVar(score: number | null): string {
  if (score === null) return "var(--muted-foreground)";
  if (score >= 80) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export function RingScore({ score, size = 78 }: { score: number | null; size?: number }) {
  const color = scoreColorVar(score);
  const pct = score ?? 0;
  const inner = size - 18;

  return (
    <div
      className="relative grid place-items-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: score === null ? "var(--muted)" : `conic-gradient(${color} ${pct * 3.6}deg, var(--muted) 0deg)`,
      }}
    >
      <div className="absolute rounded-full bg-background" style={{ width: inner, height: inner }} />
      <span className="relative z-10 font-semibold tabular-nums" style={{ fontSize: size * 0.28 }}>
        {score ?? "—"}
      </span>
    </div>
  );
}

export function letterGrade(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function GradeStamp({ score }: { score: number | null }) {
  const grade = letterGrade(score);
  const color = scoreColorVar(score);
  return (
    <div
      className="grid place-items-center rounded-full border-4 border-double shrink-0 text-center -rotate-6"
      style={{ width: 116, height: 116, borderColor: color, color, background: "color-mix(in srgb, " + color + " 12%, transparent)" }}
    >
      <div>
        <div className="font-semibold leading-none" style={{ fontSize: 44 }}>
          {grade}
        </div>
        <div className="text-[9px] uppercase tracking-wider mt-1">Overall · {score ?? "—"}/100</div>
      </div>
    </div>
  );
}
