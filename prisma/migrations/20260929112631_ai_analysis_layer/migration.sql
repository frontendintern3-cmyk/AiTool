-- AlterTable
ALTER TABLE "Audit" ADD COLUMN "aiSummary" JSONB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditIssue" (
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
    "source" TEXT NOT NULL DEFAULT 'rule',
    "sourceQuotes" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditIssue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditIssue" ("affectedCount", "affectedPages", "auditId", "category", "checkId", "confidence", "createdAt", "description", "evidence", "id", "severity", "title", "whyItMatters") SELECT "affectedCount", "affectedPages", "auditId", "category", "checkId", "confidence", "createdAt", "description", "evidence", "id", "severity", "title", "whyItMatters" FROM "AuditIssue";
DROP TABLE "AuditIssue";
ALTER TABLE "new_AuditIssue" RENAME TO "AuditIssue";
CREATE INDEX "AuditIssue_auditId_idx" ON "AuditIssue"("auditId");
CREATE INDEX "AuditIssue_auditId_category_idx" ON "AuditIssue"("auditId", "category");
CREATE INDEX "AuditIssue_auditId_severity_idx" ON "AuditIssue"("auditId", "severity");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
