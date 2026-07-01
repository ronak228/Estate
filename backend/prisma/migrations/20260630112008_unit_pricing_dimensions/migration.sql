-- Step 1: Add new columns with a temporary default of 0 so NOT NULL is satisfied
ALTER TABLE "Unit"
  ADD COLUMN "width"        DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "length"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "area"         DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "pricePerSqFt" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "basePrice"    DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Step 2: Back-fill existing rows — treat old `price` as basePrice,
-- and derive width=1, length=1, area=1, pricePerSqFt=price so
-- area × pricePerSqFt = price. This preserves pricing for existing rows.
UPDATE "Unit"
SET
  "width"        = 1,
  "length"       = 1,
  "area"         = 1,
  "pricePerSqFt" = "price",
  "basePrice"    = "price";

-- Step 3: Drop the temporary column defaults (columns stay NOT NULL)
ALTER TABLE "Unit"
  ALTER COLUMN "width"        DROP DEFAULT,
  ALTER COLUMN "length"       DROP DEFAULT,
  ALTER COLUMN "area"         DROP DEFAULT,
  ALTER COLUMN "pricePerSqFt" DROP DEFAULT,
  ALTER COLUMN "basePrice"    DROP DEFAULT;

-- Step 4: Drop the old price column
ALTER TABLE "Unit" DROP COLUMN "price";
