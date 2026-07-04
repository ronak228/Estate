-- CreateEnum
CREATE TYPE "ContractDocumentType" AS ENUM ('SALE_AGREEMENT', 'ALLOTMENT_LETTER', 'NOC', 'TITLE_DEED', 'CUSTOMER_ID_PROOF', 'CUSTOMER_ADDRESS_PROOF', 'LOAN_SANCTION_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DueDiligenceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FinancingType" AS ENUM ('SELF_FUNDED', 'HOME_LOAN', 'CONSTRUCTION_LINKED_PLAN', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancingApprovalStatus" AS ENUM ('NOT_APPLIED', 'APPLIED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ContractDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueDiligence" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionStatus" "DueDiligenceStatus" NOT NULL DEFAULT 'PENDING',
    "inspectionNotes" TEXT,
    "appraisalStatus" "DueDiligenceStatus" NOT NULL DEFAULT 'PENDING',
    "appraisalNotes" TEXT,
    "legalVerificationStatus" "DueDiligenceStatus" NOT NULL DEFAULT 'PENDING',
    "legalVerificationNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DueDiligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financing" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "FinancingType" NOT NULL,
    "approvalStatus" "FinancingApprovalStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "bankName" TEXT,
    "loanAmount" DECIMAL(14,2),
    "notes" TEXT,
    "erpSyncedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractDocument_bookingId_idx" ON "ContractDocument"("bookingId");

-- CreateIndex
CREATE INDEX "ContractDocument_companyId_idx" ON "ContractDocument"("companyId");

-- CreateIndex
CREATE INDEX "ContractDocument_uploadedById_idx" ON "ContractDocument"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "DueDiligence_bookingId_key" ON "DueDiligence"("bookingId");

-- CreateIndex
CREATE INDEX "DueDiligence_companyId_idx" ON "DueDiligence"("companyId");

-- CreateIndex
CREATE INDEX "DueDiligence_createdById_idx" ON "DueDiligence"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Financing_bookingId_key" ON "Financing"("bookingId");

-- CreateIndex
CREATE INDEX "Financing_companyId_idx" ON "Financing"("companyId");

-- CreateIndex
CREATE INDEX "Financing_createdById_idx" ON "Financing"("createdById");

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
