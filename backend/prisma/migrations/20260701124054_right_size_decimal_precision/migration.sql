/*
  Warnings:

  - You are about to alter the column `finalAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `discountAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `bookingAmount` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `amount` on the `BookingPayment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `offeredPrice` on the `Negotiation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `discountAmount` on the `Negotiation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `basePrice` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `totalAmount` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `amount` on the `QuotationCharge` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `width` on the `Unit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,4)`.
  - You are about to alter the column `length` on the `Unit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,4)`.
  - You are about to alter the column `area` on the `Unit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,4)`.
  - You are about to alter the column `pricePerSqFt` on the `Unit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.
  - You are about to alter the column `basePrice` on the `Unit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(14,2)`.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "finalAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "bookingAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "BookingPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Negotiation" ALTER COLUMN "offeredPrice" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Quotation" ALTER COLUMN "basePrice" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "QuotationCharge" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "width" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "length" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "area" SET DATA TYPE DECIMAL(14,4),
ALTER COLUMN "pricePerSqFt" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "basePrice" SET DATA TYPE DECIMAL(14,2);
