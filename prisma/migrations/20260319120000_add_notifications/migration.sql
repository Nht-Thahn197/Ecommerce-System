CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "link" VARCHAR(500),
  "image_url" VARCHAR(500),
  "order_id" UUID,
  "order_item_id" UUID,
  "return_id" UUID,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx"
ON "notifications"("user_id", "is_read", "created_at");

CREATE INDEX IF NOT EXISTS "notifications_order_id_idx"
ON "notifications"("order_id");

CREATE INDEX IF NOT EXISTS "notifications_order_item_id_idx"
ON "notifications"("order_item_id");

CREATE INDEX IF NOT EXISTS "notifications_return_id_idx"
ON "notifications"("return_id");
