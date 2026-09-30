-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competitor_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Competitor_auditId_idx" ON "Competitor"("auditId");
