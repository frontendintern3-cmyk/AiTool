import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditQueue } from "@/lib/queue";
import { runAuditJob } from "@/lib/audit/engine";
import { createAuditSchema, normalizeUrl } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const normalized = normalizeUrl(parsed.data.url);
  if (!normalized) {
    return NextResponse.json({ error: "Enter a valid website URL, e.g. https://example.com" }, { status: 400 });
  }

  const domain = new URL(normalized).hostname;

  const website = await db.website.create({ data: { url: normalized, domain } });

  const audit = await db.audit.create({
    data: {
      websiteId: website.id,
      industry: parsed.data.industry,
      businessName: parsed.data.businessName || null,
      targetCountry: parsed.data.targetCountry || null,
      targetCity: parsed.data.targetCity || null,
      targetAudience: parsed.data.targetAudience || null,
      competitorUrls: parsed.data.competitorUrls && parsed.data.competitorUrls.length > 0 ? parsed.data.competitorUrls : undefined,
      status: "QUEUED",
    },
  });

  auditQueue.enqueue(() => runAuditJob(audit.id));

  return NextResponse.json({ id: audit.id }, { status: 201 });
}
