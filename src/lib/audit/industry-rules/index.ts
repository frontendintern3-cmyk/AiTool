import type { Industry, PageType } from "../types";

export interface IndustryRuleSet {
  industry: Industry;
  /** Page types this industry's sites are expected to have somewhere on the site. */
  expectedPageTypes: { type: PageType; label: string }[];
  /** schema.org @type values expected to appear somewhere for this industry. */
  expectedSchemaTypes: string[];
  /** Free-text content signals worth checking for on relevant pages (keyword presence heuristic). */
  contentSignals: { label: string; keywords: string[] }[];
  /** Human-readable description shown in the report so the audience understands why these checks exist. */
  rationale: string;
}

const GENERIC: IndustryRuleSet = {
  industry: "Other",
  expectedPageTypes: [
    { type: "about", label: "About page" },
    { type: "contact", label: "Contact page" },
  ],
  expectedSchemaTypes: ["Organization"],
  contentSignals: [],
  rationale: "Generic rule set: every site should have discoverable About and Contact pages with basic Organization schema.",
};

const RULES: Partial<Record<Industry, IndustryRuleSet>> = {
  Education: {
    industry: "Education",
    expectedPageTypes: [
      { type: "course", label: "Course/program pages" },
      { type: "about", label: "About / faculty page" },
      { type: "contact", label: "Admissions/contact page" },
    ],
    expectedSchemaTypes: ["Course", "EducationalOrganization", "FAQPage"],
    contentSignals: [
      { label: "Fee/tuition information", keywords: ["fee", "tuition", "cost", "price"] },
      { label: "Accreditation information", keywords: ["accredit", "affiliat", "recognized by"] },
      { label: "Placement/outcomes information", keywords: ["placement", "career outcomes", "job placement", "alumni"] },
      { label: "Application/admissions CTA", keywords: ["apply now", "admissions", "enroll", "apply today"] },
    ],
    rationale: "Education sites are expected to make course details, fees, accreditation, and an application path easy to find.",
  },
  Healthcare: {
    industry: "Healthcare",
    expectedPageTypes: [
      { type: "service", label: "Treatment/service pages" },
      { type: "location", label: "Location pages" },
      { type: "about", label: "Doctor/provider bios" },
    ],
    expectedSchemaTypes: ["MedicalOrganization", "Physician", "FAQPage"],
    contentSignals: [
      { label: "Appointment booking CTA", keywords: ["book appointment", "schedule", "request appointment"] },
      { label: "Provider credentials", keywords: ["md", "board certified", "years of experience", "specializ"] },
      { label: "Insurance information", keywords: ["insurance", "accepted plans"] },
    ],
    rationale: "Healthcare sites are held to a higher trust bar (YMYL): provider credentials, appointment CTAs, and treatment detail all matter for both users and E-E-A-T.",
  },
  "E-commerce": {
    industry: "E-commerce",
    expectedPageTypes: [
      { type: "product", label: "Product pages" },
      { type: "category", label: "Category pages" },
    ],
    expectedSchemaTypes: ["Product", "Offer", "AggregateRating", "BreadcrumbList"],
    contentSignals: [
      { label: "Pricing shown", keywords: ["$", "price", "usd", "in stock", "add to cart"] },
      { label: "Reviews/ratings", keywords: ["review", "rating", "stars"] },
      { label: "Shipping/returns info", keywords: ["shipping", "returns", "refund"] },
    ],
    rationale: "E-commerce sites are expected to have Product schema, visible pricing/availability, and reviews on product pages.",
  },
  "Real Estate": {
    industry: "Real Estate",
    expectedPageTypes: [
      { type: "product", label: "Property/project pages" },
      { type: "location", label: "Location pages" },
      { type: "contact", label: "Lead/contact form" },
    ],
    expectedSchemaTypes: ["RealEstateListing", "Organization", "BreadcrumbList"],
    contentSignals: [
      { label: "Property details (price/area/config)", keywords: ["sq ft", "bhk", "price", "bedroom", "carpet area"] },
      { label: "WhatsApp/lead capture", keywords: ["whatsapp", "enquire", "schedule a visit", "get a callback"] },
    ],
    rationale: "Real estate sites convert on property detail clarity and low-friction lead capture (forms, WhatsApp, callback requests).",
  },
  SaaS: {
    industry: "SaaS",
    expectedPageTypes: [
      { type: "service", label: "Product/feature pages" },
      { type: "other", label: "Pricing page" },
    ],
    expectedSchemaTypes: ["SoftwareApplication", "Organization", "FAQPage"],
    contentSignals: [
      { label: "Pricing transparency", keywords: ["pricing", "plans", "free trial", "per month"] },
      { label: "Social proof", keywords: ["customers", "trusted by", "case study", "testimonial"] },
    ],
    rationale: "SaaS buyers expect clear pricing, feature detail, and social proof before converting.",
  },
};

export function getIndustryRules(industry: Industry): IndustryRuleSet {
  return RULES[industry] ?? { ...GENERIC, industry };
}
