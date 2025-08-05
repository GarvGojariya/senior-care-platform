import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/guard/auth.guard';
import { PrismaService } from 'src/services/prisma.service';
import { AddMedicationDto, UpdateMedicationDto } from './dto/medications.dto';
import { Prisma, Role } from 'generated/prisma';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async addMedication(
    req: AuthenticatedRequest,
    medicationDetails: AddMedicationDto,
  ) {
    const { name, dosage, seniorId, instructions = '' } = medicationDetails;
    const medication = await this.prisma.medication.create({
      data: {
        dosage,
        name,
        createdBy: req.user.id,
        userId: seniorId,
        instructions,
        isActive: true,
        prescriptionImageUrl: null,
      },
    });
    return medication;
  }

  async getMedications(
    req: AuthenticatedRequest,
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
    const user = req.user;

    let whereClause: Prisma.MedicationWhereInput = {};

    if (user.role === Role.ADMIN) {
    } else if (user.role === Role.CAREGIVER) {
      whereClause.createdBy = user.id;
    } else if (user.role === Role.SENIOR) {
      whereClause.userId = user.id;
    }

    if (query.seniorId) {
      whereClause.userId = query.seniorId;
    }

    if (query.search) {
      whereClause.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.isActive) {
      whereClause.isActive = query.isActive === 'true' ? true : false;
    }

    const medications = await this.prisma.medication.findMany({
      where: whereClause,
      include: {
        creator: {
          omit: {
            passwordHash: true,
          },
        },
        user: {
          omit: {
            passwordHash: true,
          },
        },
      },
      orderBy: {
        [query.sortBy || 'createdAt']: query.sort || 'desc',
      },
      skip:
        (query.page ? query.page - 1 : 0) * (query.limit ? query.limit : 10),
      take: query.limit ? +query.limit : 10,
    });

    return medications;
  }

  async getMedicationById(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id,
    };

    if (user.role === Role.ADMIN) {
    } else if (user.role === Role.CAREGIVER) {
      whereClause.createdBy = user.id;
    } else if (user.role === Role.SENIOR) {
      whereClause.userId = user.id;
    }
    const medication = await this.prisma.medication.findUnique({
      where: whereClause,
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  async updateMedication(
    id: string,
    medicationDetails: UpdateMedicationDto,
    req: AuthenticatedRequest,
  ) {
    const user = req.user;

    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.createdBy = user.id;
    } else if (user.role === Role.SENIOR) {
      whereClause.userId = user.id;
    } else if (user.role === Role.ADMIN) {
    }

    const medication = await this.prisma.medication.update({
      where: whereClause,
      data: medicationDetails,
    });
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }
    return medication;
  }

  async deleteMedication(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.createdBy = user.id;
    } else if (user.role === Role.SENIOR) {
      whereClause.userId = user.id;
    }

    const medication = await this.prisma.medication.delete({
      where: whereClause,
    });
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }
    return {
      message: 'Medication deleted successfully',
      success: true,
    };
  }
  async toggleMedicationStatus(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.createdBy = user.id;
    } else if (user.role === Role.SENIOR) {
      whereClause.userId = user.id;
    }

    const medication = await this.prisma.medication.findUnique({
      where: whereClause,
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const updatedMedication = await this.prisma.medication.update({
      where: whereClause,
      data: {
        isActive: {
          set: medication.isActive ? false : true,
        },
      },
    });

    return updatedMedication;
  }

  async getMedicationSchedule(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.createdBy = user.id;
    } else if (user.role === Role.SENIOR) {
      whereClause.userId = user.id;
    }

    const medication = await this.prisma.medication.findUnique({
      where: whereClause,
      include: {
        schedules: true,
        _count: {
          select: {
            schedules: true,
          },
        },
      },
    });

    return medication;
  }
}
