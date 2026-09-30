"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { INDUSTRIES } from "@/lib/audit/types";
import { Loader2, Plus, X } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [targetCity, setTargetCity] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Enter a website URL to audit.");
      return;
    }
    if (!industry) {
      setError("Select an industry.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          industry,
          businessName: businessName || undefined,
          targetCountry: targetCountry || undefined,
          targetCity: targetCity || undefined,
          targetAudience: targetAudience || undefined,
          competitorUrls: competitors.filter((c) => c.trim().length > 0),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not start the audit. Please try again.");
        setSubmitting(false);
        return;
      }

      const { id } = await res.json();
      router.push(`/audit/${id}/progress`);
    } catch {
      setError("Something went wrong starting the audit. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 font-sans">
      <div className="w-full max-w-xl">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">WALRUS AI Visibility</h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-500 max-w-md mx-auto">
            Enter a URL and we&apos;ll crawl the site and measure technical SEO, performance, on-page,
            accessibility, and security — with evidence for every finding.
          </p>
        </div>

        <Card className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="url" className="text-sm font-semibold text-slate-700">
                  Enter Website <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="industry" className="text-sm font-semibold text-slate-700">
                  Select Industry <span className="text-rose-500">*</span>
                </Label>
                <Select value={industry} onValueChange={(value) => setIndustry(value ?? "")}>
                  <SelectTrigger id="industry" className="w-full">
                    <SelectValue placeholder="Choose an industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!showOptional ? (
                <button
                  type="button"
                  onClick={() => setShowOptional(true)}
                  className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4 cursor-pointer"
                >
                  + Add optional details (business name, target market, competitors)
                </button>
              ) : (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Optional Context</span>
                    <button
                      type="button"
                      onClick={() => setShowOptional(false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="businessName" className="text-xs font-semibold text-slate-700">Business Name</Label>
                      <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Corp" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="targetCountry" className="text-xs font-semibold text-slate-700">Target Country</Label>
                      <Input id="targetCountry" value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)} placeholder="e.g. United States" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="targetCity" className="text-xs font-semibold text-slate-700">Target City</Label>
                      <Input id="targetCity" value={targetCity} onChange={(e) => setTargetCity(e.target.value)} placeholder="e.g. New York" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="targetAudience" className="text-xs font-semibold text-slate-700">Target Audience</Label>
                      <Input id="targetAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. B2B buyers" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Competitor URLs (up to 3)</Label>
                    {competitors.map((c, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={c}
                          placeholder="https://competitor.com"
                          onChange={(e) => {
                            const next = [...competitors];
                            next[i] = e.target.value;
                            setCompetitors(next);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setCompetitors(competitors.filter((_, idx) => idx !== i))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    {competitors.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCompetitors([...competitors, ""])}
                        className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="size-3.5" /> Add competitor
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3 text-sm font-semibold justify-center"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Start Audit
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
