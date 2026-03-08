ALTER TABLE "products"
ADD COLUMN "gtin" VARCHAR(100),
ADD COLUMN "condition" VARCHAR(20) DEFAULT 'new',
ADD COLUMN "length_cm" INTEGER,
ADD COLUMN "width_cm" INTEGER,
ADD COLUMN "height_cm" INTEGER,
ADD COLUMN "cover_image_url" VARCHAR(500),
ADD COLUMN "video_url" VARCHAR(500),
ADD COLUMN "media_gallery" JSONB;

UPDATE "products"
SET "condition" = 'new'
WHERE "condition" IS NULL;
