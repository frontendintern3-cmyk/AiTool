import type { CrawlResult, CrawledPage, ModuleResult } from "../types";
import { buildModuleResult, runPageRule, type PageRuleDef, type RuleOutcome } from "../helpers";

const crawledOk = (p: CrawledPage) => p.statusCode !== null && !p.fetchError;

function headerRule(
  id: string,
  title: string,
  headerName: string,
  description: string,
  whyItMatters: string,
  recommendation: string
): PageRuleDef {
  return {
    id,
    title,
    category: "security",
    severity: "info",
    confidence: "HIGH",
    description,
    whyItMatters,
    recommendation,
    test: (p) => {
      if (!crawledOk(p)) return null;
      const present = Object.keys(p.headers).some((h) => h.toLowerCase() === headerName);
      return { passed: present, evidence: present ? `${headerName} header detected` : `${headerName} header not detected on ${p.url}` };
    },
  };
}

const pageRules: PageRuleDef[] = [
  {
    id: "https-missing-security",
    title: "Not Served Over HTTPS",
    category: "security",
    severity: "critical",
    confidence: "HIGH",
    description: "The page is served over plain HTTP rather than HTTPS.",
    whyItMatters: "Without HTTPS, all traffic (including any form submissions) travels unencrypted and is vulnerable to interception or tampering.",
    recommendation: "Obtain a TLS certificate and serve all traffic over HTTPS, redirecting HTTP to HTTPS.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      const isHttps = p.url.startsWith("https://");
      return { passed: isHttps, evidence: isHttps ? "HTTPS detected" : `${p.url} served over HTTP` };
    },
  },
  headerRule(
    "hsts-missing",
    "HSTS Header Not Detected",
    "strict-transport-security",
    "The Strict-Transport-Security (HSTS) response header was not detected.",
    "HSTS instructs browsers to always use HTTPS for this domain, preventing protocol-downgrade and cookie-hijacking attacks.",
    "Add a Strict-Transport-Security header (e.g. `max-age=31536000; includeSubDomains`)."
  ),
  headerRule(
    "csp-missing",
    "Content-Security-Policy Not Detected",
    "content-security-policy",
    "No Content-Security-Policy response header was detected.",
    "CSP restricts which sources scripts/styles/frames can load from, reducing the impact of XSS and injection attacks.",
    "Define a Content-Security-Policy appropriate to the site's actual script/style/image sources."
  ),
  headerRule(
    "x-content-type-options-missing",
    "X-Content-Type-Options Not Detected",
    "x-content-type-options",
    "The X-Content-Type-Options response header was not detected.",
    "Without `nosniff`, some browsers may MIME-sniff responses in ways that enable content-type-confusion attacks.",
    "Add `X-Content-Type-Options: nosniff` to server responses."
  ),
  headerRule(
    "referrer-policy-missing",
    "Referrer-Policy Not Detected",
    "referrer-policy",
    "No Referrer-Policy response header was detected.",
    "Referrer-Policy controls how much URL information leaks to third parties via the Referer header on outbound links.",
    "Add a Referrer-Policy header such as `strict-origin-when-cross-origin`."
  ),
  headerRule(
    "permissions-policy-missing",
    "Permissions-Policy Not Detected",
    "permissions-policy",
    "No Permissions-Policy response header was detected.",
    "Permissions-Policy restricts which browser features (camera, mic, geolocation, etc.) the page and any embedded frames can use.",
    "Add a Permissions-Policy header scoped to only the browser features the site actually needs."
  ),
  {
    id: "mixed-content",
    title: "Mixed Content Detected",
    category: "security",
    severity: "warning",
    confidence: "MEDIUM",
    description: "An HTTPS page loads one or more resources over plain HTTP.",
    whyItMatters: "Mixed content can be blocked or flagged by browsers and undermines the security guarantees HTTPS is supposed to provide.",
    recommendation: "Update all resource references (images, scripts, stylesheets) on HTTPS pages to use HTTPS URLs.",
    test: (p) => {
      if (!crawledOk(p) || !p.url.startsWith("https://") || !p.rawHtml) return null;
      const matches = p.rawHtml.match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) ?? [];
      return { passed: matches.length === 0, evidence: matches.length === 0 ? "No mixed content detected" : `${matches.length} HTTP resource reference(s) found on an HTTPS page` };
    },
  },
  {
    id: "insecure-cookies",
    title: "Cookies Missing Secure/HttpOnly Flags",
    category: "security",
    severity: "warning",
    confidence: "MEDIUM",
    description: "One or more Set-Cookie headers were detected without the Secure and/or HttpOnly attribute.",
    whyItMatters: "Cookies without Secure can be sent over unencrypted connections; cookies without HttpOnly are readable by client-side scripts, increasing XSS impact.",
    recommendation: "Set the Secure and HttpOnly attributes on all cookies that don't need JavaScript access.",
    test: (p) => {
      if (!crawledOk(p)) return null;
      const setCookie = Object.entries(p.headers).find(([k]) => k.toLowerCase() === "set-cookie")?.[1];
      if (!setCookie) return null;
      const hasSecure = /secure/i.test(setCookie);
      const hasHttpOnly = /httponly/i.test(setCookie);
      const passed = hasSecure && hasHttpOnly;
      return { passed, evidence: passed ? "Cookies set with Secure and HttpOnly" : `Set-Cookie missing ${!hasSecure ? "Secure " : ""}${!hasHttpOnly ? "HttpOnly" : ""}`.trim() };
    },
  },
];

export function runSecurity(crawl: CrawlResult): { result: ModuleResult; recommendations: Record<string, string> } {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return buildModuleResult("security", [], "unavailable", crawl.errorMessage ?? "No pages were crawled");
  }

  const outcomes: RuleOutcome[] = pageRules.map((rule) => runPageRule(rule, crawl.pages));
  return buildModuleResult("security", outcomes);
}
