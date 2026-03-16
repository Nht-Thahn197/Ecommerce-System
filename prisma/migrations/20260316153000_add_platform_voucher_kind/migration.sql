ALTER TABLE "platform_vouchers"
ADD COLUMN IF NOT EXISTS "voucher_kind" VARCHAR(20) NOT NULL DEFAULT 'discount';

CREATE INDEX IF NOT EXISTS "platform_vouchers_voucher_kind_idx"
ON "platform_vouchers"("voucher_kind");
