import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { EmailService } from '../services/email.service';
import { PushNotificationService } from './push-notification.service';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  NotificationEvent,
} from 'generated/prisma';

export interface NotificationData {
  userId: string;
  scheduleId: string;
  type: NotificationType;
  title: string;
  message: string;
  scheduledFor: Date;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  errors?: string[];
  channelResults: Record<NotificationChannel, boolean>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Create and send a notification
   */
  async sendNotification(data: NotificationData): Promise<NotificationResult> {
    const { userId, scheduleId, type, title, message, scheduledFor, channels, metadata } = data;

    try {
      // Get user's notification settings
      const userSettings = await this.getUserNotificationSettings(userId);
      
      // Determine which channels to use
      const channelsToUse = channels || this.getDefaultChannels(type);
      const enabledChannels = channelsToUse.filter(channel => 
        userSettings[channel]?.isEnabled
      );

      if (enabledChannels.length === 0) {
        this.logger.warn(`No enabled notification channels for user: ${userId}`);
        return {
          success: false,
          errors: ['No enabled notification channels'],
          channelResults: {} as Record<NotificationChannel, boolean>,
        };
      }

      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          scheduleId,
          userId,
          type,
          channel: enabledChannels[0], // Primary channel
          status: NotificationStatus.PENDING,
          title,
          message,
          scheduledFor,
          metadata,
        },
      });

      // Log notification creation
      await this.logNotificationEvent(notification.id, NotificationEvent.CREATED, NotificationStatus.PENDING);

      // Send notifications through all enabled channels
      const channelResults: Record<NotificationChannel, boolean> = {} as Record<NotificationChannel, boolean>;
      const errors: string[] = [];

      for (const channel of enabledChannels) {
        try {
          const success = await this.sendNotificationToChannel(notification.id, channel, {
            userId,
            title,
            message,
            metadata,
          });
          
          channelResults[channel] = success;
          
          if (!success) {
            errors.push(`Failed to send ${channel} notification`);
          }
        } catch (error) {
          this.logger.error(`Error sending ${channel} notification:`, error);
          channelResults[channel] = false;
          errors.push(`${channel} notification error: ${error.message}`);
        }
      }

      // Update notification status
      const overallSuccess = Object.values(channelResults).some(success => success);
      const finalStatus = overallSuccess ? NotificationStatus.SENT : NotificationStatus.FAILED;
      
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: finalStatus,
          sentAt: overallSuccess ? new Date() : undefined,
          errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
        },
      });

      // Log final status
      await this.logNotificationEvent(
        notification.id,
        overallSuccess ? NotificationEvent.SENT : NotificationEvent.FAILED,
        finalStatus,
        errors.length > 0 ? errors.join('; ') : undefined,
      );

      return {
        success: overallSuccess,
        notificationId: notification.id,
        errors: errors.length > 0 ? errors : undefined,
        channelResults,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification:`, error);
      return {
        success: false,
        errors: [error.message],
        channelResults: {} as Record<NotificationChannel, boolean>,
      };
    }
  }

  /**
   * Send medication reminder notification
   */
  async sendMedicationReminder(
    scheduleId: string,
    scheduledTime: Date,
  ): Promise<NotificationResult> {
    try {
      // Get schedule with medication and user details
      const schedule = await this.prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          medication: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!schedule || !schedule.medication) {
        throw new Error(`Schedule or medication not found: ${scheduleId}`);
      }

      const { medication } = schedule;
      const { user } = medication;

      // Create notification data
      const notificationData: NotificationData = {
        userId: user.id,
        scheduleId,
        type: NotificationType.MEDICATION_REMINDER,
        title: 'Medication Reminder',
        message: `Time to take ${medication.name} - ${medication.dosage}`,
        scheduledFor: scheduledTime,
        channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
        metadata: {
          medicationName: medication.name,
          dosage: medication.dosage,
          instructions: medication.instructions,
          scheduledTime: scheduledTime.toISOString(),
        },
      };

      // Send the notification
      const result = await this.sendNotification(notificationData);

      // Update schedule notification status
      if (result.success) {
        await this.prisma.schedule.update({
          where: { id: scheduleId },
          data: {
            lastNotificationSent: new Date(),
            notificationStatus: NotificationStatus.SENT,
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to send medication reminder for schedule ${scheduleId}:`, error);
      return {
        success: false,
        errors: [error.message],
        channelResults: {} as Record<NotificationChannel, boolean>,
      };
    }
  }

  /**
   * Send missed dose alert
   */
  async sendMissedDoseAlert(
    scheduleId: string,
    missedTime: Date,
  ): Promise<NotificationResult> {
    try {
      // Get schedule with medication and user details
      const schedule = await this.prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          medication: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!schedule || !schedule.medication) {
        throw new Error(`Schedule or medication not found: ${scheduleId}`);
      }

      const { medication } = schedule;
      const { user } = medication;

      // Create notification data
      const notificationData: NotificationData = {
        userId: user.id,
        scheduleId,
        type: NotificationType.MISSED_DOSE_ALERT,
        title: 'Missed Medication Alert',
        message: `You missed taking ${medication.name} - ${medication.dosage} at ${missedTime.toLocaleTimeString()}`,
        scheduledFor: new Date(),
        channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
        metadata: {
          medicationName: medication.name,
          dosage: medication.dosage,
          missedTime: missedTime.toISOString(),
        },
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      this.logger.error(`Failed to send missed dose alert for schedule ${scheduleId}:`, error);
      return {
        success: false,
        errors: [error.message],
        channelResults: {} as Record<NotificationChannel, boolean>,
      };
    }
  }

  /**
   * Send escalation alert to caregivers
   */
  async sendEscalationAlert(
    seniorId: string,
    medicationName: string,
    missedCount: number,
  ): Promise<NotificationResult[]> {
    try {
      // Get senior user details
      const senior = await this.prisma.user.findUnique({
        where: { id: seniorId },
      });

      if (!senior) {
        throw new Error(`Senior user not found: ${seniorId}`);
      }

      // Get all active caregivers for this senior
      const caregiverRelations = await this.prisma.caregiverRelation.findMany({
        where: {
          seniorId,
          isActive: true,
        },
        include: {
          caregiver: true,
        },
      });

      if (caregiverRelations.length === 0) {
        this.logger.warn(`No active caregivers found for senior: ${seniorId}`);
        return [];
      }

      const results: NotificationResult[] = [];

      // Send escalation alert to each caregiver
      for (const relation of caregiverRelations) {
        const { caregiver } = relation;

        const notificationData: NotificationData = {
          userId: caregiver.id,
          scheduleId: '', // Not tied to a specific schedule
          type: NotificationType.ESCALATION_ALERT,
          title: 'Care Alert',
          message: `${senior.firstName} ${senior.lastName} has missed ${missedCount} dose(s) of ${medicationName}`,
          scheduledFor: new Date(),
          channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.SMS],
          metadata: {
            seniorId,
            seniorName: `${senior.firstName} ${senior.lastName}`,
            medicationName,
            missedCount,
            relationship: relation.relationship,
          },
        };

        const result = await this.sendNotification(notificationData);
        results.push(result);
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to send escalation alert for senior ${seniorId}:`, error);
      return [{
        success: false,
        errors: [error.message],
        channelResults: {} as Record<NotificationChannel, boolean>,
      }];
    }
  }

  /**
   * Confirm a notification
   */
  async confirmNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || notification.userId !== userId) {
        throw new Error('Notification not found or access denied');
      }

      // Update notification status
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // Log confirmation event
      await this.logNotificationEvent(
        notificationId,
        NotificationEvent.CONFIRMED,
        NotificationStatus.CONFIRMED,
      );

      // If this is a medication reminder, create a confirmation record
      if (notification.type === NotificationType.MEDICATION_REMINDER) {
        await this.prisma.confirmation.create({
          data: {
            scheduleId: notification.scheduleId,
            userId: notification.userId,
            scheduledTime: notification.scheduledFor,
            confirmedAt: new Date(),
            method: 'APP',
            notificationId: notification.id,
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to confirm notification ${notificationId}:`, error);
      return false;
    }
  }

  /**
   * Get user's notification settings
   */
  private async getUserNotificationSettings(userId: string) {
    const settings = await this.prisma.notificationSetting.findMany({
      where: { userId },
    });

    const settingsMap: Record<NotificationChannel, any> = {} as Record<NotificationChannel, any>;
    
    for (const setting of settings) {
      settingsMap[setting.channel] = setting;
    }

    return settingsMap;
  }

  /**
   * Get default channels for notification type
   */
  private getDefaultChannels(type: NotificationType): NotificationChannel[] {
    switch (type) {
      case NotificationType.MEDICATION_REMINDER:
        return [NotificationChannel.PUSH, NotificationChannel.EMAIL];
      case NotificationType.MISSED_DOSE_ALERT:
        return [NotificationChannel.PUSH, NotificationChannel.SMS];
      case NotificationType.ESCALATION_ALERT:
        return [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.SMS];
      case NotificationType.CONFIRMATION_REQUEST:
        return [NotificationChannel.IN_APP];
      case NotificationType.SYSTEM_NOTIFICATION:
        return [NotificationChannel.EMAIL, NotificationChannel.IN_APP];
      default:
        return [NotificationChannel.EMAIL];
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotificationToChannel(
    notificationId: string,
    channel: NotificationChannel,
    data: { userId: string; title: string; message: string; metadata?: Record<string, any> },
  ): Promise<boolean> {
    try {
      switch (channel) {
        case NotificationChannel.PUSH:
          const pushPayload = this.pushNotificationService.createMedicationReminderPayload(
            data.metadata?.medicationName || 'Medication',
            data.metadata?.dosage || '1 dose',
            data.metadata?.scheduledTime || new Date().toLocaleTimeString(),
            data.metadata?.scheduleId || '',
          );
          
          const pushResult = await this.pushNotificationService.sendToUser(
            data.userId,
            pushPayload,
            notificationId,
          );
          
          return pushResult.success;

        case NotificationChannel.EMAIL:
          const emailResult = await this.emailService.sendMedicationReminder(
            data.userId,
            data.title,
            data.message,
            data.metadata,
          );
          
          // Update notification status for email
          if (emailResult.success) {
            await this.prisma.notification.update({
              where: { id: notificationId },
              data: {
                status: NotificationStatus.SENT,
                sentAt: new Date(),
              },
            });
          }
          
          return emailResult.success;

        case NotificationChannel.SMS:
          // TODO: Implement SMS service
          this.logger.warn('SMS notifications not yet implemented');
          return false;

        case NotificationChannel.VOICE:
          // TODO: Implement voice service
          this.logger.warn('Voice notifications not yet implemented');
          return false;

        case NotificationChannel.BUZZER:
          // TODO: Implement buzzer service
          this.logger.warn('Buzzer notifications not yet implemented');
          return false;

        case NotificationChannel.IN_APP:
          // In-app notifications are handled differently
          // They're typically stored and retrieved via API
          return true;

        default:
          this.logger.warn(`Unknown notification channel: ${channel}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error sending ${channel} notification:`, error);
      return false;
    }
  }

  /**
   * Log notification event
   */
  private async logNotificationEvent(
    notificationId: string,
    event: NotificationEvent,
    status: NotificationStatus,
    message?: string,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          notificationId,
          event,
          status,
          message,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log notification event:`, error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    return await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        schedule: {
          include: {
            medication: true,
          },
        },
      },
    });
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string) {
    const stats = await this.prisma.notification.groupBy({
      by: ['status', 'channel'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    return stats.reduce((acc, stat) => {
      if (!acc[stat.status]) {
        acc[stat.status] = {};
      }
      acc[stat.status][stat.channel] = stat._count.id;
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }
} 