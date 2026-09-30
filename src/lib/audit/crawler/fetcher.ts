const FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 10;
const USER_AGENT =
  "Mozilla/5.0 (compatible; SiteAuditBot/1.0; +https://example.com/bot) AppleWebKit/537.36 Chrome/124 Safari/537.36";

export interface FetchPageResult {
  finalUrl: string;
  statusCode: number | null;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
  redirectChain: string[];
  contentType: string | null;
  error?: string;
}

/** Fetches a URL manually following redirects (so we can record the chain),
 * with a hard timeout so one slow/hanging page never stalls the whole crawl. */
export async function fetchPage(url: string): Promise<FetchPageResult> {
  const start = Date.now();
  const redirectChain: string[] = [];
  let currentUrl = url;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });
      clearTimeout(timeout);

      const isRedirect = res.status >= 300 && res.status < 400 && res.headers.get("location");
      if (isRedirect) {
        redirectChain.push(currentUrl);
        currentUrl = new URL(res.headers.get("location")!, currentUrl).toString();
        continue;
      }

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => (headers[key] = value));
      const contentType = res.headers.get("content-type");

      const body = contentType?.includes("text") || contentType?.includes("html") || contentType?.includes("xml")
        ? await res.text()
        : "";

      return {
        finalUrl: currentUrl,
        statusCode: res.status,
        headers,
        body,
        responseTimeMs: Date.now() - start,
        redirectChain,
        contentType,
      };
    } catch (err) {
      return {
        finalUrl: currentUrl,
        statusCode: null,
        headers: {},
        body: "",
        responseTimeMs: Date.now() - start,
        redirectChain,
        contentType: null,
        error: err instanceof Error ? err.message : "Unknown fetch error",
      };
    }
  }

  return {
    finalUrl: currentUrl,
    statusCode: null,
    headers: {},
    body: "",
    responseTimeMs: Date.now() - start,
    redirectChain,
    contentType: null,
    error: "Too many redirects",
  };
}

/** Lightweight HEAD check used for broken-link verification without a full GET. */
export async function headCheck(url: string): Promise<{ statusCode: number | null; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(timeout);
    return { statusCode: res.status };
  } catch (err) {
    return { statusCode: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
