import type { CrawledPage, CrawlResult, Industry, Issue, ModuleResult, Severity } from "../types";
import { extractVisibleText } from "../crawler/parse";
import { getAnthropicClient, AI_MODEL } from "../../ai/client";

const MAX_PAGES_FOR_ANALYSIS = 6;
const MAX_CHARS_PER_PAGE = 3000;

export interface AiSummary {
  status: "ok" | "unavailable";
  model: string;
  generatedAt: string;
  executiveSummary: string | null;
  strengths: string[];
  errorMessage?: string;
  droppedFindings?: number; // findings the model produced that failed quote verification and were discarded
}

interface RawFinding {
  title: string;
  sourceUrl: string;
  quote: string;
  whyItMatters: string;
  severity: Severity;
}

interface RawConsistencyIssue {
  explanation: string;
  quoteA: string;
  urlA: string;
  quoteB: string;
  urlB: string;
}

interface AnalysisToolInput {
  executiveSummary: string;
  strengths: string[];
  criticalFindings: RawFinding[];
  consistencyIssues: RawConsistencyIssue[];
  trustAssessment: string;
}

const TOOL_SCHEMA = {
  name: "record_site_analysis",
  description: "Record structured findings from reading the provided crawled page excerpts.",
  input_schema: {
    type: "object" as const,
    properties: {
      executiveSummary: {
        type: "string",
        description: "2-4 sentence plain-language overview of what the site does and its overall content quality, based only on the provided excerpts.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
        description: "Concrete strengths actually observed in the provided text — no more than 6.",
      },
      criticalFindings: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short finding title, e.g. 'Factual error about founding year'" },
            sourceUrl: { type: "string", description: "The exact URL of the page this finding came from, copied from the provided list" },
            quote: {
              type: "string",
              description: "An exact verbatim substring copied character-for-character from that page's provided excerpt. Do not paraphrase or summarize — copy it exactly, including punctuation.",
            },
            whyItMatters: { type: "string" },
            severity: { type: "string", enum: ["critical", "warning", "info"] },
          },
          required: ["title", "sourceUrl", "quote", "whyItMatters", "severity"],
        },
        description: "Specific, quotable problems a careful human reader would flag: factual errors, contradictory claims, placeholder/lorem-ipsum text, broken trust signals, weak or unsupported claims. Only include things you can quote verbatim.",
      },
      consistencyIssues: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            explanation: { type: "string", description: "What contradicts what, in plain language" },
            quoteA: { type: "string", description: "Exact verbatim substring from page A" },
            urlA: { type: "string" },
            quoteB: { type: "string", description: "Exact verbatim substring from page B (may be the same page as A)" },
            urlB: { type: "string" },
          },
          required: ["explanation", "quoteA", "urlA", "quoteB", "urlB"],
        },
        description: "Cases where two pieces of text (same page or different pages) state different facts about the same thing (numbers, dates, claims). Only include if you can quote both sides verbatim.",
      },
      trustAssessment: {
        type: "string",
        description: "2-4 sentence qualitative assessment of E-E-A-T / trust signals (authorship, credentials, evidence for claims, internal consistency) based only on the provided text. Do not invent metrics, rankings, or traffic numbers.",
      },
    },
    required: ["executiveSummary", "strengths", "criticalFindings", "consistencyIssues", "trustAssessment"],
  },
};

function selectPagesForAnalysis(pages: CrawledPage[]): CrawledPage[] {
  const eligible = pages.filter((p) => p.statusCode === 200 && p.isIndexable && p.rawHtml && p.wordCount > 40);
  const homepage = eligible.find((p) => p.pageType === "homepage");
  const rest = eligible
    .filter((p) => p !== homepage)
    .sort((a, b) => b.wordCount - a.wordCount);

  const seenTypes = new Set(homepage ? [homepage.pageType] : []);
  const selected = homepage ? [homepage] : [];
  for (const p of rest) {
    if (selected.length >= MAX_PAGES_FOR_ANALYSIS) break;
    if (seenTypes.has(p.pageType)) continue;
    seenTypes.add(p.pageType);
    selected.push(p);
  }
  for (const p of rest) {
    if (selected.length >= MAX_PAGES_FOR_ANALYSIS) break;
    if (!selected.includes(p)) selected.push(p);
  }
  return selected.slice(0, MAX_PAGES_FOR_ANALYSIS);
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** A finding is only accepted if its "verbatim" quote actually appears in the
 * page text we sent the model — this is the guardrail against hallucination.
 * LLM judgment is useful; LLM-invented facts about the site are not acceptable
 * per the "never fabricate" requirement, so anything that doesn't verify is dropped. */
function quoteVerifies(quote: string, pageTextByUrl: Map<string, string>, url: string): boolean {
  const pageText = pageTextByUrl.get(url);
  if (!pageText || !quote || quote.trim().length < 8) return false;
  return normalize(pageText).includes(normalize(quote));
}

export async function runAiAnalysis(
  crawl: CrawlResult,
  industry: Industry,
  businessContext: { businessName?: string | null; targetCountry?: string | null; targetCity?: string | null; targetAudience?: string | null }
): Promise<{ result: ModuleResult; recommendations: Record<string, string>; summary: AiSummary }> {
  const unavailable = (errorMessage: string): { result: ModuleResult; recommendations: Record<string, string>; summary: AiSummary } => ({
    result: { status: "unavailable", category: "content", checks: [], issues: [], errorMessage },
    recommendations: {},
    summary: { status: "unavailable", model: AI_MODEL, generatedAt: new Date().toISOString(), executiveSummary: null, strengths: [], errorMessage },
  });

  const client = getAnthropicClient();
  if (!client) {
    return unavailable("ANTHROPIC_API_KEY is not set — AI analysis (executive summary, cross-page consistency checks) is skipped. Set the key to enable it.");
  }

  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return unavailable(crawl.errorMessage ?? "No pages were crawled");
  }

  const pages = selectPagesForAnalysis(crawl.pages);
  if (pages.length === 0) {
    return unavailable("No indexable pages with enough text content were available to analyze.");
  }

  const pageTextByUrl = new Map<string, string>();
  const pageExcerpts = pages.map((p) => {
    const text = extractVisibleText(p.rawHtml, MAX_CHARS_PER_PAGE);
    pageTextByUrl.set(p.url, text);
    return `URL: ${p.url}\nPAGE TYPE: ${p.pageType}\nTITLE: ${p.title ?? "(none)"}\nEXCERPT:\n${text}`;
  });

  const contextLines = [
    `Industry: ${industry}`,
    businessContext.businessName ? `Business name: ${businessContext.businessName}` : null,
    businessContext.targetCountry ? `Target country: ${businessContext.targetCountry}` : null,
    businessContext.targetCity ? `Target city: ${businessContext.targetCity}` : null,
    businessContext.targetAudience ? `Target audience: ${businessContext.targetAudience}` : null,
  ].filter(Boolean);

  const prompt = `You are analyzing real crawled page text from a website audit. This is the ONLY information you know about the site — you have no other knowledge of it.

${contextLines.join("\n")}

Below are excerpts from ${pages.length} crawled pages. Read them carefully and call record_site_analysis with your findings.

Rules (strict):
- Every quote you provide MUST be an exact verbatim substring of the excerpt for that URL. It will be programmatically checked against the source text and discarded if it doesn't match exactly — so copy carefully rather than paraphrasing.
- Never state or imply specific numbers for traffic, search rankings, backlinks, conversion rate, or Core Web Vitals — none of that data was provided to you.
- Only report criticalFindings and consistencyIssues you can support with a real quote from the text below. If you don't find any, return empty arrays — do not invent findings to fill space.
- Focus on what a careful, skeptical human reader would actually notice: contradictions, placeholder text, unsupported claims, weak trust signals, factual-sounding errors.

--- PAGE EXCERPTS ---

${pageExcerpts.join("\n\n---\n\n")}`;

  let response;
  try {
    response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "record_site_analysis" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    return unavailable(`AI analysis request failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return unavailable("AI analysis did not return structured output.");
  }

  const input = toolUse.input as AnalysisToolInput;
  const issues: Issue[] = [];
  let dropped = 0;

  for (const finding of input.criticalFindings ?? []) {
    if (!quoteVerifies(finding.quote, pageTextByUrl, finding.sourceUrl)) {
      dropped++;
      continue;
    }
    issues.push({
      category: "content",
      checkId: `ai-finding-${issues.length}`,
      title: finding.title,
      description: finding.whyItMatters,
      whyItMatters: "Identified by AI analysis reading the page's actual text, not a deterministic rule — verified against the source page before being reported.",
      severity: finding.severity,
      affectedPages: [finding.sourceUrl],
      evidence: `"${finding.quote}" — ${finding.sourceUrl}`,
      confidence: "MEDIUM",
      source: "ai",
      sourceQuotes: [{ url: finding.sourceUrl, quote: finding.quote }],
    });
  }

  for (const ci of input.consistencyIssues ?? []) {
    const aOk = quoteVerifies(ci.quoteA, pageTextByUrl, ci.urlA);
    const bOk = quoteVerifies(ci.quoteB, pageTextByUrl, ci.urlB);
    if (!aOk || !bOk) {
      dropped++;
      continue;
    }
    issues.push({
      category: "content",
      checkId: `ai-consistency-${issues.length}`,
      title: "Contradicting information across pages",
      description: ci.explanation,
      whyItMatters: "Contradictory facts about the same thing undermine visitor trust and make the site less citable as a source (including for AI answer engines).",
      severity: "warning",
      affectedPages: [ci.urlA, ci.urlB],
      evidence: `"${ci.quoteA}" (${ci.urlA}) vs. "${ci.quoteB}" (${ci.urlB})`,
      confidence: "MEDIUM",
      source: "ai",
      sourceQuotes: [
        { url: ci.urlA, quote: ci.quoteA },
        { url: ci.urlB, quote: ci.quoteB },
      ],
    });
  }

  const checks = issues.map((issue) => ({
    id: issue.checkId,
    title: issue.title,
    passed: false,
    severity: issue.severity,
    confidence: issue.confidence,
    evidence: issue.evidence,
  }));

  const recommendations: Record<string, string> = {};
  for (const issue of issues) {
    recommendations[issue.checkId] =
      issue.checkId.startsWith("ai-consistency")
        ? "Resolve the contradiction by confirming the correct figure/claim with a primary source, then make it consistent across every page that states it."
        : "Verify this claim against a primary source and correct or remove it if it doesn't hold up; if accurate, add a citation so readers (and AI answer engines) can trust it.";
  }

  const summary: AiSummary = {
    status: "ok",
    model: AI_MODEL,
    generatedAt: new Date().toISOString(),
    executiveSummary: input.executiveSummary ?? null,
    strengths: input.strengths ?? [],
    droppedFindings: dropped || undefined,
  };

  if (input.trustAssessment) {
    issues.push({
      category: "content",
      checkId: "ai-trust-assessment",
      title: "AI trust & E-E-A-T assessment",
      description: input.trustAssessment,
      whyItMatters: "Qualitative assessment of experience/expertise/authoritativeness/trust signals based on the crawled text — interpretation, not a measured score.",
      severity: "info",
      affectedPages: pages.map((p) => p.url),
      evidence: input.trustAssessment,
      confidence: "LOW",
      source: "ai",
    });
    checks.push({ id: "ai-trust-assessment", title: "AI trust & E-E-A-T assessment", passed: false, severity: "info", confidence: "LOW", evidence: input.trustAssessment });
  }

  return {
    result: { status: "ok", category: "content", checks, issues, extra: { pagesAnalyzed: pages.length, droppedFindings: dropped } },
    recommendations,
    summary,
  };
}
