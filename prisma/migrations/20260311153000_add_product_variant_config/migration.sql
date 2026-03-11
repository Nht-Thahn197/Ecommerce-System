ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "variant_config" JSONB;

ALTER TABLE "product_variants"
ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(500);

ALTER TABLE "product_variants"
ADD COLUMN IF NOT EXISTS "option_values" JSONB;
