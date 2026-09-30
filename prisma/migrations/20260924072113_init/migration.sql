-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Audit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "crawledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Page_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditIssue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER,
    "weight" REAL NOT NULL,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "notes" TEXT,
    CONSTRAINT "AuditScore_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "errorMessage" TEXT,
    "performanceScore" INTEGER,
    "lcpMs" REAL,
    "fcpMs" REAL,
    "cls" REAL,
    "inpMs" REAL,
    "ttfbMs" REAL,
    "speedIndexMs" REAL,
    "totalBlockingTimeMs" REAL,
    "opportunities" JSONB,
    "source" TEXT NOT NULL DEFAULT 'lighthouse-local',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceMetric_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "issueId" TEXT,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "businessImpact" TEXT NOT NULL,
    "seoImpact" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "isQuickWin" BOOLEAN NOT NULL DEFAULT false,
    "compositeScore" REAL NOT NULL,
    "rank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AuditIssue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
