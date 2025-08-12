import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../services/prisma.service';
import { FCMTokenService } from '../services/fcm-token.service';
import { NotificationChannel, NotificationStatus } from 'generated/prisma';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
  priority?: 'normal' | 'high';
  sound?: string;
  badge?: number;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipientCount: number;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly fcmTokenService: FCMTokenService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.app();
        return;
      }

      // Initialize Firebase Admin SDK
      const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
      
      if (serviceAccount) {
        // Use service account JSON from environment variable
        const serviceAccountJson = JSON.parse(serviceAccount);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJson),
          projectId: serviceAccountJson.project_id,
        });
      } else {
        // Use default credentials (for development)
        this.firebaseApp = admin.initializeApp({
          projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        });
      }

      this.logger.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    notificationId?: string,
  ): Promise<PushNotificationResult> {
    try {
      // Get user's FCM tokens
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          notificationSettings: {
            where: {
              channel: NotificationChannel.PUSH,
              isEnabled: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check if push notifications are enabled for this user
      const pushSettings = user.notificationSettings.find(
        (setting) => setting.channel === NotificationChannel.PUSH,
      );

      if (!pushSettings?.isEnabled) {
        this.logger.log(`Push notifications disabled for user: ${userId}`);
        return {
          success: false,
          error: 'Push notifications disabled for user',
          recipientCount: 0,
        };
      }

      // For now, we'll use a placeholder token
      // In a real implementation, you'd store FCM tokens in the database
      const fcmToken = await this.getUserFCMToken(userId);
      
      if (!fcmToken) {
        this.logger.warn(`No FCM token found for user: ${userId}`);
        return {
          success: false,
          error: 'No FCM token found for user',
          recipientCount: 0,
        };
      }

      const result = await this.sendToToken(fcmToken, payload, notificationId);
      
      // Log the notification
      if (notificationId) {
        await this.logNotificationEvent(notificationId, result);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
      
      if (notificationId) {
        await this.logNotificationEvent(notificationId, {
          success: false,
          error: error.message,
          recipientCount: 0,
        });
      }

      return {
        success: false,
        error: error.message,
        recipientCount: 0,
      };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    notificationIds?: string[],
  ): Promise<PushNotificationResult[]> {
    const results: PushNotificationResult[] = [];

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const notificationId = notificationIds?.[i];
      
      const result = await this.sendToUser(userId, payload, notificationId);
      results.push(result);
    }

    return results;
  }

  /**
   * Send push notification to a specific FCM token
   */
  async sendToToken(
    token: string,
    payload: PushNotificationPayload,
    notificationId?: string,
  ): Promise<PushNotificationResult> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: payload.sound || 'default',
            clickAction: payload.clickAction,
            icon: 'ic_notification',
            color: '#4CAF50',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: payload.badge,
              'content-available': 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            actions: [
              {
                action: 'confirm',
                title: 'Confirm',
                icon: '/confirm-icon.png',
              },
              {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/dismiss-icon.png',
              },
            ],
          },
        },
      };

      const response = await this.firebaseApp.messaging().send(message);
      
      this.logger.log(`Push notification sent successfully to token: ${token.substring(0, 10)}...`);
      
      return {
        success: true,
        messageId: response,
        recipientCount: 1,
      };
    } catch (error) {
      this.logger.error(`Failed to send push notification to token: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        recipientCount: 1,
      };
    }
  }

  /**
   * Send push notification to a topic
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: payload.sound || 'default',
            clickAction: payload.clickAction,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: payload.badge,
            },
          },
        },
      };

      const response = await this.firebaseApp.messaging().send(message);
      
      this.logger.log(`Push notification sent successfully to topic: ${topic}`);
      
      return {
        success: true,
        messageId: response,
        recipientCount: -1, // Unknown count for topics
      };
    } catch (error) {
      this.logger.error(`Failed to send push notification to topic ${topic}:`, error);
      
      return {
        success: false,
        error: error.message,
        recipientCount: 0,
      };
    }
  }

  /**
   * Subscribe a user to a topic
   */
  async subscribeToTopic(userId: string, topic: string): Promise<boolean> {
    try {
      const fcmToken = await this.getUserFCMToken(userId);
      
      if (!fcmToken) {
        throw new Error(`No FCM token found for user: ${userId}`);
      }

      const response = await this.firebaseApp.messaging().subscribeToTopic([fcmToken], topic);
      
      if (response.failureCount > 0) {
        this.logger.error(`Failed to subscribe user ${userId} to topic ${topic}:`, response.errors);
        return false;
      }

      this.logger.log(`User ${userId} subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe user ${userId} to topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe a user from a topic
   */
  async unsubscribeFromTopic(userId: string, topic: string): Promise<boolean> {
    try {
      const fcmToken = await this.getUserFCMToken(userId);
      
      if (!fcmToken) {
        throw new Error(`No FCM token found for user: ${userId}`);
      }

      const response = await this.firebaseApp.messaging().unsubscribeFromTopic([fcmToken], topic);
      
      if (response.failureCount > 0) {
        this.logger.error(`Failed to unsubscribe user ${userId} from topic ${topic}:`, response.errors);
        return false;
      }

      this.logger.log(`User ${userId} unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe user ${userId} from topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Get user's FCM token
   */
  private async getUserFCMToken(userId: string): Promise<string | null> {
    return await this.fcmTokenService.getUserToken(userId);
  }

  /**
   * Log notification event
   */
  private async logNotificationEvent(
    notificationId: string,
    result: PushNotificationResult,
  ): Promise<void> {
    try {
      const status = result.success ? NotificationStatus.SENT : NotificationStatus.FAILED;
      
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status,
          sentAt: result.success ? new Date() : undefined,
          errorMessage: result.error,
          metadata: {
            messageId: result.messageId,
            recipientCount: result.recipientCount,
          },
        },
      });

      // Log the event
      await this.prisma.notificationLog.create({
        data: {
          notificationId,
          event: result.success ? 'SENT' : 'FAILED',
          status,
          message: result.error,
          metadata: {
            messageId: result.messageId,
            recipientCount: result.recipientCount,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log notification event:`, error);
    }
  }

  /**
   * Create medication reminder payload
   */
  createMedicationReminderPayload(
    medicationName: string,
    dosage: string,
    scheduledTime: string,
    scheduleId: string,
  ): PushNotificationPayload {
    return {
      title: 'Medication Reminder',
      body: `Time to take ${medicationName} - ${dosage} at ${scheduledTime}`,
      data: {
        type: 'medication_reminder',
        scheduleId,
        medicationName,
        dosage,
        scheduledTime,
        action: 'confirm_medication',
      },
      priority: 'high',
      sound: 'default',
      clickAction: 'OPEN_MEDICATION_CONFIRMATION',
    };
  }

  /**
   * Create missed dose alert payload
   */
  createMissedDoseAlertPayload(
    medicationName: string,
    dosage: string,
    scheduledTime: string,
    scheduleId: string,
  ): PushNotificationPayload {
    return {
      title: 'Missed Medication Alert',
      body: `You missed taking ${medicationName} - ${dosage} at ${scheduledTime}`,
      data: {
        type: 'missed_dose_alert',
        scheduleId,
        medicationName,
        dosage,
        scheduledTime,
        action: 'confirm_missed_dose',
      },
      priority: 'high',
      sound: 'alert',
      clickAction: 'OPEN_MISSED_DOSE_CONFIRMATION',
    };
  }

  /**
   * Create escalation alert payload for caregivers
   */
  createEscalationAlertPayload(
    seniorName: string,
    medicationName: string,
    missedCount: number,
  ): PushNotificationPayload {
    return {
      title: 'Care Alert',
      body: `${seniorName} has missed ${missedCount} dose(s) of ${medicationName}`,
      data: {
        type: 'escalation_alert',
        seniorName,
        medicationName,
        missedCount: missedCount.toString(),
        action: 'view_senior_medications',
      },
      priority: 'high',
      sound: 'alert',
      clickAction: 'OPEN_CARE_ALERT',
    };
  }
} 