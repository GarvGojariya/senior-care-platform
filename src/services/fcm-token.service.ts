import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface FCMTokenData {
  userId: string;
  token: string;
  deviceId?: string;
  deviceType?: 'android' | 'ios' | 'web';
  appVersion?: string;
  isActive: boolean;
}

@Injectable()
export class FCMTokenService {
  private readonly logger = new Logger(FCMTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store or update FCM token for a user
   */
  async storeToken(tokenData: FCMTokenData): Promise<boolean> {
    try {
      // First, deactivate any existing tokens for this user and device
      await this.prisma.fCMToken.updateMany({
        where: {
          userId: tokenData.userId,
          deviceId: tokenData.deviceId,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Store the new token
      await this.prisma.fCMToken.create({
        data: {
          userId: tokenData.userId,
          token: tokenData.token,
          deviceId: tokenData.deviceId,
          deviceType: tokenData.deviceType,
          appVersion: tokenData.appVersion,
          isActive: true,
        },
      });

      this.logger.log(`FCM token stored for user: ${tokenData.userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to store FCM token for user ${tokenData.userId}:`, error);
      return false;
    }
  }

  /**
   * Get active FCM tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await this.prisma.fCMToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          token: true,
        },
      });

      return tokens.map(t => t.token);
    } catch (error) {
      this.logger.error(`Failed to get FCM tokens for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get a single active FCM token for a user
   */
  async getUserToken(userId: string): Promise<string | null> {
    try {
      const token = await this.prisma.fCMToken.findFirst({
        where: {
          userId,
          isActive: true,
        },
        select: {
          token: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return token?.token || null;
    } catch (error) {
      this.logger.error(`Failed to get FCM token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Deactivate FCM token
   */
  async deactivateToken(userId: string, token: string): Promise<boolean> {
    try {
      await this.prisma.fCMToken.updateMany({
        where: {
          userId,
          token,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`FCM token deactivated for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to deactivate FCM token for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Deactivate all tokens for a user
   */
  async deactivateAllUserTokens(userId: string): Promise<boolean> {
    try {
      await this.prisma.fCMToken.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`All FCM tokens deactivated for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to deactivate all FCM tokens for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats() {
    try {
      const stats = await this.prisma.fCMToken.groupBy({
        by: ['deviceType', 'isActive'],
        _count: {
          id: true,
        },
      });

      return stats.reduce((acc, stat) => {
        const key = `${stat.deviceType}_${stat.isActive ? 'active' : 'inactive'}`;
        acc[key] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      this.logger.error('Failed to get FCM token statistics:', error);
      return {};
    }
  }

  /**
   * Clean up old inactive tokens
   */
  async cleanupOldTokens(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.fCMToken.deleteMany({
        where: {
          isActive: false,
          updatedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old FCM tokens`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old FCM tokens:', error);
      return 0;
    }
  }
} 