-- P3-30 fix: TransactionPayment had no way to correct a payment entered in
-- error other than leaving it PENDING forever. Adds a VOID status plus an
-- audit trail (voidedAt, voidReason) for who/why it was voided.

-- AlterEnum
ALTER TYPE "TransactionPaymentStatus" ADD VALUE 'VOID';

-- AlterTable
ALTER TABLE "TransactionPayment" ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidReason" TEXT;
