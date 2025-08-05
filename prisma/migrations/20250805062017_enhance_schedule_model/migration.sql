-- AlterTable
ALTER TABLE "public"."schedules" ADD COLUMN     "description" TEXT,
ADD COLUMN     "dose_times" JSONB,
ADD COLUMN     "reminder_minutes_before" INTEGER DEFAULT 15,
ADD COLUMN     "reminder_type" TEXT;

-- CreateIndex
CREATE INDEX "schedules_reminder_type_is_active_idx" ON "public"."schedules"("reminder_type", "is_active");
