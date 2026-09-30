import { fetchPage } from "../crawler/fetcher";
import { parseHtml } from "../crawler/parse";

export interface CompetitorResult {
  url: string;
  status: "ok" | "unavailable";
  errorMessage?: string;
  title: string | null;
  metaDescription: string | null;
  wordCount: number | null;
  httpsEnabled: boolean | null;
  hasSchema: boolean | null;
  h1Count: number | null;
  responseTimeMs: number | null;
}

const MAX_COMPETITORS = 3;

/** Homepage-only comparison for manually-supplied competitor URLs — no
 * discovery, no fabricated metrics. Each competitor is fetched independently
 * so one failure never affects the others. */
export async function runCompetitors(competitorUrls: string[]): Promise<CompetitorResult[]> {
  const urls = competitorUrls.slice(0, MAX_COMPETITORS);

  return Promise.all(
    urls.map(async (rawUrl): Promise<CompetitorResult> => {
      const base: CompetitorResult = {
        url: rawUrl,
        status: "unavailable",
        title: null,
        metaDescription: null,
        wordCount: null,
        httpsEnabled: null,
        hasSchema: null,
        h1Count: null,
        responseTimeMs: null,
      };

      let url = rawUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

      try {
        const fetched = await fetchPage(url);
        if (fetched.error || !fetched.statusCode || fetched.statusCode >= 400) {
          return { ...base, errorMessage: fetched.error ?? `HTTP ${fetched.statusCode}` };
        }
        const isHtml = (fetched.contentType || "").includes("html") || fetched.body.startsWith("<");
        if (!isHtml) return { ...base, errorMessage: "Response was not HTML" };

        const parsed = parseHtml(fetched.body, fetched.finalUrl);
        return {
          url: fetched.finalUrl,
          status: "ok",
          title: parsed.title,
          metaDescription: parsed.metaDescription,
          wordCount: parsed.wordCount,
          httpsEnabled: fetched.finalUrl.startsWith("https://"),
          hasSchema: parsed.schemaTypes.length > 0,
          h1Count: parsed.h1.length,
          responseTimeMs: fetched.responseTimeMs,
        };
      } catch (err) {
        return { ...base, errorMessage: err instanceof Error ? err.message : "Unknown error" };
      }
    })
  );
}
