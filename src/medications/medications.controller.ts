import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { AuthenticatedRequest, AuthGuard } from 'src/guard/auth.guard';
import { AddMedicationDto, UpdateMedicationDto } from './dto/medications.dto';
import {
  ResourceOwnership,
  ResourceOwnershipGuard,
} from 'src/guard/resource-ownership.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { Roles } from 'src/decorators/roles.decorators';
import { Medication, Role } from 'generated/prisma';

@UseGuards(AuthGuard, RoleGuard)
@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CAREGIVER)
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async addMedication(
    @Req() req: AuthenticatedRequest,
    @Body() medicationDetails: AddMedicationDto,
  ) {
    const res = await this.medicationsService.addMedication(
      req,
      medicationDetails,
    );

    return {
      message: 'Medication added successfully',
      data: res,
      success: true,
    };
  }

  @Get()
  @Roles(Role.ADMIN, Role.CAREGIVER, Role.SENIOR)
  async getMedications(
    @Req() req: AuthenticatedRequest,
    @Query()
    query: {
      seniorId?: string;
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      sortBy?: string;
      isActive?: string;
    },
  ) {
    const res = await this.medicationsService.getMedications(req, query);

    return {
      message: 'Medications fetched successfully',
      data: res,
      success: true,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CAREGIVER, Role.SENIOR)
  async getMedicationById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const res = await this.medicationsService.getMedicationById(id, req);

    return {
      message: 'Medication fetched successfully',
      data: res,
      success: true,
    };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.CAREGIVER)
  async updateMedication(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() medicationDetails: UpdateMedicationDto,
  ): Promise<{ message: string; data: Medication; success: boolean }> {
    const res = await this.medicationsService.updateMedication(
      id,
      medicationDetails,
      req,
    );

    return {
      message: 'Medication updated successfully',
      data: res,
      success: true,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CAREGIVER)
  async deleteMedication(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const res = await this.medicationsService.deleteMedication(id, req);

    return {
      message: res.message,
      success: res.success,
    };
  }

  @Patch(':id/toggle')
  async toggleMedicationStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const res = await this.medicationsService.toggleMedicationStatus(id, req);

    return {
      message: 'Medication status toggled successfully',
      data: res,
      success: true,
    };
  }

  @Get(':id/schedule')
  async getMedicationSchedule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const res = await this.medicationsService.getMedicationSchedule(id, req);

    return {
      message: 'Medication schedule fetched successfully',
      data: res,
      success: true,
    };
  }
}
