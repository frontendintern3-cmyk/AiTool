import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const top25Only = url.searchParams.get("top25") === "true";
  const quickWinsOnly = url.searchParams.get("quickWins") === "true";

  const recommendations = await db.recommendation.findMany({
    where: {
      auditId: id,
      ...(top25Only ? { rank: { not: null } } : {}),
      ...(quickWinsOnly ? { isQuickWin: true } : {}),
    },
    orderBy: top25Only ? { rank: "asc" } : undefined,
  });

  if (!top25Only) {
    recommendations.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || b.compositeScore - a.compositeScore);
  }

  return NextResponse.json({ recommendations });
}
