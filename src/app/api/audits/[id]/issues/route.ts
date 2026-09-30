import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = new URL(req.url).searchParams.get("category");

  const issues = await db.auditIssue.findMany({
    where: { auditId: id, ...(category ? { category } : {}) },
  });

  issues.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  return NextResponse.json({ issues });
}
