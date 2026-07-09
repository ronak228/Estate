-- DropForeignKey
ALTER TABLE "ContractDocument" DROP CONSTRAINT "ContractDocument_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "ContractDocument" DROP CONSTRAINT "ContractDocument_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ContractDocument" DROP CONSTRAINT "ContractDocument_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "DueDiligence" DROP CONSTRAINT "DueDiligence_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "DueDiligence" DROP CONSTRAINT "DueDiligence_companyId_fkey";

-- DropForeignKey
ALTER TABLE "DueDiligence" DROP CONSTRAINT "DueDiligence_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Financing" DROP CONSTRAINT "Financing_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Financing" DROP CONSTRAINT "Financing_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Financing" DROP CONSTRAINT "Financing_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_createdById_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceSequence" DROP CONSTRAINT "InvoiceSequence_companyId_fkey";

-- DropForeignKey
ALTER TABLE "TitleTransfer" DROP CONSTRAINT "TitleTransfer_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "TitleTransfer" DROP CONSTRAINT "TitleTransfer_companyId_fkey";

-- DropForeignKey
ALTER TABLE "TitleTransfer" DROP CONSTRAINT "TitleTransfer_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_createdById_fkey";

-- DropForeignKey
ALTER TABLE "TransactionPayment" DROP CONSTRAINT "TransactionPayment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "TransactionPayment" DROP CONSTRAINT "TransactionPayment_companyId_fkey";

-- DropForeignKey
ALTER TABLE "TransactionPayment" DROP CONSTRAINT "TransactionPayment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "TransactionPayment" DROP CONSTRAINT "TransactionPayment_invoiceId_fkey";

-- DropTable
DROP TABLE "ContractDocument";

-- DropTable
DROP TABLE "DueDiligence";

-- DropTable
DROP TABLE "Financing";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceSequence";

-- DropTable
DROP TABLE "TitleTransfer";

-- DropTable
DROP TABLE "Transaction";

-- DropTable
DROP TABLE "TransactionPayment";

-- DropEnum
DROP TYPE "ContractDocumentType";

-- DropEnum
DROP TYPE "DueDiligenceStatus";

-- DropEnum
DROP TYPE "FinancingApprovalStatus";

-- DropEnum
DROP TYPE "FinancingType";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "SignatureStatus";

-- DropEnum
DROP TYPE "TitleTransferStatus";

-- DropEnum
DROP TYPE "TransactionPaymentStatus";

-- DropEnum
DROP TYPE "TransactionStatus";

