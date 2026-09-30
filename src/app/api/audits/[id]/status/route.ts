import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await db.audit.findUnique({
    where: { id },
    select: { id: true, status: true, currentStage: true, progress: true, errorMessage: true, startedAt: true, completedAt: true },
  });

  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

  return NextResponse.json(audit);
}
