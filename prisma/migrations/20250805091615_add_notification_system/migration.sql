-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('MEDICATION_REMINDER', 'MISSED_DOSE_ALERT', 'CONFIRMATION_REQUEST', 'ESCALATION_ALERT', 'SYSTEM_NOTIFICATION');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'VOICE', 'BUZZER', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationEvent" AS ENUM ('CREATED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'CONFIRMED', 'FAILED', 'RETRY', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."confirmations" ADD COLUMN     "notification_id" TEXT;

-- AlterTable
ALTER TABLE "public"."schedules" ADD COLUMN     "last_notification_sent" TIMESTAMP(3),
ADD COLUMN     "next_notification_due" TIMESTAMP(3),
ADD COLUMN     "notification_status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_logs" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "event" "public"."NotificationEvent" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferred_time" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "max_notifications_per_day" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_schedule_id_scheduled_for_idx" ON "public"."notifications"("schedule_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "notifications_user_id_scheduled_for_idx" ON "public"."notifications"("user_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_for_idx" ON "public"."notifications"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "notifications_channel_status_idx" ON "public"."notifications"("channel", "status");

-- CreateIndex
CREATE INDEX "notification_logs_notification_id_created_at_idx" ON "public"."notification_logs"("notification_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_logs_event_created_at_idx" ON "public"."notification_logs"("event", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_key" ON "public"."notification_templates"("name");

-- CreateIndex
CREATE INDEX "notification_templates_type_channel_is_active_idx" ON "public"."notification_templates"("type", "channel", "is_active");

-- CreateIndex
CREATE INDEX "notification_settings_user_id_is_enabled_idx" ON "public"."notification_settings"("user_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_channel_key" ON "public"."notification_settings"("user_id", "channel");

-- CreateIndex
CREATE INDEX "confirmations_notification_id_idx" ON "public"."confirmations"("notification_id");

-- CreateIndex
CREATE INDEX "schedules_next_notification_due_is_active_idx" ON "public"."schedules"("next_notification_due", "is_active");

-- CreateIndex
CREATE INDEX "schedules_notification_status_is_active_idx" ON "public"."schedules"("notification_status", "is_active");

-- AddForeignKey
ALTER TABLE "public"."confirmations" ADD CONSTRAINT "confirmations_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_logs" ADD CONSTRAINT "notification_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
