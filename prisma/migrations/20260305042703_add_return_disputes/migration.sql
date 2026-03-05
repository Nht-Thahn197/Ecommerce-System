-- AlterTable
ALTER TABLE "returns" ADD COLUMN     "dispute_reason" VARCHAR(255),
ADD COLUMN     "dispute_resolution" VARCHAR(255),
ADD COLUMN     "dispute_resolved_at" TIMESTAMP(6),
ADD COLUMN     "dispute_resolved_by" UUID,
ADD COLUMN     "dispute_status" VARCHAR(30),
ADD COLUMN     "disputed_at" TIMESTAMP(6);
