import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scores = await db.auditScore.findMany({ where: { auditId: id } });
  return NextResponse.json({ scores });
}
