-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "viewport" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Screenshot_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Screenshot_auditId_idx" ON "Screenshot"("auditId");
