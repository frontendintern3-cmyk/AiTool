import PptxGenJS from "pptxgenjs";
import path from "node:path";
import fs from "node:fs";
import { buildRoadmap } from "./roadmap";

// Color system sampled directly from the reference deck (CAIAS Website Audit,
// Sep 2026) — not guessed. Keep these in sync if the brand template changes.
const COLORS = {
  blue: "2F6BFF", // kicker labels, "good" band, PASS pill text, big stat numbers
  navy: "14234B", // slide titles, check names
  gold: "F5C400", // brand accent line (left edge)
  amber: "E0B000", // "needs improvement" score band
  orange: "FF8A00", // intuito swoosh (logo only)
  red: "B42318", // "critical" score band, FAIL pill text
  text: "1F2937", // body/finding text
  muted: "6B7280", // subtitles
  headerGray: "8A93A6", // table header labels
  card: "EAF1FF", // lavender card fill
  track: "E8ECF4", // empty progress-bar track
  border: "E3E9F5",
  white: "FFFFFF",
  passBg: "E6EEFF",
  passText: "1F4FD8",
  failBg: "FDE8E6",
  warnBg: "FFF3C4",
  warnText: "8A6A00",
};

const W = 13.333;
const H = 7.5;
const MARGIN = 0.55;
const CONTENT_W = W - MARGIN * 2;
const INTUITO_LOGO_PATH = path.join(process.cwd(), "public", "brand", "intuito-logo.png");
const MAX_TABLE_ROWS = 7;
const MAX_ISSUE_CARDS = 6;

const CATEGORY_LABELS: Record<string, string> = {
  technical_seo: "Technical SEO",
  performance: "Performance",
  on_page_seo: "On-Page SEO",
  content: "Content",
  ai_visibility: "AI Visibility",
  cro: "CRO",
  accessibility: "Accessibility",
  security: "Security",
};

function letterGrade(score: number | null): string {
  if (score === null) return "N/A";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function bandColor(score: number | null): string {
  if (score === null) return COLORS.muted;
  if (score >= 70) return COLORS.blue;
  if (score >= 50) return COLORS.amber;
  return COLORS.red;
}

function pillStyle(kind: "pass" | "fail" | "warn"): { bg: string; text: string } {
  if (kind === "pass") return { bg: COLORS.passBg, text: COLORS.passText };
  if (kind === "fail") return { bg: COLORS.failBg, text: COLORS.red };
  return { bg: COLORS.warnBg, text: COLORS.warnText };
}

function severityToPill(severity: string): { label: string; kind: "pass" | "fail" | "warn" } {
  if (severity === "critical") return { label: "CRITICAL", kind: "fail" };
  if (severity === "warning") return { label: "WARNING", kind: "warn" };
  return { label: "INFO", kind: "pass" };
}

function priorityToPill(priority: string): { label: string; kind: "pass" | "fail" | "warn" } {
  if (priority === "critical") return { label: "CRITICAL", kind: "fail" };
  if (priority === "high") return { label: "HIGH", kind: "warn" };
  if (priority === "medium") return { label: "MEDIUM", kind: "warn" };
  return { label: "LOW", kind: "pass" };
}

function cwvStatus(kind: "lcp" | "cls" | "tbt", value: number | null): { label: string; pill: "pass" | "fail" | "warn" } {
  if (value === null) return { label: "N/A", pill: "pass" };
  const thresholds: Record<string, [number, number]> = { lcp: [2500, 4000], cls: [0.1, 0.25], tbt: [200, 600] };
  const [good, poor] = thresholds[kind];
  if (value <= good) return { label: "GOOD", pill: "pass" };
  if (value <= poor) return { label: "NEEDS WORK", pill: "warn" };
  return { label: "POOR", pill: "fail" };
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Executive-facing slides (critical issues, quick wins) show plain-English
 * evidence — raw HTML element snippets from axe-core belong in the detailed
 * check tables, not here. Strips tags and collapses whitespace only; never
 * rewrites the underlying finding. */
function plainEnglish(text: string, max = 180): string {
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return truncate(stripped, max);
}

/** Fetches the audited site's logo as a data URI for embedding — never
 * fabricated: returns null (leaving the placeholder box empty) unless a real
 * image is actually retrieved. */
export async function fetchLogoDataUri(siteLogoUrl: string | null, siteOrigin: string): Promise<string | null> {
  const candidates = [siteLogoUrl, `${siteOrigin}/favicon.ico`, `${siteOrigin}/favicon.png`].filter(
    (v): v is string => !!v
  );
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(candidate, { signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/") && !candidate.endsWith(".ico")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > 3_000_000) continue;
      const mime = contentType.startsWith("image/") ? contentType : "image/x-icon";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shared slide chrome
// ---------------------------------------------------------------------------

function addBrandFrame(slide: PptxGenJS.Slide, siteLogoData: string | null) {
  slide.addShape("ellipse", { x: -2.3, y: -1.8, w: 5.8, h: 5.8, fill: { color: COLORS.card }, line: { type: "none" } });
  slide.addShape("ellipse", { x: -1.5, y: -0.8, w: 4.0, h: 4.0, fill: { color: "F3F7FF" }, line: { type: "none" } });
  slide.addShape("ellipse", { x: 0.25, y: 3.55, w: 0.5, h: 0.7, fill: { color: "DCE8FF" }, line: { type: "none" }, rotate: -12 });
  slide.addShape("ellipse", { x: -0.6, y: 6.65, w: 1.4, h: 1.4, fill: { color: COLORS.card }, line: { type: "none" } });
  slide.addShape("ellipse", { x: W - 1.5, y: -0.85, w: 2.3, h: 2.3, fill: { color: "F3F7FF" }, line: { type: "none" } });

  slide.addShape("rect", { x: 0, y: 0, w: 0.13, h: H, fill: { color: COLORS.blue }, line: { type: "none" } });
  slide.addShape("rect", { x: 0.13, y: 0, w: 0.045, h: H, fill: { color: COLORS.gold }, line: { type: "none" } });

  const boxW = 1.5;
  const boxH = 0.85;
  const boxX = W - 0.4 - boxW;
  const boxY = 0.3;
  if (siteLogoData) {
    slide.addImage({
      data: siteLogoData,
      x: boxX,
      y: boxY,
      w: boxW,
      h: boxH,
      sizing: { type: "contain", w: boxW, h: boxH },
    });
  }

  if (fs.existsSync(INTUITO_LOGO_PATH)) {
    slide.addImage({ path: INTUITO_LOGO_PATH, x: W - 0.4 - 1.05, y: H - 0.3 - 0.38, w: 1.05, h: 0.38 });
  }
}

function addFooter(slide: PptxGenJS.Slide, footerText: string) {
  slide.addText(footerText, { x: MARGIN, y: H - 0.42, w: 7, h: 0.3, fontSize: 9.5, color: COLORS.muted, fontFace: "Arial" });
}

function addSlideHeader(slide: PptxGenJS.Slide, kicker: string, title: string, subtitle?: string) {
  slide.addText(kicker, { x: MARGIN, y: 0.35, w: 9, h: 0.3, fontSize: 12.5, bold: true, color: COLORS.blue, fontFace: "Arial" });
  slide.addText(title, { x: MARGIN - 0.03, y: 0.62, w: 10.5, h: 0.6, fontSize: 27, bold: true, color: COLORS.navy, fontFace: "Arial" });
  if (subtitle) {
    slide.addText(subtitle, { x: MARGIN, y: 1.2, w: 10.5, h: 0.4, fontSize: 14, color: COLORS.muted, fontFace: "Arial" });
  }
}

function newSlide(pres: PptxGenJS, siteLogoData: string | null, footerText: string): PptxGenJS.Slide {
  const slide = pres.addSlide();
  addBrandFrame(slide, siteLogoData);
  addFooter(slide, footerText);
  return slide;
}

// ---------------------------------------------------------------------------
// Reusable content blocks
// ---------------------------------------------------------------------------

/** Left card: giant score number + label + color-band legend (mirrors the
 * reference's "Overall website health" card). */
function addScoreLegendCard(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, score: number | null, label: string, sublabel: string) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.05, fill: { color: COLORS.card }, line: { type: "none" } });
  const color = bandColor(score);
  slide.addText(score === null ? "N/A" : String(score), { x: x + 0.3, y: y + 0.3, w: w - 0.6, h: 1.1, fontSize: 56, bold: true, color, fontFace: "Arial" });
  slide.addText(label, { x: x + 0.3, y: y + 1.35, w: w - 0.6, h: 0.35, fontSize: 13.5, bold: true, color: COLORS.navy, fontFace: "Arial" });
  slide.addText(sublabel, { x: x + 0.3, y: y + 1.68, w: w - 0.6, h: 0.6, fontSize: 11, color: COLORS.muted, fontFace: "Arial" });

  const legend: [string, string][] = [
    [COLORS.blue, "70–100 good"],
    [COLORS.amber, "50–69 needs improvement"],
    [COLORS.red, "0–49 critical"],
  ];
  legend.forEach(([c, label2], i) => {
    const ly = y + h - 1.05 + i * 0.32;
    slide.addShape("rect", { x: x + 0.3, y: ly, w: 0.16, h: 0.16, fill: { color: c }, line: { type: "none" } });
    slide.addText(label2, { x: x + 0.55, y: ly - 0.04, w: w - 0.9, h: 0.24, fontSize: 10, color: COLORS.text, fontFace: "Arial" });
  });
}

/** Horizontal bar list: bold category name + gray one-liner, thin progress
 * bar colored by band, number right-aligned. */
function addScoreBarList(slide: PptxGenJS.Slide, x: number, y: number, w: number, rows: { label: string; note: string; score: number | null }[]) {
  const rowH = (7.15 - y) / Math.max(rows.length, 1);
  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    slide.addText(r.label, { x, y: ry, w: w * 0.4, h: 0.26, fontSize: 12.5, bold: true, color: COLORS.navy, fontFace: "Arial" });
    slide.addText(r.note, { x: x + w * 0.4, y: ry, w: w * 0.6 - 0.7, h: 0.26, fontSize: 10.5, color: COLORS.muted, fontFace: "Arial", align: "right" });
    const barY = ry + 0.3;
    const barW = w - 0.7;
    slide.addShape("roundRect", { x, y: barY, w: barW, h: 0.1, rectRadius: 0.5, fill: { color: COLORS.track }, line: { type: "none" } });
    if (r.score !== null) {
      const filled = Math.max(0.05, (r.score / 100) * barW);
      slide.addShape("roundRect", { x, y: barY, w: filled, h: 0.1, rectRadius: 0.5, fill: { color: bandColor(r.score) }, line: { type: "none" } });
    }
    slide.addText(r.score === null ? "N/A" : String(r.score), { x: x + barW + 0.05, y: barY - 0.13, w: 0.6, h: 0.35, fontSize: 13, bold: true, color: COLORS.navy, fontFace: "Arial" });
  });
}

/** Numbered issue cards, 2 columns — mirrors the reference's "Critical
 * issues" / "High-priority fixes" layout. Up to 6 per slide. */
function addNumberedIssueGrid(slide: PptxGenJS.Slide, items: { title: string; detail: string }[], startY = 2.0) {
  const colW = (CONTENT_W - 0.5) / 2;
  const rowH = (7.0 - startY) / 3;
  items.slice(0, MAX_ISSUE_CARDS).forEach((item, i) => {
    const col = Math.floor(i / 3);
    const row = i % 3;
    const x = MARGIN + col * (colW + 0.5);
    const y = startY + row * rowH;
    slide.addShape("ellipse", { x, y: y + 0.02, w: 0.4, h: 0.4, fill: { color: COLORS.card }, line: { type: "none" } });
    slide.addText(String(i + 1).padStart(2, "0"), { x, y: y + 0.02, w: 0.4, h: 0.4, align: "center", valign: "middle", fontSize: 12, bold: true, color: COLORS.blue, fontFace: "Arial" });
    slide.addText(item.title, { x: x + 0.55, y, w: colW - 0.55, h: 0.32, fontSize: 13, bold: true, color: COLORS.navy, fontFace: "Arial" });
    slide.addText(item.detail, { x: x + 0.55, y: y + 0.34, w: colW - 0.55, h: rowH - 0.5, fontSize: 11, color: COLORS.text, fontFace: "Arial", valign: "top" });
  });
}

/** Borderless "Check / Status / Finding"-style table with pill badges — the
 * workhorse layout reused for every per-category issue list. Paginates at
 * MAX_TABLE_ROWS and returns how many rows were consumed. */
function addCheckTable(
  slide: PptxGenJS.Slide,
  y: number,
  rows: { name: string; pill: { label: string; kind: "pass" | "fail" | "warn" }; finding: string }[],
  columnLabels: [string, string, string] = ["Check", "Status", "Finding"]
) {
  const colX = [MARGIN, MARGIN + 2.7, MARGIN + 4.3];
  const colW = [2.6, 1.5, CONTENT_W - 4.3];

  slide.addText(columnLabels[0], { x: colX[0], y, w: colW[0], h: 0.25, fontSize: 10.5, bold: true, color: COLORS.headerGray, fontFace: "Arial" });
  slide.addText(columnLabels[1], { x: colX[1], y, w: colW[1], h: 0.25, fontSize: 10.5, bold: true, color: COLORS.headerGray, fontFace: "Arial" });
  slide.addText(columnLabels[2], { x: colX[2], y, w: colW[2], h: 0.25, fontSize: 10.5, bold: true, color: COLORS.headerGray, fontFace: "Arial" });
  slide.addShape("line", { x: MARGIN, y: y + 0.28, w: CONTENT_W, h: 0, line: { color: COLORS.border, width: 1 } });

  let rowY = y + 0.42;
  const bottomLimit = 7.0;
  for (const row of rows) {
    const lines = Math.ceil(row.finding.length / 78) || 1;
    const rowHeight = Math.max(0.5, 0.24 * Math.min(lines, 3));
    if (rowY + rowHeight > bottomLimit) break;

    slide.addText(row.name, { x: colX[0], y: rowY, w: colW[0] - 0.15, h: rowHeight, fontSize: 12, bold: true, color: COLORS.navy, fontFace: "Arial", valign: "top" });

    const style = pillStyle(row.pill.kind);
    slide.addShape("roundRect", { x: colX[1], y: rowY + 0.02, w: 1.15, h: 0.32, rectRadius: 0.5, fill: { color: style.bg }, line: { type: "none" } });
    slide.addText(row.pill.label, { x: colX[1], y: rowY + 0.02, w: 1.15, h: 0.32, align: "center", valign: "middle", fontSize: 9.5, bold: true, color: style.text, fontFace: "Arial" });

    slide.addText(truncate(row.finding, 220), { x: colX[2], y: rowY, w: colW[2], h: rowHeight, fontSize: 11, color: COLORS.text, fontFace: "Arial", valign: "top" });

    rowY += rowHeight + 0.24;
    slide.addShape("line", { x: MARGIN, y: rowY - 0.12, w: CONTENT_W, h: 0, line: { color: "F0F2F7", width: 0.75 } });
  }
}

/** Paginates a check-table across as many slides as needed, each headed
 * "<title> (n of m)" once there's more than one page — same convention the
 * reference deck uses for Performance/AI Visibility/On-Page SEO/etc. */
function addPaginatedCheckSlides(
  pres: PptxGenJS,
  siteLogoData: string | null,
  footerText: string,
  kicker: string,
  title: string,
  subtitle: string,
  rows: { name: string; pill: { label: string; kind: "pass" | "fail" | "warn" }; finding: string }[]
) {
  if (rows.length === 0) {
    const slide = newSlide(pres, siteLogoData, footerText);
    addSlideHeader(slide, kicker, title, subtitle);
    slide.addText("No issues detected in this category — every check passed.", { x: MARGIN, y: 2.2, w: 10, h: 0.5, fontSize: 14, color: COLORS.blue, fontFace: "Arial" });
    return;
  }

  const pageCount = Math.ceil(rows.length / MAX_TABLE_ROWS);
  for (let p = 0; p < pageCount; p++) {
    const pageRows = rows.slice(p * MAX_TABLE_ROWS, p * MAX_TABLE_ROWS + MAX_TABLE_ROWS);
    const slide = newSlide(pres, siteLogoData, footerText);
    const pageTitle = pageCount > 1 ? `${title} (${p + 1} of ${pageCount})` : title;
    addSlideHeader(slide, kicker, pageTitle, p === 0 ? subtitle : undefined);
    addCheckTable(slide, p === 0 && subtitle ? 1.95 : 1.6, pageRows);
  }
}

/** 2-up (stat card + insight card) row, repeated — mirrors the AI
 * Visibility / CRO "score today" + "key insight" pattern. */
function addInsightRow(slide: PptxGenJS.Slide, y: number, statValue: string, statLabel: string, insightLabel: string, insightBody: string) {
  const cardH = 1.75;
  const statW = 3.6;
  slide.addShape("roundRect", { x: MARGIN, y, w: statW, h: cardH, rectRadius: 0.05, fill: { color: COLORS.card }, line: { type: "none" } });
  slide.addText(statValue, { x: MARGIN + 0.25, y: y + 0.2, w: statW - 0.5, h: 0.8, fontSize: 34, bold: true, color: COLORS.blue, fontFace: "Arial" });
  slide.addText(statLabel, { x: MARGIN + 0.25, y: y + cardH - 0.5, w: statW - 0.5, h: 0.4, fontSize: 11.5, bold: true, color: COLORS.navy, fontFace: "Arial" });

  const insightX = MARGIN + statW + 0.3;
  const insightW = CONTENT_W - statW - 0.3;
  slide.addShape("roundRect", { x: insightX, y, w: insightW, h: cardH, rectRadius: 0.05, fill: { color: COLORS.card }, line: { type: "none" } });
  slide.addShape("ellipse", { x: insightX + 0.25, y: y + 0.27, w: 0.08, h: 0.08, fill: { color: COLORS.gold }, line: { type: "none" } });
  slide.addText(insightLabel, { x: insightX + 0.42, y: y + 0.18, w: insightW - 0.7, h: 0.28, fontSize: 12, bold: true, color: COLORS.blue, fontFace: "Arial" });
  slide.addText(insightBody, { x: insightX + 0.25, y: y + 0.55, w: insightW - 0.5, h: cardH - 0.75, fontSize: 10.5, color: COLORS.text, fontFace: "Arial", valign: "top" });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PptxScore {
  category: string;
  score: number | null;
}

export interface PptxIssue {
  title: string;
  severity: string;
  affectedCount: number;
  category: string;
  evidence: string;
  recommendedAction?: string;
  source?: string;
}

interface PptxRecommendation {
  title: string;
  priority: string;
  difficulty: string;
  estimatedTime: string;
  isQuickWin: boolean;
  compositeScore: number;
  businessImpact?: string;
}

interface PptxPerformanceRun {
  pageUrl: string;
  strategy: string;
  status: string;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  totalBlockingTimeMs: number | null;
}

interface PptxCompetitor {
  hostname: string;
  title: string | null;
  wordCount: number | null;
  https: boolean | null;
  hasSchema: boolean | null;
  h1Count: number | null;
  responseTimeMs: number | null;
  isOurSite?: boolean;
}

interface PptxPageTypeRow {
  label: string;
  found: boolean;
  pageCount: number;
}

export interface PptxAuditData {
  siteName: string;
  siteUrl: string;
  industry: string;
  auditDateLabel: string;
  overallScore: number | null;
  scores: PptxScore[];
  strengths: string[];
  aiExecutiveSummary: string | null;
  criticalIssues: PptxIssue[];
  quickWins: PptxRecommendation[];
  topRecommendations: PptxRecommendation[];
  siteLogoData: string | null;

  issuesByCategory: Record<string, PptxIssue[]>;
  performanceRuns: PptxPerformanceRun[];
  competitors: PptxCompetitor[];
  pageTypeCoverage: PptxPageTypeRow[];
  aiVisibility: { llmsTxtFound: boolean; llmsTxtPath: string | null; crawlerAccess: { name: string; allowed: boolean }[] };
  accessibilityNote: string | null;
  screenshotFilePaths: { label: string; filePath: string }[];
  pagesCrawled: number;
  issuesFound: number;
}

function issueToRow(i: PptxIssue): { name: string; pill: { label: string; kind: "pass" | "fail" | "warn" }; finding: string } {
  return { name: i.title, pill: severityToPill(i.severity), finding: i.recommendedAction ? `${i.evidence} — ${i.recommendedAction}` : i.evidence };
}

function summarizeCategory(issues: PptxIssue[]): string {
  if (issues.length === 0) return "No issues detected";
  return truncate(issues.slice(0, 2).map((i) => i.title).join(", "), 55);
}

// ---------------------------------------------------------------------------
// Deck builder
// ---------------------------------------------------------------------------

export async function buildAuditPptx(data: PptxAuditData): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Intuito";
  pres.title = `${data.siteName} — Website Audit`;
  const footerText = `${data.siteName} website audit  |  ${data.auditDateLabel}`;

  // ---- Cover ----
  const cover = pres.addSlide();
  addBrandFrame(cover, data.siteLogoData);
  cover.addText("Website audit report", { x: 0.68, y: 1.9, w: 8, h: 0.4, fontSize: 15, bold: true, color: COLORS.blue, fontFace: "Arial" });
  cover.addText(data.siteName, { x: 0.65, y: 2.35, w: 9.5, h: 1.15, fontSize: 46, bold: true, color: COLORS.navy, fontFace: "Arial" });
  cover.addText(data.siteUrl, { x: 0.7, y: 3.35, w: 8.5, h: 0.5, fontSize: 15, color: COLORS.text, fontFace: "Arial" });
  cover.addText(`Technical SEO, performance, AI visibility, CRO, accessibility and security review`, {
    x: 0.7,
    y: 3.78,
    w: 8.5,
    h: 0.4,
    fontSize: 12.5,
    color: COLORS.muted,
    fontFace: "Arial",
  });

  const gradeBoxW = 2.1;
  const gradeBoxH = 1.7;
  const gc = bandColor(data.overallScore);
  cover.addShape("roundRect", { x: W - 0.55 - gradeBoxW, y: 2.35, w: gradeBoxW, h: gradeBoxH, rectRadius: 0.04, fill: { color: COLORS.white }, line: { color: COLORS.border, width: 1 } });
  cover.addText(letterGrade(data.overallScore), { x: W - 0.4 - gradeBoxW, y: 2.45, w: 1.2, h: 1.05, fontSize: 56, bold: true, color: gc, fontFace: "Arial" });
  cover.addText("Overall grade", { x: W - 0.4 - gradeBoxW, y: 3.5, w: gradeBoxW - 0.3, h: 0.28, fontSize: 11, bold: true, color: COLORS.navy, fontFace: "Arial" });
  cover.addText(`${data.overallScore ?? "N/A"} / 100`, { x: W - 0.4 - gradeBoxW, y: 3.76, w: gradeBoxW - 0.3, h: 0.28, fontSize: 12, color: COLORS.text, fontFace: "Arial" });
  cover.addShape("rect", { x: W - 0.4 - gradeBoxW, y: 4.02, w: 0.55, h: 0.05, fill: { color: COLORS.gold }, line: { type: "none" } });

  addFooter(cover, `Audited ${data.auditDateLabel}  |  Prepared by intuito`);

  // ---- Executive summary: score bars ----
  const summarySlide = newSlide(pres, data.siteLogoData, footerText);
  addSlideHeader(summarySlide, "Executive summary", `Overall website health: ${data.overallScore ?? "N/A"} / 100`, "Category scores from the audit");
  addScoreLegendCard(summarySlide, MARGIN, 1.9, 3.3, 5.0, data.overallScore, "Overall health score", `Grade ${letterGrade(data.overallScore)} — weighted across all categories`);
  addScoreBarList(
    summarySlide,
    MARGIN + 3.6,
    1.95,
    CONTENT_W - 3.6,
    data.scores.map((s) => ({
      label: CATEGORY_LABELS[s.category] ?? s.category,
      note: summarizeCategory(data.issuesByCategory[s.category] ?? []),
      score: s.score,
    }))
  );

  // ---- Executive summary: critical issues ----
  if (data.criticalIssues.length > 0) {
    const critSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(critSlide, "Executive summary", "Critical issues", "The problems that most limit rankings and conversions");
    addNumberedIssueGrid(
      critSlide,
      data.criticalIssues.map((i) => ({ title: i.title, detail: plainEnglish(`${i.evidence}${i.recommendedAction ? " " + i.recommendedAction : ""}`) }))
    );
    if (data.criticalIssues.length > MAX_ISSUE_CARDS) {
      critSlide.addText(`+ ${data.criticalIssues.length - MAX_ISSUE_CARDS} more critical issue(s) — see the category sections.`, {
        x: MARGIN,
        y: 7.05,
        w: 8,
        h: 0.3,
        fontSize: 9.5,
        italic: true,
        color: COLORS.muted,
        fontFace: "Arial",
      });
    }
  }

  // ---- Executive summary: quick wins ----
  if (data.quickWins.length > 0) {
    const qwSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(qwSlide, "Executive summary", "Quick wins", "Low-effort, high-impact fixes to do first");
    addNumberedIssueGrid(
      qwSlide,
      data.quickWins.map((r) => ({ title: r.title, detail: `${r.difficulty} · est. ${r.estimatedTime}${r.businessImpact ? " — " + r.businessImpact : ""}` }))
    );
  }

  // ---- Executive summary: AI-written summary (if available) ----
  if (data.aiExecutiveSummary || data.strengths.length > 0) {
    const narrSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(narrSlide, "Executive summary", "Strengths and summary", "What's working, and the overall picture");
    if (data.aiExecutiveSummary) {
      narrSlide.addText(data.aiExecutiveSummary, { x: MARGIN, y: 2.0, w: CONTENT_W, h: 2, fontSize: 14, color: COLORS.text, fontFace: "Arial", valign: "top" });
    }
    if (data.strengths.length > 0) {
      narrSlide.addText("Strengths", { x: MARGIN, y: data.aiExecutiveSummary ? 4.1 : 2.0, w: 6, h: 0.3, fontSize: 13, bold: true, color: COLORS.navy, fontFace: "Arial" });
      narrSlide.addText(
        data.strengths.map((s) => ({ text: s, options: { bullet: true, breakLine: true } })),
        { x: MARGIN, y: data.aiExecutiveSummary ? 4.45 : 2.35, w: CONTENT_W, h: 2.3, fontSize: 12.5, color: COLORS.text, fontFace: "Arial", valign: "top" }
      );
    }
  }

  // ---- Performance ----
  {
    const perfSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(perfSlide, "Performance", "Performance at a glance", "Lighthouse lab runs — mobile vs desktop, per tested page");
    const mobileRuns = data.performanceRuns.filter((r) => r.strategy === "mobile" && r.status === "ok");
    const desktopRuns = data.performanceRuns.filter((r) => r.strategy === "desktop" && r.status === "ok");
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    const mobileScore = avg(mobileRuns.map((r) => r.performanceScore ?? 0).filter((v) => v > 0));
    const desktopScore = avg(desktopRuns.map((r) => r.performanceScore ?? 0).filter((v) => v > 0));

    if (data.performanceRuns.length === 0) {
      perfSlide.addText("Data unavailable — no Lighthouse runs completed.", { x: MARGIN, y: 2, w: 10, h: 0.5, fontSize: 14, color: COLORS.muted, fontFace: "Arial" });
    } else {
      addInsightRow(
        perfSlide,
        1.95,
        mobileScore === null ? "N/A" : String(mobileScore),
        "Mobile performance score (avg)",
        "Key insight",
        `Desktop averages ${desktopScore ?? "N/A"}/100. ${mobileScore !== null && desktopScore !== null && desktopScore - mobileScore > 20 ? "The gap between mobile and desktop is large — mobile-specific weight (images, scripts, video) is the likely cause." : "Mobile and desktop are reasonably close."}`
      );
      const rows: { name: string; pill: { label: string; kind: "pass" | "fail" | "warn" }; finding: string }[] = data.performanceRuns.map((r) => {
        if (r.status !== "ok") return { name: `${truncate(r.pageUrl, 30)} (${r.strategy})`, pill: { label: "N/A", kind: "warn" as const }, finding: "Data unavailable" };
        const lcp = cwvStatus("lcp", r.lcpMs);
        return {
          name: `${truncate(r.pageUrl, 30)} (${r.strategy})`,
          pill: { label: `${r.performanceScore ?? "N/A"}/100`, kind: (r.performanceScore ?? 0) >= 70 ? "pass" : (r.performanceScore ?? 0) >= 50 ? "warn" : "fail" },
          finding: `LCP ${r.lcpMs ? Math.round(r.lcpMs) + "ms" : "N/A"} (${lcp.label}) · CLS ${r.cls ?? "N/A"} · TBT ${r.totalBlockingTimeMs ? Math.round(r.totalBlockingTimeMs) + "ms" : "N/A"}`,
        };
      });
      addCheckTable(perfSlide, 4.0, rows, ["Page", "Score", "Core Web Vitals"]);
    }
  }
  addPaginatedCheckSlides(pres, data.siteLogoData, footerText, "Performance", "Performance issues", "Issue, severity and finding", (data.issuesByCategory.performance ?? []).map(issueToRow));

  // ---- Technical SEO ----
  addPaginatedCheckSlides(pres, data.siteLogoData, footerText, "Technical SEO", "Technical SEO checks", "Status and finding per check", (data.issuesByCategory.technical_seo ?? []).map(issueToRow));

  // ---- AI Visibility ----
  {
    const aiSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(aiSlide, "AI visibility (GEO + AEO)", "AI search readiness", "Crawlability, structured data and answer-engine signals");
    const blockedCrawlers = data.aiVisibility.crawlerAccess.filter((c) => !c.allowed);
    addInsightRow(
      aiSlide,
      1.95,
      data.aiVisibility.llmsTxtFound ? "Found" : "Missing",
      "llms.txt status",
      "Key insight",
      `${data.aiVisibility.llmsTxtFound ? `llms.txt is present at ${data.aiVisibility.llmsTxtPath}.` : "No llms.txt or llms-full.txt was found — an emerging, unofficial convention, not a confirmed ranking factor."} AI crawler access: ${blockedCrawlers.length === 0 ? "no blocks detected across GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others." : blockedCrawlers.map((c) => c.name).join(", ") + " blocked."}`
    );
    addCheckTable(aiSlide, 4.0, (data.issuesByCategory.ai_visibility ?? []).slice(0, 4).map(issueToRow));
  }
  if ((data.issuesByCategory.ai_visibility ?? []).length > 4) {
    addPaginatedCheckSlides(
      pres,
      data.siteLogoData,
      footerText,
      "AI visibility (GEO + AEO)",
      "AI visibility signals",
      "Status and notes per signal",
      (data.issuesByCategory.ai_visibility ?? []).slice(4).map(issueToRow)
    );
  }

  // ---- On-Page SEO ----
  addPaginatedCheckSlides(pres, data.siteLogoData, footerText, "On-page SEO", "On-page SEO review", "Area, status and finding", (data.issuesByCategory.on_page_seo ?? []).map(issueToRow));

  // ---- Content ----
  {
    const contentSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(contentSlide, "Content", "Content coverage by page type", "Expected page types for this industry, and whether they exist");
    if (data.pageTypeCoverage.length > 0) {
      addCheckTable(
        contentSlide,
        1.95,
        data.pageTypeCoverage.map((c) => ({
          name: c.label,
          pill: { label: c.found ? "FOUND" : "MISSING", kind: c.found ? "pass" : "fail" },
          finding: `${c.pageCount} page(s) matched`,
        })),
        ["Page type", "Coverage", "Detail"]
      );
    } else {
      contentSlide.addText("No industry-specific page-type expectations configured.", { x: MARGIN, y: 2, w: 10, h: 0.5, fontSize: 13, color: COLORS.muted, fontFace: "Arial" });
    }
  }
  addPaginatedCheckSlides(pres, data.siteLogoData, footerText, "Content", "Content gaps and findings", "Rule-based and AI-verified findings", (data.issuesByCategory.content ?? []).map(issueToRow));

  // ---- CRO ----
  {
    const croSlide = newSlide(pres, data.siteLogoData, footerText);
    const croScore = data.scores.find((s) => s.category === "cro")?.score ?? null;
    addSlideHeader(croSlide, "Conversion rate optimisation", "Conversion readiness", "Score from the audit — static-analysis signals only");
    addInsightRow(
      croSlide,
      1.95,
      croScore === null ? "N/A" : String(croScore),
      "Conversion score today",
      "Key insight",
      "These reflect potential improvement opportunities from static analysis — not a measured conversion rate, and never a promised lift. Sticky CTA behavior, exit-intent popups and live chat availability at runtime aren't observable from a crawl."
    );
    addCheckTable(croSlide, 4.0, (data.issuesByCategory.cro ?? []).map(issueToRow));
  }

  // ---- Accessibility ----
  addPaginatedCheckSlides(
    pres,
    data.siteLogoData,
    footerText,
    "Accessibility",
    "Accessibility review",
    data.accessibilityNote ?? "Automated axe-core checks — not a substitute for manual WCAG testing",
    (data.issuesByCategory.accessibility ?? []).map(issueToRow)
  );

  // ---- Security ----
  addPaginatedCheckSlides(pres, data.siteLogoData, footerText, "Security", "Security review", "HTTPS, headers, cookies and disclosure", (data.issuesByCategory.security ?? []).map(issueToRow));

  // ---- Competitors ----
  if (data.competitors.length > 1) {
    const compSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(compSlide, "Competitor benchmark", "Technical comparison", "Homepage-only comparison, measured on audit day");
    addCheckTable(
      compSlide,
      1.95,
      data.competitors.map((c) => ({
        name: c.hostname,
        pill: { label: c.https ? "HTTPS" : "NO HTTPS", kind: c.https ? "pass" : "fail" },
        finding: `${c.wordCount ?? "N/A"} words · Schema: ${c.hasSchema ? "Yes" : "No"} · H1: ${c.h1Count ?? "N/A"} · ${c.responseTimeMs ? c.responseTimeMs + "ms" : "N/A"}`,
      })),
      ["Site", "HTTPS", "Detail"]
    );
  }

  // ---- Screenshots ----
  if (data.screenshotFilePaths.length > 0) {
    const shots = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(shots, "User experience", "First impression: homepage above the fold", "Captured live during this audit");
    const desktop = data.screenshotFilePaths.find((s) => s.label.toLowerCase().includes("desktop")) ?? data.screenshotFilePaths[0];
    const mobile = data.screenshotFilePaths.find((s) => s.label.toLowerCase().includes("mobile"));
    let cx = MARGIN;
    if (desktop && fs.existsSync(desktop.filePath)) {
      shots.addImage({ path: desktop.filePath, x: cx, y: 1.95, w: 6.6, h: 4.6, sizing: { type: "contain", w: 6.6, h: 4.6 } });
      shots.addText(desktop.label, { x: cx, y: 6.6, w: 6.6, h: 0.3, fontSize: 10, color: COLORS.muted, fontFace: "Arial" });
      cx += 6.9;
    }
    if (mobile && fs.existsSync(mobile.filePath)) {
      shots.addImage({ path: mobile.filePath, x: cx, y: 1.95, w: 2.3, h: 4.6, sizing: { type: "contain", w: 2.3, h: 4.6 } });
      shots.addText(mobile.label, { x: cx, y: 6.6, w: 2.3, h: 0.3, fontSize: 10, color: COLORS.muted, fontFace: "Arial" });
    }
  }

  // ---- Roadmap ----
  {
    const roadmapSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(roadmapSlide, "Roadmap", "30 / 60 / 90-day roadmap", "From the audit's action plan");

    const roadmapInput = data.topRecommendations.map((r, idx) => ({
      id: `r${idx}`,
      title: r.title,
      priority: r.priority,
      isQuickWin: r.isQuickWin,
      estimatedTime: r.estimatedTime,
      compositeScore: r.compositeScore,
    }));
    const buckets = buildRoadmap(roadmapInput);
    const colW = (CONTENT_W - 0.6) / 3;
    const timelineY = 2.15;

    buckets.forEach((_, i) => {
      const cx = MARGIN + i * (colW + 0.3) + 0.14;
      roadmapSlide.addShape("ellipse", { x: cx, y: timelineY, w: 0.28, h: 0.28, fill: { color: i === 0 ? COLORS.blue : COLORS.white }, line: { color: COLORS.blue, width: 1.5 } });
      if (i < buckets.length - 1) {
        roadmapSlide.addShape("line", { x: cx + 0.28, y: timelineY + 0.14, w: colW + 0.3 - 0.28, h: 0, line: { color: COLORS.border, width: 1.5 } });
      }
    });

    buckets.forEach((bucket, i) => {
      const x = MARGIN + i * (colW + 0.3);
      const y = timelineY + 0.6;
      roadmapSlide.addText(bucket.window, { x, y, w: colW, h: 0.4, fontSize: 19, bold: true, color: COLORS.navy, fontFace: "Arial" });
      roadmapSlide.addText(bucket.label, { x, y: y + 0.42, w: colW, h: 0.35, fontSize: 12, bold: true, color: COLORS.blue, fontFace: "Arial" });
      const items = bucket.items.slice(0, 8);
      roadmapSlide.addText(
        items.length > 0 ? items.map((it: { title: string }) => ({ text: it.title, options: { bullet: true, breakLine: true } })) : [{ text: "Nothing in this window.", options: {} }],
        { x, y: y + 0.82, w: colW, h: 3.1, fontSize: 10.5, color: COLORS.text, fontFace: "Arial", valign: "top" }
      );
    });
  }

  // ---- Top recommendations ----
  const pageSize = MAX_TABLE_ROWS + 3;
  const totalRecPages = Math.max(1, Math.ceil(Math.min(data.topRecommendations.length, 25) / pageSize));
  for (let p = 0; p < totalRecPages; p++) {
    const pageItems = data.topRecommendations.slice(p * pageSize, p * pageSize + pageSize);
    const slide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(slide, "Action plan", `Top recommendations${totalRecPages > 1 ? ` (${p + 1} of ${totalRecPages})` : ""}`, "Ranked by impact vs effort");
    addCheckTable(
      slide,
      1.95,
      pageItems.map((r, i) => ({
        name: `${p * pageSize + i + 1}. ${r.title}${r.isQuickWin ? " ★" : ""}`,
        pill: priorityToPill(r.priority),
        finding: `${r.difficulty} difficulty · est. ${r.estimatedTime}`,
      })),
      ["Recommendation", "Priority", "Effort"]
    );
  }

  // ---- Final grade / closing ----
  {
    const finalSlide = newSlide(pres, data.siteLogoData, footerText);
    addSlideHeader(finalSlide, "Final grade", "");
    const fc = bandColor(data.overallScore);
    finalSlide.addText(letterGrade(data.overallScore), { x: MARGIN, y: 1.9, w: 2.5, h: 1.8, fontSize: 90, bold: true, color: COLORS.navy, fontFace: "Arial" });
    finalSlide.addText(`${data.overallScore ?? "N/A"} / 100`, { x: MARGIN + 2.3, y: 2.55, w: 3, h: 0.6, fontSize: 30, bold: true, color: fc, fontFace: "Arial" });
    finalSlide.addText(
      data.aiExecutiveSummary
        ? data.aiExecutiveSummary
        : "See the category sections for the full evidence behind this score, and the roadmap for a prioritized 30/60/90-day plan to improve it.",
      { x: MARGIN, y: 3.9, w: 7.3, h: 1.8, fontSize: 13.5, color: COLORS.text, fontFace: "Arial", valign: "top" }
    );
    finalSlide.addText("Thank you", { x: MARGIN, y: 5.9, w: 6, h: 0.55, fontSize: 26, bold: true, color: COLORS.navy, fontFace: "Arial" });
    finalSlide.addText("Prepared by intuito", { x: MARGIN, y: 6.5, w: 6, h: 0.3, fontSize: 12, color: COLORS.muted, fontFace: "Arial" });

    const roadmapInput2 = data.topRecommendations.map((r, idx) => ({ id: `r${idx}`, title: r.title, priority: r.priority, isQuickWin: r.isQuickWin, estimatedTime: r.estimatedTime, compositeScore: r.compositeScore }));
    const buckets2 = buildRoadmap(roadmapInput2);
    buckets2.forEach((bucket, i) => {
      const y = 1.95 + i * 1.15;
      finalSlide.addShape("roundRect", { x: 8.6, y, w: 4.2, h: 0.95, rectRadius: 0.05, fill: { color: COLORS.card }, line: { type: "none" } });
      finalSlide.addText(bucket.window, { x: 8.85, y: y + 0.1, w: 3.7, h: 0.3, fontSize: 11, color: COLORS.muted, fontFace: "Arial" });
      // No invented target score here — we don't have a validated model for
      // "fixing these N items moves the score by X points". The roadmap
      // section already lists what to do; this recap just names the focus.
      finalSlide.addText(bucket.label, { x: 8.85, y: y + 0.42, w: 3.7, h: 0.4, fontSize: 14, bold: true, color: COLORS.navy, fontFace: "Arial" });
    });
  }

  const buf = await pres.write({ outputType: "nodebuffer" });
  return buf as Buffer;
}
