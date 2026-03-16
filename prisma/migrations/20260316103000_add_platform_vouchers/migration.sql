CREATE TABLE "platform_vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "min_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "category_id" INTEGER,
    "max_discount_amount" DECIMAL(12,2),
    "starts_at" TIMESTAMP(6) NOT NULL,
    "ends_at" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_vouchers_code_key" ON "platform_vouchers"("code");
CREATE INDEX "platform_vouchers_category_id_idx" ON "platform_vouchers"("category_id");
CREATE INDEX "platform_vouchers_is_active_idx" ON "platform_vouchers"("is_active");
CREATE INDEX "platform_vouchers_starts_at_ends_at_idx" ON "platform_vouchers"("starts_at", "ends_at");

ALTER TABLE "platform_vouchers"
ADD CONSTRAINT "platform_vouchers_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
