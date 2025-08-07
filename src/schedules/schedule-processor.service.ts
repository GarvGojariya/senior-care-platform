import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../services/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import {
  NotificationStatus,
  DaysOfWeek,
} from 'generated/prisma';

@Injectable()
export class ScheduleProcessorService {
  private readonly logger = new Logger(ScheduleProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process medication schedules every minute
   * This checks for schedules that need notifications sent
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processMedicationSchedules() {
    try {
      this.logger.log('🕐 Processing medication schedules...');
      
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const currentDay = this.getCurrentDayOfWeek();

      // Find active schedules that need notifications
      const schedulesToProcess = await this.prisma.schedule.findMany({
        where: {
          isActive: true,
          daysOfWeek: {
            has: currentDay,
          },
          // Check if it's time to send notification
          OR: [
            {
              // Schedules with specific reminder minutes before
              reminderMinutesBefore: {
                not: null,
              },
              nextNotificationDue: {
                lte: now,
              },
            },
            {
              // Schedules without specific reminder time (default 15 minutes before)
              reminderMinutesBefore: null,
              nextNotificationDue: {
                lte: now,
              },
            },
          ],
          notificationStatus: {
            not: NotificationStatus.SENT,
          },
        },
        include: {
          medication: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.log(`Found ${schedulesToProcess.length} schedules to process`);

      for (const schedule of schedulesToProcess) {
        try {
          await this.processSchedule(schedule, now);
        } catch (error) {
          this.logger.error(`Failed to process schedule ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error processing medication schedules:', error);
    }
  }

  /**
   * Check for missed doses every 30 minutes
   */
  @Cron('0 */30 * * * *') // Every 30 minutes
  async checkForMissedDoses() {
    try {
      this.logger.log('🔍 Checking for missed doses...');
      
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // Find schedules that should have been taken but weren't confirmed
      const missedSchedules = await this.prisma.schedule.findMany({
        where: {
          isActive: true,
          nextNotificationDue: {
            lte: thirtyMinutesAgo,
          },
          notificationStatus: NotificationStatus.SENT,
        },
        include: {
          medication: {
            include: {
              user: true,
            },
          },
          confirmations: {
            where: {
              scheduledTime: {
                gte: thirtyMinutesAgo,
              },
            },
          },
        },
      });

      this.logger.log(`Found ${missedSchedules.length} potentially missed doses`);

      for (const schedule of missedSchedules) {
        try {
          // Check if there's no confirmation for this time period
          if (schedule.confirmations.length === 0) {
            await this.handleMissedDose(schedule, now);
          }
        } catch (error) {
          this.logger.error(`Failed to handle missed dose for schedule ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error checking for missed doses:', error);
    }
  }

  /**
   * Process escalation alerts every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processEscalationAlerts() {
    try {
      this.logger.log('🚨 Processing escalation alerts...');
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Find seniors with multiple missed doses
      const seniorsWithMissedDoses = await this.prisma.user.findMany({
        where: {
          role: 'SENIOR',
          medications: {
            some: {
              schedules: {
                some: {
                  isActive: true,
                  nextNotificationDue: {
                    lte: oneHourAgo,
                  },
                  notificationStatus: NotificationStatus.SENT,
                  confirmations: {
                    none: {
                      scheduledTime: {
                        gte: oneHourAgo,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          medications: {
            include: {
              schedules: {
                where: {
                  isActive: true,
                  nextNotificationDue: {
                    lte: oneHourAgo,
                  },
                  notificationStatus: NotificationStatus.SENT,
                  confirmations: {
                    none: {
                      scheduledTime: {
                        gte: oneHourAgo,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${seniorsWithMissedDoses.length} seniors with missed doses`);

      for (const senior of seniorsWithMissedDoses) {
        try {
          await this.handleEscalationAlert(senior, now);
        } catch (error) {
          this.logger.error(`Failed to handle escalation alert for senior ${senior.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error processing escalation alerts:', error);
    }
  }

  /**
   * Process a single schedule
   */
  private async processSchedule(schedule: any, now: Date) {
    const { medication } = schedule;
    const scheduledTime = this.calculateScheduledTime(schedule, now);
    
    // Send medication reminder
    const result = await this.notificationService.sendMedicationReminder(
      schedule.id,
      scheduledTime,
    );

    if (result.success) {
      // Calculate next notification time
      const nextNotificationTime = this.calculateNextNotificationTime(schedule, now);
      
      // Update schedule
      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          lastNotificationSent: now,
          nextNotificationDue: nextNotificationTime,
          notificationStatus: NotificationStatus.SENT,
        },
      });

      this.logger.log(`✅ Sent medication reminder for schedule ${schedule.id}`);
    } else {
      this.logger.error(`❌ Failed to send medication reminder for schedule ${schedule.id}:`, result.errors);
      
      // Update schedule with failed status
      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          notificationStatus: NotificationStatus.FAILED,
        },
      });
    }
  }

  /**
   * Handle missed dose
   */
  private async handleMissedDose(schedule: any, now: Date) {
    const scheduledTime = this.calculateScheduledTime(schedule, now);
    
    // Send missed dose alert
    const result = await this.notificationService.sendMissedDoseAlert(
      schedule.id,
      scheduledTime,
    );

    if (result.success) {
      this.logger.log(`✅ Sent missed dose alert for schedule ${schedule.id}`);
    } else {
      this.logger.error(`❌ Failed to send missed dose alert for schedule ${schedule.id}:`, result.errors);
    }
  }

  /**
   * Handle escalation alert for a senior
   */
  private async handleEscalationAlert(senior: any, now: Date) {
    // Count missed doses per medication
    const missedMedications = new Map<string, number>();

    for (const medication of senior.medications) {
      const missedCount = medication.schedules.filter(
        (schedule: any) => schedule.confirmations.length === 0
      ).length;

      if (missedCount > 0) {
        missedMedications.set(medication.name, missedCount);
      }
    }

    // Send escalation alerts for each medication with missed doses
    for (const [medicationName, missedCount] of missedMedications) {
      const results = await this.notificationService.sendEscalationAlert(
        senior.id,
        medicationName,
        missedCount,
      );

      const successCount = results.filter(result => result.success).length;
      this.logger.log(`✅ Sent ${successCount}/${results.length} escalation alerts for ${medicationName}`);
    }
  }

  /**
   * Calculate the scheduled time for a medication
   */
  private calculateScheduledTime(schedule: any, now: Date): Date {
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
  private calculateNextNotificationTime(schedule: any, now: Date): Date {
    const reminderMinutes = schedule.reminderMinutesBefore || 15;
    const scheduledTime = this.calculateScheduledTime(schedule, now);
    
    const nextNotificationTime = new Date(scheduledTime);
    nextNotificationTime.setMinutes(nextNotificationTime.getMinutes() - reminderMinutes);
    
    return nextNotificationTime;
  }

  /**
   * Get current day of week as DaysOfWeek enum
   */
  private getCurrentDayOfWeek(): DaysOfWeek {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()] as DaysOfWeek;
  }

  /**
   * Manually trigger schedule processing for testing
   */
  async triggerScheduleProcessing() {
    this.logger.log('🔄 Manually triggering schedule processing...');
    await this.processMedicationSchedules();
  }

  /**
   * Manually trigger missed dose checking for testing
   */
  async triggerMissedDoseCheck() {
    this.logger.log('🔄 Manually triggering missed dose check...');
    await this.checkForMissedDoses();
  }

  /**
   * Manually trigger escalation alert processing for testing
   */
  async triggerEscalationAlertProcessing() {
    this.logger.log('🔄 Manually triggering escalation alert processing...');
    await this.processEscalationAlerts();
  }
} 