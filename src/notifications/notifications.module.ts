import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { ScheduleProcessorService } from '../schedules/schedule-processor.service';
import { EmailService } from '../services/email.service';
import { FCMTokenService } from '../services/fcm-token.service';
import { PrismaModule } from '../services/prisma.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    PushNotificationService,
    ScheduleProcessorService,
    EmailService,
    FCMTokenService,
    JwtService,
  ],
  exports: [
    NotificationService,
    PushNotificationService,
    ScheduleProcessorService,
    FCMTokenService,
  ],
})
export class NotificationsModule {}
