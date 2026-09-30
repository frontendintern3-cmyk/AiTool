import type { CrawlResult, CrawledPage, Industry, ModuleResult } from "../types";
import { buildModuleResult, runPageRule, runSiteRule, type PageRuleDef, type RuleOutcome, type SiteRuleDef } from "../helpers";

const crawledOk = (p: CrawledPage) => p.statusCode === 200 && p.isIndexable;

const CTA_KEYWORDS = /\b(contact us|contact|book now|book a|schedule|demo|free trial|start.{0,3}trial|get started|get a quote|request a quote|apply now|apply|enroll|enrol|admission|buy now|shop now|add to cart|subscribe|sign up|signup|call now|call us|enquire|inquire|whatsapp|chat with us|talk to (an|our)|speak to (an|our)|consult|download brochure|request a callback)\b/i;
const TRUST_KEYWORDS = /\b(testimonial|customer review|client review|case stud(y|ies)|trusted by|accredited|certified|award[- ]winning|years of experience|as seen in|rated \d(\.\d)?\s*(out of|\/)\s*\d)\b/i;
const WHATSAPP_PATTERN = /(wa\.me\/|api\.whatsapp\.com)/i;
const LIVE_CHAT_PATTERNS = [
  /widget\.intercom\.io/i,
  /js\.driftt\.com/i,
  /embed\.tawk\.to/i,
  /client\.crisp\.chat/i,
  /widget-v4\.tidiochat\.com/i,
  /assets\.freshchat\.com/i,
  /js\.hs-scripts\.com/i,
  /static\.zdassets\.com/i,
  /livechatinc\.com/i,
];
const WHATSAPP_RELEVANT_INDUSTRIES: Industry[] = ["Real Estate", "Education", "Healthcare", "E-commerce", "Automotive", "Hospitality", "Travel"];

const pageRules: PageRuleDef[] = [
  {
    id: "cro-cta-missing",
    title: "No Clear Call-to-Action",
    category: "cro",
    severity: "warning",
    confidence: "MEDIUM",
    description: "No link or button on the page matches a clear conversion-oriented call-to-action phrase.",
    whyItMatters: "Visitors who don't see an obvious next step are less likely to convert, regardless of how good the content is.",
    recommendation: "Add a clear, action-oriented CTA (e.g. \"Book a demo\", \"Get a quote\", \"Contact us\") near the top of the page and repeat it near the end.",
    test: (p) => {
      if (!crawledOk(p) || !["homepage", "service", "product", "course", "contact"].includes(p.pageType)) return null;
      const allLinks = [...p.internalLinks, ...p.externalLinks];
      const hasCta = allLinks.some((l) => CTA_KEYWORDS.test(l.anchorText));
      return { passed: hasCta, evidence: hasCta ? "CTA-style link found" : `${p.url} has no link matching common CTA phrasing` };
    },
  },
  {
    id: "cro-form-missing-on-contact",
    title: "Contact Page Has No Form",
    category: "cro",
    severity: "warning",
    confidence: "MEDIUM",
    description: "The contact page has no <form> element detected.",
    whyItMatters: "A contact page without a form forces visitors to switch to email/phone, adding friction that reduces lead capture.",
    recommendation: "Add a short lead-capture form (name, contact info, message) directly on the contact page.",
    test: (p) => {
      if (!crawledOk(p) || p.pageType !== "contact" || !p.rawHtml) return null;
      const hasForm = /<form[\s>]/i.test(p.rawHtml);
      return { passed: hasForm, evidence: hasForm ? "Form detected on contact page" : `${p.url} has no <form> element` };
    },
  },
];

function buildTrustSignalsRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "cro-trust-signals-missing",
    title: "Few Trust Signals Detected",
    category: "cro",
    severity: "info",
    confidence: "LOW",
    description: "No page contains common trust-signal language (testimonials, reviews, certifications, case studies).",
    whyItMatters: "Trust signals reduce perceived risk for a first-time visitor and are one of the most reliable levers for improving conversion rate.",
    recommendation: "Add genuine testimonials, review counts/ratings, or case studies near key conversion points — never fabricate ratings or counts.",
    test: () => {
      const found = pages.some((p) => p.rawHtml && TRUST_KEYWORDS.test(p.rawHtml));
      return { passed: found, evidence: found ? "Trust-signal language found on at least one page" : "No testimonial/review/certification language detected" };
    },
  };
}

function buildLiveChatRule(pages: CrawledPage[]): SiteRuleDef {
  return {
    id: "cro-live-chat-missing",
    title: "No Live Chat / Messaging Widget Detected",
    category: "cro",
    severity: "info",
    confidence: "MEDIUM",
    description: "No known live-chat or messaging widget script was detected on any crawled page.",
    whyItMatters: "Live chat and WhatsApp-style messaging lower the effort required to ask a question before converting, especially for high-consideration purchases.",
    recommendation: "Consider adding a chat widget (or a visible WhatsApp link) so visitors can ask questions without leaving the page.",
    test: () => {
      const found = pages.some((p) => p.rawHtml && (LIVE_CHAT_PATTERNS.some((pat) => pat.test(p.rawHtml)) || WHATSAPP_PATTERN.test(p.rawHtml)));
      return { passed: found, evidence: found ? "A live chat or WhatsApp widget was detected" : "No live chat / WhatsApp widget detected" };
    },
  };
}

function buildWhatsappRule(pages: CrawledPage[], industry: Industry): SiteRuleDef | null {
  if (!WHATSAPP_RELEVANT_INDUSTRIES.includes(industry)) return null;
  return {
    id: "cro-whatsapp-missing",
    title: `No WhatsApp Link Detected (expected for ${industry})`,
    category: "cro",
    severity: "info",
    confidence: "MEDIUM",
    description: `No wa.me or WhatsApp Business link was found, which is a common low-friction lead channel for ${industry} sites.`,
    whyItMatters: "WhatsApp is a very low-friction way for a warm visitor to start a conversation, particularly common in this industry.",
    recommendation: "Add a visible WhatsApp click-to-chat link (wa.me/<number>) on key pages.",
    test: () => {
      const found = pages.some((p) => p.rawHtml && WHATSAPP_PATTERN.test(p.rawHtml));
      return { passed: found, evidence: found ? "WhatsApp link detected" : "No wa.me / WhatsApp Business link detected" };
    },
  };
}

export function runCro(crawl: CrawlResult, industry: Industry): { result: ModuleResult; recommendations: Record<string, string> } {
  if (crawl.status === "unavailable" || crawl.pages.length === 0) {
    return buildModuleResult("cro", [], "unavailable", crawl.errorMessage ?? "No pages were crawled");
  }

  const whatsappRule = buildWhatsappRule(crawl.pages, industry);

  const outcomes: RuleOutcome[] = [
    ...pageRules.map((rule) => runPageRule(rule, crawl.pages)),
    runSiteRule(buildTrustSignalsRule(crawl.pages)),
    runSiteRule(buildLiveChatRule(crawl.pages)),
    ...(whatsappRule ? [runSiteRule(whatsappRule)] : []),
  ];

  const { result, recommendations } = buildModuleResult("cro", outcomes);
  result.extra = {
    note: "CRO checks only cover what's observable in static HTML — sticky CTA behavior, exit-intent popups, and live chat availability at runtime aren't measured. This reflects potential improvement, never a promised conversion-rate lift.",
  };
  return { result, recommendations };
}
