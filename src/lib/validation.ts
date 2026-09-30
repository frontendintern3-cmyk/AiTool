import { z } from "zod";
import { INDUSTRIES } from "./audit/types";

export const createAuditSchema = z.object({
  url: z.string().min(1, "Website URL is required"),
  industry: z.enum(INDUSTRIES as [string, ...string[]]),
  businessName: z.string().trim().max(200).optional(),
  targetCountry: z.string().trim().max(100).optional(),
  targetCity: z.string().trim().max(100).optional(),
  targetAudience: z.string().trim().max(300).optional(),
  competitorUrls: z.array(z.string().trim()).max(3).optional(),
});

export function normalizeUrl(input: string): string | null {
  let candidate = input.trim();
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const u = new URL(candidate);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
