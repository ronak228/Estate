-- P0-01 fix: Invoice.invoiceNumber was globally @unique while generated per-company,
-- which guarantees cross-tenant collisions once two companies reach the same
-- per-company sequence number in the same year. Rescope uniqueness to (companyId,
-- invoiceNumber) and add an atomic per-company-per-year counter table so the
-- generator can no longer race under concurrent invoice creation either.

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_companyId_year_key" ON "InvoiceSequence"("companyId", "year");

-- AddForeignKey
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: seed InvoiceSequence.lastNumber from existing invoices so the next
-- generated number continues the sequence instead of restarting at 1 and
-- colliding with already-issued invoice numbers.
-- id is generated via md5() rather than gen_random_uuid() so this migration has
-- no dependency on the pgcrypto extension being installed.
INSERT INTO "InvoiceSequence" ("id", "companyId", "year", "lastNumber", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || "companyId" || EXTRACT(YEAR FROM "createdAt")::text),
  "companyId",
  EXTRACT(YEAR FROM "createdAt")::int AS year,
  COUNT(*)::int AS "lastNumber",
  now()
FROM "Invoice"
GROUP BY "companyId", EXTRACT(YEAR FROM "createdAt")
ON CONFLICT ("companyId", "year") DO NOTHING;
