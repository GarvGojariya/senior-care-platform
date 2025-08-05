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
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  CreateBulkScheduleDto,
  GetSchedulesQueryDto,
} from './dto/schedules.dto';
import { AuthenticatedRequest, Public } from 'src/guard/auth.guard';
import { AuthGuard } from 'src/guard/auth.guard';
import { Roles } from 'src/decorators/roles.decorators';
import { Role } from 'generated/prisma';

@UseGuards(AuthGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

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
  async getScheduleTemplates() {
    const res = await this.schedulesService.getScheduleTemplates();
    return {
      message: 'Schedule templates fetched successfully',
      data: res,
      success: true,
    };
  }

  @Get('reminders/:userId')
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
}
