CREATE TABLE IF NOT EXISTS "shop_vouchers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shop_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "discount_type" VARCHAR(20) NOT NULL,
  "discount_value" DECIMAL(12, 2) NOT NULL,
  "min_order_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "product_ids" JSONB,
  "max_discount_amount" DECIMAL(12, 2),
  "starts_at" TIMESTAMP(6) NOT NULL,
  "ends_at" TIMESTAMP(6) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "used_quantity" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shop_vouchers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shop_vouchers_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT "shop_vouchers_shop_id_code_key" UNIQUE ("shop_id", "code")
);

CREATE INDEX IF NOT EXISTS "shop_vouchers_shop_id_idx"
ON "shop_vouchers"("shop_id");

CREATE INDEX IF NOT EXISTS "shop_vouchers_is_active_idx"
ON "shop_vouchers"("is_active");

CREATE INDEX IF NOT EXISTS "shop_vouchers_starts_at_ends_at_idx"
ON "shop_vouchers"("starts_at", "ends_at");
