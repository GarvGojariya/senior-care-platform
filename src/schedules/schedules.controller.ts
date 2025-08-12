import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { ScheduleProcessorService } from './schedule-processor.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  CreateBulkScheduleDto,
  GetSchedulesQueryDto,
} from './dto/schedules.dto';
import { AuthenticatedRequest, Public } from 'src/guard/auth.guard';
import { AuthGuard } from 'src/guard/auth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { Roles } from 'src/decorators/roles.decorators';
import { Role } from 'generated/prisma';

@UseGuards(AuthGuard, RoleGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly scheduleProcessorService: ScheduleProcessorService,
  ) {}

  @Post()
  @Roles(Role.CAREGIVER, Role.ADMIN)
  async createSchedule(
    @Body() scheduleDetails: CreateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.createSchedule(
      scheduleDetails,
      req,
    );
    return {
      message: 'Schedule created successfully',
      data: res,
      success: true,
    };
  }

  @Post('bulk')
  @Roles(Role.CAREGIVER, Role.ADMIN)
  async createBulkSchedules(
    @Body() bulkScheduleDetails: CreateBulkScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.createBulkSchedules(
      bulkScheduleDetails,
      req,
    );
    return {
      message: 'Bulk schedules created successfully',
      data: res,
      success: true,
    };
  }

  @Get()
  @Roles(Role.ADMIN, Role.CAREGIVER, Role.SENIOR)
  async getSchedulesWithFilters(
    @Query() query: GetSchedulesQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.getSchedulesWithFilters(query, req);
    return {
      message: 'Schedules fetched successfully',
      data: res,
      success: true,
    };
  }

  @Get('templates')
  @Roles(Role.ADMIN, Role.CAREGIVER)
  async getScheduleTemplates() {
    const res = await this.schedulesService.getScheduleTemplates();
    return {
      message: 'Schedule templates fetched successfully',
      data: res,
      success: true,
    };
  }

  @Get('reminders/:userId')
  @Roles(Role.ADMIN, Role.CAREGIVER, Role.SENIOR)
  async getNextReminders(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    const res = await this.schedulesService.getNextReminders(
      userId,
      daysNumber,
    );
    return {
      message: 'Next reminders fetched successfully',
      data: res,
      success: true,
    };
  }

  @Get('medication/:medicationId')
  @Roles(Role.ADMIN, Role.CAREGIVER, Role.SENIOR)
  async getSchedules(
    @Param('medicationId') medicationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.getSchedules(medicationId, req);
    return {
      message: 'Schedules fetched successfully',
      data: res,
      success: true,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CAREGIVER, Role.SENIOR)
  async getScheduleById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.getScheduleById(id, req);
    return {
      message: 'Schedule fetched successfully',
      data: res,
      success: true,
    };
  }

  @Put(':id')
  @Roles(Role.CAREGIVER, Role.ADMIN)
  async updateSchedule(
    @Param('id') id: string,
    @Body() scheduleDetails: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.updateSchedule(
      id,
      scheduleDetails,
      req,
    );
    return {
      message: 'Schedule updated successfully',
      data: res,
      success: true,
    };
  }

  @Put(':id/toggle')
  @Roles(Role.CAREGIVER, Role.ADMIN)
  async toggleScheduleStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.toggleScheduleStatus(id, req);
    return {
      message: 'Schedule status toggled successfully',
      data: res,
      success: true,
    };
  }

  @Delete(':id')
  @Roles(Role.CAREGIVER, Role.ADMIN)
  async deleteSchedule(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const res = await this.schedulesService.deleteSchedule(id, req);
    return {
      message: res.message,
      success: res.success,
    };
  }

  // Test endpoints for debugging cron jobs
  @Post('test/process-schedules')
  @Public()
  async testProcessSchedules() {
    await this.scheduleProcessorService.triggerScheduleProcessing();
    return {
      message: 'Schedule processing triggered manually',
      success: true,
    };
  }

  @Post('test/check-missed-doses')
  @Public()
  async testCheckMissedDoses() {
    await this.scheduleProcessorService.triggerMissedDoseCheck();
    return {
      message: 'Missed dose check triggered manually',
      success: true,
    };
  }

  @Post('test/process-escalations')
  @Public()
  async testProcessEscalations() {
    await this.scheduleProcessorService.triggerEscalationAlertProcessing();
    return {
      message: 'Escalation processing triggered manually',
      success: true,
    };
  }

  // Migration endpoint for existing schedules
  @Post('migrate/update-notification-times')
  @Public()
  async updateExistingSchedules() {
    const result = await this.schedulesService.updateExistingSchedulesWithNotificationTimes();
    return {
      message: 'Existing schedules updated with notification times',
      data: result,
      success: result.success,
    };
  }

  @Get('migrate/schedules-needing-update')
  @Public()
  async getSchedulesNeedingUpdate() {
    const schedules = await this.schedulesService.getSchedulesNeedingUpdate();
    return {
      message: 'Schedules needing update retrieved',
      data: {
        count: schedules.length,
        schedules: schedules.map(s => ({
          id: s.id,
          medicationName: s.medication.name,
          time: s.time,
          isActive: s.isActive,
          nextNotificationDue: s.nextNotificationDue,
        })),
      },
      success: true,
    };
  }
}
