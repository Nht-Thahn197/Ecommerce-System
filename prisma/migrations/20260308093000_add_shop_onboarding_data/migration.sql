-- AlterTable
ALTER TABLE "shop_addresses"
ADD COLUMN     "address_type" VARCHAR(30) DEFAULT 'pickup',
ADD COLUMN     "contact_name" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(20);

-- AlterTable
ALTER TABLE "shops"
ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(20),
ADD COLUMN     "onboarding_data" JSONB;

-- Data backfill
UPDATE "shop_addresses"
SET "address_type" = 'pickup'
WHERE "address_type" IS NULL;

-- CreateIndex
CREATE INDEX "shop_addresses_shop_id_address_type_idx" ON "shop_addresses"("shop_id", "address_type");
