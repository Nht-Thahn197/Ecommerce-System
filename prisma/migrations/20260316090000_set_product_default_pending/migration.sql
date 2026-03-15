-- Set default status to pending for newly created products
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'pending';
