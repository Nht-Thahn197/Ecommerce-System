ALTER TABLE "reviews"
ADD COLUMN IF NOT EXISTS "image_urls" JSONB,
ADD COLUMN IF NOT EXISTS "video_urls" JSONB,
ADD COLUMN IF NOT EXISTS "has_media" BOOLEAN NOT NULL DEFAULT false;

UPDATE "reviews"
SET "has_media" = CASE
  WHEN (
    jsonb_typeof(COALESCE("image_urls", '[]'::jsonb)) = 'array'
    AND jsonb_array_length(COALESCE("image_urls", '[]'::jsonb)) > 0
  ) OR (
    jsonb_typeof(COALESCE("video_urls", '[]'::jsonb)) = 'array'
    AND jsonb_array_length(COALESCE("video_urls", '[]'::jsonb)) > 0
  )
  THEN true
  ELSE false
END;

CREATE INDEX IF NOT EXISTS "reviews_product_id_rating_idx"
ON "reviews"("product_id", "rating");

CREATE INDEX IF NOT EXISTS "reviews_product_id_has_media_idx"
ON "reviews"("product_id", "has_media");
