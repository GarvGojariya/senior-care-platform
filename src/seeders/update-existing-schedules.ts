import { PrismaClient } from 'generated/prisma';

const prisma = new PrismaClient();

/**
 * Update existing schedules with calculated nextNotificationDue
 * This script should be run once to fix existing schedules
 */
async function updateExistingSchedules() {
  try {
    console.log('🔄 Starting update of existing schedules...');

    // Find all active schedules without nextNotificationDue
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        nextNotificationDue: null,
      },
      include: {
        medication: true,
      },
    });

    console.log(`📊 Found ${existingSchedules.length} existing schedules to update`);

    if (existingSchedules.length === 0) {
      console.log('✅ No schedules need updating');
      return;
    }

    const updatedSchedules: any[] = [];
    const errors: Array<{ scheduleId: string; error: string }> = [];

    for (const schedule of existingSchedules) {
      try {
        const now = new Date();
        const nextNotificationTime = calculateNextNotificationTime(schedule, now);

        const updatedSchedule = await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            nextNotificationDue: nextNotificationTime,
          },
        });

        updatedSchedules.push(updatedSchedule);
        console.log(`✅ Updated schedule ${schedule.id} (${schedule.medication.name}) with nextNotificationDue: ${nextNotificationTime}`);
      } catch (error) {
        console.error(`❌ Failed to update schedule ${schedule.id}:`, error);
        errors.push({ scheduleId: schedule.id, error: error.message });
      }
    }

    console.log('\n📈 Update Summary:');
    console.log(`Total schedules found: ${existingSchedules.length}`);
    console.log(`Successfully updated: ${updatedSchedules.length}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => {
        console.log(`- Schedule ${error.scheduleId}: ${error.error}`);
      });
    }

    console.log('\n✅ Update process completed!');
  } catch (error) {
    console.error('❌ Failed to update existing schedules:', error);
    throw error;
  }
}

/**
 * Calculate the scheduled time for a medication
 */
function calculateScheduledTime(schedule: any, now: Date): Date {
  const [hours, minutes] = schedule.time.split(':').map(Number);
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  // If the scheduled time has passed today, it's for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  return scheduledTime;
}

/**
 * Calculate the next notification time for a schedule
 */
function calculateNextNotificationTime(schedule: any, now: Date): Date {
  const reminderMinutes = schedule.reminderMinutesBefore || 15;
  const scheduledTime = calculateScheduledTime(schedule, now);
  
  const nextNotificationTime = new Date(scheduledTime);
  nextNotificationTime.setMinutes(nextNotificationTime.getMinutes() - reminderMinutes);
  
  return nextNotificationTime;
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateExistingSchedules()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { updateExistingSchedules };
