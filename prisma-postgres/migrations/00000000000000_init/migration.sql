-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "userId" TEXT,
    "industry" TEXT NOT NULL,
    "businessName" TEXT,
    "targetCountry" TEXT,
    "targetCity" TEXT,
    "targetAudience" TEXT,
    "competitorUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "currentStage" TEXT,
    "progress" JSONB,
    "moduleExtras" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiSummary" JSONB,
    "siteLogoUrl" TEXT,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" TEXT,
    "statusCode" INTEGER,
    "title" TEXT,
    "metaDescription" TEXT,
    "h1" JSONB,
    "h2" JSONB,
    "h3" JSONB,
    "wordCount" INTEGER,
    "canonical" TEXT,
    "robotsMeta" TEXT,
    "hreflang" JSONB,
    "schemaTypes" JSONB,
    "ogTags" JSONB,
    "twitterTags" JSONB,
    "images" JSONB,
    "internalLinks" JSONB,
    "externalLinks" JSONB,
    "brokenLinks" JSONB,
    "redirectChain" JSONB,
    "responseTimeMs" INTEGER,
    "contentType" TEXT,
    "isIndexable" BOOLEAN,
    "contentHash" TEXT,
    "renderedWithJs" BOOLEAN NOT NULL DEFAULT false,
    "fetchError" TEXT,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditIssue" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "affectedPages" JSONB,
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "source" TEXT NOT NULL DEFAULT 'rule',
    "sourceQuotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditScore" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER,
    "weight" DOUBLE PRECISION NOT NULL,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "notes" TEXT,

    CONSTRAINT "AuditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "errorMessage" TEXT,
    "performanceScore" INTEGER,
    "lcpMs" DOUBLE PRECISION,
    "fcpMs" DOUBLE PRECISION,
    "cls" DOUBLE PRECISION,
    "inpMs" DOUBLE PRECISION,
    "ttfbMs" DOUBLE PRECISION,
    "speedIndexMs" DOUBLE PRECISION,
    "totalBlockingTimeMs" DOUBLE PRECISION,
    "opportunities" JSONB,
    "source" TEXT NOT NULL DEFAULT 'lighthouse-local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "issueId" TEXT,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "businessImpact" TEXT NOT NULL,
    "seoImpact" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "isQuickWin" BOOLEAN NOT NULL DEFAULT false,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "viewport" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "errorMessage" TEXT,
    "title" TEXT,
    "metaDescription" TEXT,
    "wordCount" INTEGER,
    "httpsEnabled" BOOLEAN,
    "hasSchema" BOOLEAN,
    "h1Count" INTEGER,
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Website_domain_idx" ON "Website"("domain");

-- CreateIndex
CREATE INDEX "Audit_websiteId_idx" ON "Audit"("websiteId");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "Page_auditId_idx" ON "Page"("auditId");

-- CreateIndex
CREATE INDEX "Page_auditId_contentHash_idx" ON "Page"("auditId", "contentHash");

-- CreateIndex
CREATE INDEX "AuditIssue_auditId_idx" ON "AuditIssue"("auditId");

-- CreateIndex
CREATE INDEX "AuditIssue_auditId_category_idx" ON "AuditIssue"("auditId", "category");

-- CreateIndex
CREATE INDEX "AuditIssue_auditId_severity_idx" ON "AuditIssue"("auditId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "AuditScore_auditId_category_key" ON "AuditScore"("auditId", "category");

-- CreateIndex
CREATE INDEX "PerformanceMetric_auditId_idx" ON "PerformanceMetric"("auditId");

-- CreateIndex
CREATE INDEX "Recommendation_auditId_idx" ON "Recommendation"("auditId");

-- CreateIndex
CREATE INDEX "Recommendation_auditId_priority_idx" ON "Recommendation"("auditId", "priority");

-- CreateIndex
CREATE INDEX "Screenshot_auditId_idx" ON "Screenshot"("auditId");

-- CreateIndex
CREATE INDEX "Competitor_auditId_idx" ON "Competitor"("auditId");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditIssue" ADD CONSTRAINT "AuditIssue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditScore" ADD CONSTRAINT "AuditScore_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AuditIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

