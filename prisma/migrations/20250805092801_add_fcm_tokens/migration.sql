-- CreateTable
CREATE TABLE "public"."fcm_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_id" TEXT,
    "device_type" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "public"."fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "fcm_tokens_user_id_is_active_idx" ON "public"."fcm_tokens"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "fcm_tokens_device_id_is_active_idx" ON "public"."fcm_tokens"("device_id", "is_active");

-- CreateIndex
CREATE INDEX "fcm_tokens_token_idx" ON "public"."fcm_tokens"("token");

-- AddForeignKey
ALTER TABLE "public"."fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
