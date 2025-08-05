-- CreateIndex
CREATE INDEX "buzzer_logs_user_id_triggered_at_idx" ON "public"."buzzer_logs"("user_id", "triggered_at");

-- CreateIndex
CREATE INDEX "caregiver_relations_caregiver_id_is_active_idx" ON "public"."caregiver_relations"("caregiver_id", "is_active");

-- CreateIndex
CREATE INDEX "caregiver_relations_senior_id_is_active_idx" ON "public"."caregiver_relations"("senior_id", "is_active");

-- CreateIndex
CREATE INDEX "confirmations_user_id_scheduled_time_idx" ON "public"."confirmations"("user_id", "scheduled_time");

-- CreateIndex
CREATE INDEX "confirmations_schedule_id_scheduled_time_idx" ON "public"."confirmations"("schedule_id", "scheduled_time");

-- CreateIndex
CREATE INDEX "medications_user_id_is_active_idx" ON "public"."medications"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "medications_created_by_is_active_idx" ON "public"."medications"("created_by", "is_active");

-- CreateIndex
CREATE INDEX "schedules_medication_id_is_active_idx" ON "public"."schedules"("medication_id", "is_active");

-- CreateIndex
CREATE INDEX "schedules_frequency_is_active_idx" ON "public"."schedules"("frequency", "is_active");

-- AddForeignKey
ALTER TABLE "public"."buzzer_logs" ADD CONSTRAINT "buzzer_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."buzzer_logs" ADD CONSTRAINT "buzzer_logs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
