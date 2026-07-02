-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'QUOTATION_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'QUOTATION_DECISION_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'NEGOTIATION_RECORDED';
ALTER TYPE "ActivityType" ADD VALUE 'SITE_VISIT_COMPLETED';
ALTER TYPE "ActivityType" ADD VALUE 'BOOKING_CONFIRMED';
ALTER TYPE "ActivityType" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "ActivityType" ADD VALUE 'INTERACTION_LOGGED';
ALTER TYPE "ActivityType" ADD VALUE 'INQUIRY_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'INQUIRY_QUALIFIED';
