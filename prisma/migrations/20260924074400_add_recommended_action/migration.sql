/*
  Warnings:

  - Added the required column `recommendedAction` to the `Recommendation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "compositeScore" REAL NOT NULL,
    "rank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AuditIssue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Recommendation" ("auditId", "businessImpact", "category", "compositeScore", "createdAt", "difficulty", "estimatedTime", "evidence", "expectedOutcome", "id", "isQuickWin", "issueId", "priority", "rank", "seoImpact", "title") SELECT "auditId", "businessImpact", "category", "compositeScore", "createdAt", "difficulty", "estimatedTime", "evidence", "expectedOutcome", "id", "isQuickWin", "issueId", "priority", "rank", "seoImpact", "title" FROM "Recommendation";
DROP TABLE "Recommendation";
ALTER TABLE "new_Recommendation" RENAME TO "Recommendation";
CREATE INDEX "Recommendation_auditId_idx" ON "Recommendation"("auditId");
CREATE INDEX "Recommendation_auditId_priority_idx" ON "Recommendation"("auditId", "priority");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
