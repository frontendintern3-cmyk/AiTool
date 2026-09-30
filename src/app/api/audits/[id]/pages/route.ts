import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pages = await db.page.findMany({ where: { auditId: id }, orderBy: { crawledAt: "asc" } });
  return NextResponse.json({ pages });
}
