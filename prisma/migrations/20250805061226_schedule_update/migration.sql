/*
  Warnings:

  - The values [DAILY,WEEKLY,CUSTOM] on the enum `Frequency` will be removed. If these variants are still used in the database, this will fail.
  - The `days_of_week` column on the `schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."DaysOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Frequency_new" AS ENUM ('ONCE', 'TWICE', 'THREE_TIMES', 'FOUR_TIMES');
ALTER TABLE "public"."schedules" ALTER COLUMN "frequency" TYPE "public"."Frequency_new" USING ("frequency"::text::"public"."Frequency_new");
ALTER TYPE "public"."Frequency" RENAME TO "Frequency_old";
ALTER TYPE "public"."Frequency_new" RENAME TO "Frequency";
DROP TYPE "public"."Frequency_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."schedules" DROP COLUMN "days_of_week",
ADD COLUMN     "days_of_week" "public"."DaysOfWeek"[];
