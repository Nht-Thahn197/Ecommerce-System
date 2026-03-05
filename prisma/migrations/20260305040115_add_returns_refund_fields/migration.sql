-- AlterTable
ALTER TABLE "returns" ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "refund_amount" DECIMAL(12,2),
ADD COLUMN     "rejected_reason" VARCHAR(255),
ADD COLUMN     "resolved_at" TIMESTAMP(6);
