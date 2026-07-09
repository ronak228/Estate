-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "unitType" TEXT;

-- CreateTable
CREATE TABLE "SiteVisitUnit" (
    "siteVisitId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisitUnit_pkey" PRIMARY KEY ("siteVisitId","unitId")
);

-- CreateIndex
CREATE INDEX "SiteVisitUnit_unitId_idx" ON "SiteVisitUnit"("unitId");

-- AddForeignKey
ALTER TABLE "SiteVisitUnit" ADD CONSTRAINT "SiteVisitUnit_siteVisitId_fkey" FOREIGN KEY ("siteVisitId") REFERENCES "SiteVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisitUnit" ADD CONSTRAINT "SiteVisitUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserve existing single-unit selections as join rows before the
-- old scalar column is dropped, so no historical site-visit unit data is lost.
INSERT INTO "SiteVisitUnit" ("siteVisitId", "unitId", "createdAt")
SELECT "id", "unitId", COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "SiteVisit"
WHERE "unitId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "SiteVisit" DROP CONSTRAINT "SiteVisit_unitId_fkey";

-- DropIndex
DROP INDEX "SiteVisit_unitId_idx";

-- AlterTable
ALTER TABLE "SiteVisit" DROP COLUMN "unitId";
