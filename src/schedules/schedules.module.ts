import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { ScheduleProcessorService } from './schedule-processor.service';
import { PrismaModule } from 'src/services/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, ScheduleProcessorService, JwtService],
})
export class SchedulesModule {}
