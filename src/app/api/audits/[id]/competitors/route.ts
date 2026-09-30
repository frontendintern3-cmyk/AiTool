import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitors = await db.competitor.findMany({ where: { auditId: id } });
  return NextResponse.json({
    competitors,
    note: "Homepage-only comparison for manually-supplied URLs. Automatic competitor discovery ships in Phase 3.",
  });
}
