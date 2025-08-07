import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Req,
  Delete,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { FCMTokenService } from '../services/fcm-token.service';
import { PrismaService } from '../services/prisma.service';
import { AuthenticatedRequest, AuthGuard } from '../guard/auth.guard';
import { RoleGuard } from '../guard/role.guard';
import { Roles } from '../decorators/roles.decorators';
import { Role } from 'generated/prisma';
import { RegisterFCMTokenDto, TestNotificationDto, UpdateNotificationSettingsDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(AuthGuard, RoleGuard)
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly fcmTokenService: FCMTokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get user's notifications
   */
  @Get()
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getUserNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const userId = req.user.id;
      const limitNum = limit ? parseInt(limit) : 50;
      const offsetNum = offset ? parseInt(offset) : 0;

      const notifications = await this.notificationService.getUserNotifications(
        userId,
        limitNum,
        offsetNum,
      );

      return {
        success: true,
        data: notifications,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: notifications.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notifications',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification logs
   */
  @Get('logs')
  @Roles(Role.ADMIN)
  async getNotificationLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('event') event?: string,
    @Query('status') status?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const offsetNum = offset ? parseInt(offset) : 0;

      const where: any = {};
      if (event) where.event = event;
      if (status) where.status = status;

      const logs = await this.prisma.notificationLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offsetNum,
        include: {
          notification: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return {
        success: true,
        data: logs,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: logs.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification logs',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's notification settings
   */
  @Get('settings')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getUserNotificationSettings(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.id;

      const settings = await this.prisma.notificationSetting.findMany({
        where: { userId },
        orderBy: { channel: 'asc' },
      });

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update user's notification settings
   */
  @Put('settings')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async updateNotificationSettings(
    @Body() updateDto: UpdateNotificationSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const setting = await this.prisma.notificationSetting.upsert({
        where: {
          userId_channel: {
            userId,
            channel: updateDto.channel as any,
          },
        },
        update: {
          isEnabled: updateDto.isEnabled,
          preferredTime: updateDto.preferredTime,
          timezone: updateDto.timezone,
          quietHoursStart: updateDto.quietHoursStart,
          quietHoursEnd: updateDto.quietHoursEnd,
          maxNotificationsPerDay: updateDto.maxNotificationsPerDay,
        },
        create: {
          userId,
          channel: updateDto.channel as any,
          isEnabled: updateDto.isEnabled,
          preferredTime: updateDto.preferredTime,
          timezone: updateDto.timezone,
          quietHoursStart: updateDto.quietHoursStart,
          quietHoursEnd: updateDto.quietHoursEnd,
          maxNotificationsPerDay: updateDto.maxNotificationsPerDay,
        },
      });

      return {
        success: true,
        data: setting,
        message: 'Notification settings updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update notification settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test notification
   */
  @Post('settings/test')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async testNotification(
    @Body() testDto: TestNotificationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const notificationData = {
        userId,
        scheduleId: '', // Not tied to a specific schedule
        type: 'SYSTEM_NOTIFICATION' as any,
        title: testDto.title,
        message: testDto.message,
        scheduledFor: new Date(),
        channels: testDto.channels as any,
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      };

      const result =
        await this.notificationService.sendNotification(notificationData);

      return {
        success: result.success,
        data: {
          notificationId: result.notificationId,
          channelResults: result.channelResults,
        },
        message: result.success
          ? 'Test notification sent successfully'
          : 'Failed to send test notification',
        errors: result.errors,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to send test notification',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification statistics
   */
  @Get('stats')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getNotificationStats(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.id;

      const stats =
        await this.notificationService.getUserNotificationStats(userId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Subscribe to push notification topic
   */
  @Post('push/subscribe/:topic')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async subscribeToTopic(
    @Param('topic') topic: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const success = await this.pushNotificationService.subscribeToTopic(
        userId,
        topic,
      );

      return {
        success,
        message: success
          ? `Successfully subscribed to topic: ${topic}`
          : `Failed to subscribe to topic: ${topic}`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to subscribe to topic',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification details
   */
  @Get(':id')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getNotification(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const notification = await this.prisma.notification.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          schedule: {
            include: {
              medication: true,
            },
          },
          logs: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!notification) {
        throw new HttpException(
          {
            success: false,
            message: 'Notification not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: notification,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Confirm a notification
   */
  @Post(':id/confirm')
  @Roles(Role.SENIOR, Role.CAREGIVER)
  async confirmNotification(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const success = await this.notificationService.confirmNotification(
        id,
        userId,
      );

      if (!success) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to confirm notification',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Notification confirmed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to confirm notification',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Unsubscribe from push notification topic
   */
  @Post('push/unsubscribe/:topic')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async unsubscribeFromTopic(
    @Param('topic') topic: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const success = await this.pushNotificationService.unsubscribeFromTopic(
        userId,
        topic,
      );

      return {
        success,
        message: success
          ? `Successfully unsubscribed from topic: ${topic}`
          : `Failed to unsubscribe from topic: ${topic}`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to unsubscribe from topic',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send push notification to topic (Admin only)
   */
  @Post('push/topic/:topic')
  @Roles(Role.ADMIN)
  async sendToTopic(
    @Param('topic') topic: string,
    @Body()
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    try {
      const result = await this.pushNotificationService.sendToTopic(
        topic,
        payload,
      );

      return {
        success: result.success,
        data: {
          messageId: result.messageId,
          recipientCount: result.recipientCount,
        },
        message: result.success
          ? `Push notification sent to topic: ${topic}`
          : `Failed to send push notification to topic: ${topic}`,
        error: result.error,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to send push notification to topic',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Register FCM token
   */
  @Post('push/register-token')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async registerFCMToken(
    @Body() tokenDto: RegisterFCMTokenDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const success = await this.fcmTokenService.storeToken({
        userId,
        token: tokenDto.token,
        deviceId: tokenDto.deviceId,
        deviceType: tokenDto.deviceType,
        appVersion: tokenDto.appVersion,
        isActive: true,
      });

      return {
        success,
        message: success
          ? 'FCM token registered successfully'
          : 'Failed to register FCM token',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to register FCM token',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Unregister FCM token
   */
  @Post('push/unregister-token')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async unregisterFCMToken(
    @Body() tokenDto: { token: string },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const success = await this.fcmTokenService.deactivateToken(
        userId,
        tokenDto.token,
      );

      return {
        success,
        message: success
          ? 'FCM token unregistered successfully'
          : 'Failed to unregister FCM token',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to unregister FCM token',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mark multiple notifications as read
   */
  @Post('bulk/mark-read')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async markNotificationsAsRead(
    @Body() body: { notificationIds: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const result = await this.prisma.notification.updateMany({
        where: {
          id: { in: body.notificationIds },
          userId,
        },
        data: {
          status: 'READ' as any,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: {
          updatedCount: result.count,
          totalRequested: body.notificationIds.length,
        },
        message: `Marked ${result.count} notifications as read`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to mark notifications as read',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete multiple notifications
   */
  @Delete('bulk/delete')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async deleteNotifications(
    @Body() body: { notificationIds: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const result = await this.prisma.notification.deleteMany({
        where: {
          id: { in: body.notificationIds },
          userId,
        },
      });

      return {
        success: true,
        data: {
          deletedCount: result.count,
          totalRequested: body.notificationIds.length,
        },
        message: `Deleted ${result.count} notifications`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete notifications',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification templates (Admin only)
   */
  @Get('templates')
  @Roles(Role.ADMIN)
  async getNotificationTemplates(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    try {
      const where: any = {};
      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const templates = await this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification templates',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create notification template (Admin only)
   */
  @Post('templates')
  @Roles(Role.ADMIN)
  async createNotificationTemplate(
    @Body()
    templateData: {
      name: string;
      type: string;
      channel: string;
      title: string;
      content: string;
      variables: string[];
      isActive: boolean;
    },
  ) {
    try {
      const template = await this.prisma.notificationTemplate.create({
        data: {
          name: templateData.name,
          type: templateData.type as any,
          channel: templateData.channel as any,
          title: templateData.title,
          content: templateData.content,
          variables: templateData.variables,
          isActive: templateData.isActive,
        },
      });

      return {
        success: true,
        data: template,
        message: 'Notification template created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create notification template',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update notification template (Admin only)
   */
  @Put('templates/:id')
  @Roles(Role.ADMIN)
  async updateNotificationTemplate(
    @Param('id') id: string,
    @Body()
    templateData: {
      name?: string;
      type?: string;
      channel?: string;
      title?: string;
      content?: string;
      variables?: string[];
      isActive?: boolean;
    },
  ) {
    try {
      const updateData: any = {};
      if (templateData.name !== undefined) updateData.name = templateData.name;
      if (templateData.type !== undefined)
        updateData.type = templateData.type as any;
      if (templateData.channel !== undefined)
        updateData.channel = templateData.channel as any;
      if (templateData.title !== undefined)
        updateData.title = templateData.title;
      if (templateData.content !== undefined)
        updateData.content = templateData.content;
      if (templateData.variables !== undefined)
        updateData.variables = templateData.variables;
      if (templateData.isActive !== undefined)
        updateData.isActive = templateData.isActive;

      const template = await this.prisma.notificationTemplate.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        data: template,
        message: 'Notification template updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update notification template',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete notification template (Admin only)
   */
  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  async deleteNotificationTemplate(@Param('id') id: string) {
    try {
      await this.prisma.notificationTemplate.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Notification template deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete notification template',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification analytics (Admin only)
   */
  @Get('analytics')
  @Roles(Role.ADMIN)
  async getNotificationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('channel') channel?: string,
  ) {
    try {
      const where: any = {};

      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      if (type) where.type = type;
      if (channel) where.channel = channel;

      const [
        totalNotifications,
        sentNotifications,
        failedNotifications,
        channelStats,
      ] = await Promise.all([
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({
          where: { ...where, status: 'SENT' as any },
        }),
        this.prisma.notification.count({
          where: { ...where, status: 'FAILED' as any },
        }),
        this.prisma.notification.groupBy({
          by: ['channel'],
          where,
          _count: { channel: true },
        }),
      ]);

      const successRate =
        totalNotifications > 0
          ? (sentNotifications / totalNotifications) * 100
          : 0;

      return {
        success: true,
        data: {
          totalNotifications,
          sentNotifications,
          failedNotifications,
          successRate: Math.round(successRate * 100) / 100,
          channelStats: channelStats.map((stat) => ({
            channel: stat.channel,
            count: stat._count.channel,
          })),
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification analytics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's notification preferences summary
   */
  @Get('preferences/summary')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getNotificationPreferencesSummary(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.id;

      const settings = await this.prisma.notificationSetting.findMany({
        where: { userId },
      });

      const summary = {
        totalChannels: settings.length,
        enabledChannels: settings.filter((s) => s.isEnabled).length,
        disabledChannels: settings.filter((s) => !s.isEnabled).length,
        channels: settings.map((setting) => ({
          channel: setting.channel,
          isEnabled: setting.isEnabled,
          hasQuietHours: !!(setting.quietHoursStart && setting.quietHoursEnd),
          hasPreferredTime: !!setting.preferredTime,
        })),
      };

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification preferences summary',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reset user's notification settings to defaults
   */
  @Post('settings/reset')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async resetNotificationSettings(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.id;

      // Delete existing settings
      await this.prisma.notificationSetting.deleteMany({
        where: { userId },
      });

      // Create default settings
      const defaultChannels = ['EMAIL', 'PUSH', 'SMS'] as any[];
      const defaultSettings = defaultChannels.map((channel) => ({
        userId,
        channel,
        isEnabled: true,
        timezone: 'UTC',
        maxNotificationsPerDay: 10,
      }));

      await this.prisma.notificationSetting.createMany({
        data: defaultSettings,
      });

      return {
        success: true,
        message: 'Notification settings reset to defaults successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to reset notification settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification delivery status
   */
  @Get(':id/delivery-status')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getNotificationDeliveryStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.id;

      const notification = await this.prisma.notification.findFirst({
        where: { id, userId },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!notification) {
        throw new HttpException(
          {
            success: false,
            message: 'Notification not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const deliveryStatus = {
        notificationId: notification.id,
        status: notification.status,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
        logs: notification.logs.map((log) => ({
          event: log.event,
          status: log.status,
          message: log.message,
          timestamp: log.createdAt,
        })),
      };

      return {
        success: true,
        data: deliveryStatus,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification delivery status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send emergency notification (Admin only)
   */
  @Post('emergency')
  @Roles(Role.ADMIN)
  async sendEmergencyNotification(
    @Body()
    emergencyData: {
      userIds: string[];
      title: string;
      message: string;
      priority: 'HIGH' | 'URGENT';
      channels: string[];
    },
  ) {
    try {
      const results: Array<{
        userId: string;
        success: boolean;
        notificationId?: string;
        errors?: string[];
      }> = [];

      for (const userId of emergencyData.userIds) {
        const notificationData = {
          userId,
          scheduleId: '', // Not tied to a specific schedule
          type: 'EMERGENCY' as any,
          title: emergencyData.title,
          message: emergencyData.message,
          scheduledFor: new Date(),
          channels: emergencyData.channels as any,
          metadata: {
            priority: emergencyData.priority,
            emergency: true,
            timestamp: new Date().toISOString(),
          },
        };

        const result =
          await this.notificationService.sendNotification(notificationData);
        results.push({
          userId,
          success: result.success,
          notificationId: result.notificationId,
          errors: result.errors,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: true,
        data: {
          totalSent: results.length,
          successCount,
          failureCount,
          results,
        },
        message: `Emergency notification sent to ${successCount} out of ${results.length} users`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to send emergency notification',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's active FCM tokens
   */
  @Get('push/tokens')
  @Roles(Role.SENIOR, Role.CAREGIVER, Role.ADMIN)
  async getUserFCMTokens(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.id;

      const tokens = await this.prisma.fCMToken.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          token: true,
          deviceId: true,
          deviceType: true,
          appVersion: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return {
        success: true,
        data: tokens,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch FCM tokens',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get notification channels status
   */
  @Get('channels/status')
  @Roles(Role.ADMIN)
  async getNotificationChannelsStatus() {
    try {
      const channelStats = await this.prisma.notification.groupBy({
        by: ['channel', 'status'],
        _count: { channel: true },
      });

      const statusByChannel = {};

      channelStats.forEach((stat) => {
        if (!statusByChannel[stat.channel]) {
          statusByChannel[stat.channel] = {};
        }
        statusByChannel[stat.channel][stat.status] = stat._count.channel;
      });

      return {
        success: true,
        data: statusByChannel,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch notification channels status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
