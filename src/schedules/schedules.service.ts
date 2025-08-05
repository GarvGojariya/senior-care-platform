import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { 
  CreateScheduleDto, 
  UpdateScheduleDto, 
  CreateBulkScheduleDto,
  GetSchedulesQueryDto,
  ScheduleTemplateDto,
  DoseTimeDto
} from './dto/schedules.dto';
import { AuthenticatedRequest } from 'src/guard/auth.guard';
import { Prisma, Role, Frequency, DaysOfWeek } from 'generated/prisma';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  // Predefined schedule templates
  private readonly scheduleTemplates: Record<string, ScheduleTemplateDto> = {
    twice_daily: {
      name: 'twice_daily',
      description: 'Morning and evening doses',
      doseTimes: [
        { time: '08:00', label: 'morning' },
        { time: '20:00', label: 'evening' }
      ]
    },
    three_times_daily: {
      name: 'three_times_daily',
      description: 'Morning, afternoon, and evening doses',
      doseTimes: [
        { time: '08:00', label: 'morning' },
        { time: '14:00', label: 'afternoon' },
        { time: '20:00', label: 'evening' }
      ]
    },
    before_meals: {
      name: 'before_meals',
      description: 'Before breakfast, lunch, and dinner',
      doseTimes: [
        { time: '07:30', label: 'before_breakfast' },
        { time: '12:30', label: 'before_lunch' },
        { time: '18:30', label: 'before_dinner' }
      ]
    },
    four_times_daily: {
      name: 'four_times_daily',
      description: 'Four evenly spaced doses',
      doseTimes: [
        { time: '06:00', label: 'early_morning' },
        { time: '12:00', label: 'noon' },
        { time: '18:00', label: 'evening' },
        { time: '22:00', label: 'night' }
      ]
    }
  };

  async createSchedule(
    scheduleDetails: CreateScheduleDto,
    req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (user.role === Role.SENIOR) {
      throw new BadRequestException(
        'You are not authorized to create a schedule',
      );
    }

    // Validate medication exists and user has access
    const medication = await this.validateMedicationAccess(
      scheduleDetails.medicationId,
      user
    );

    // Validate dose times format
    this.validateDoseTimes(scheduleDetails.doseTimes);

    // Check for schedule conflicts
    await this.checkScheduleConflicts(scheduleDetails, medication.userId);

    const scheduleData = {
      ...scheduleDetails,
      doseTimes: scheduleDetails.doseTimes as any, // Store as JSON
      time: scheduleDetails.doseTimes[0]?.time || '00:00', // Legacy field
    };

    const schedule = await this.prisma.schedule.create({
      data: scheduleData,
      include: {
        medication: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    return schedule;
  }

  async createBulkSchedules(
    bulkScheduleDetails: CreateBulkScheduleDto,
    req: AuthenticatedRequest,
  ) {
   try {
     const user = req.user;
 
     if (user.role === Role.SENIOR) {
       throw new BadRequestException(
         'You are not authorized to create schedules',
       );
     }
 
     const results: any[] = [];
     const errors: any[] = [];
 
     for (const schedule of bulkScheduleDetails.schedules) {
       try {
         const createdSchedule = await this.createSchedule(schedule, req);
         results.push(createdSchedule);
       } catch (error: any) {
         console.log("🚀 ~ SchedulesService ~ createBulkSchedules ~ error:", error)
         errors.push({
           schedule,
           error: error.message
         });
       }
     }
 
     return {
       created: results,
       errors,
       total: bulkScheduleDetails.schedules.length,
       success: results.length
     };
   } catch (error) {
    throw new BadRequestException(error.message);
   }
  }

  async getSchedules(medicationId: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id: medicationId,
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

    const schedules = await this.prisma.schedule.findMany({
      where: {
        medicationId: medication.id,
      },
      include: {
        medication: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        confirmations: {
          orderBy: {
            scheduledTime: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return schedules;
  }

  async getSchedulesWithFilters(
    query: GetSchedulesQueryDto,
    req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const whereClause: Prisma.ScheduleWhereInput = {};

    // Build where clause based on user role and filters
    if (user.role === Role.CAREGIVER) {
      whereClause.medication = {
        createdBy: user.id
      };
    } else if (user.role === Role.SENIOR) {
      whereClause.medication = {
        userId: user.id
      };
    }

    if (query.medicationId) {
      whereClause.medicationId = query.medicationId;
    }

    if (query.seniorId) {
      if (!whereClause.medication) {
        whereClause.medication = {};
      }
      (whereClause.medication as any).userId = query.seniorId;
      whereClause.isActive = query.isActive === 'true' ? true : false;
    }

    if (query.frequency) {
      whereClause.frequency = query.frequency;
    }

    if (query.dayOfWeek) {
      whereClause.daysOfWeek = {
        has: query.dayOfWeek as DaysOfWeek
      };
    }

    const schedules = await this.prisma.schedule.findMany({
      where: whereClause,
      include: {
        medication: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter by specific date if provided
    if (query.date) {
      const targetDate = new Date(query.date);
      const dayOfWeek = this.getDayOfWeek(targetDate);
      
      return schedules.filter(schedule => 
        schedule.daysOfWeek.includes(dayOfWeek as DaysOfWeek)
      );
    }

    return schedules;
  }

  async getScheduleById(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.ScheduleWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.medication = {
        createdBy: user.id,
      };
    } else if (user.role === Role.SENIOR) {
      whereClause.medication = {
        userId: user.id,
      };
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: whereClause,
      include: {
        medication: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        confirmations: {
          orderBy: {
            scheduledTime: 'desc'
          }
        }
      }
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async updateSchedule(
    id: string,
    scheduleDetails: UpdateScheduleDto,
    req: AuthenticatedRequest,
  ) {
    const user = req.user;
    let whereClause: Prisma.ScheduleWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.medication = {
        createdBy: user.id,
      };
    } else if (user.role === Role.SENIOR) {
      whereClause.medication = {
        userId: user.id,
      };
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: whereClause,
      include: {
        medication: true
      }
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Validate dose times if provided
    if (scheduleDetails.doseTimes) {
      this.validateDoseTimes(scheduleDetails.doseTimes);
      
      // Check for conflicts excluding current schedule
      await this.checkScheduleConflicts(
        { ...scheduleDetails, medicationId: schedule.medicationId },
        schedule.medication.userId,
        id
      );
    }

    const updateData = {
      ...scheduleDetails,
      doseTimes: scheduleDetails.doseTimes as any,
      time: scheduleDetails.doseTimes?.[0]?.time || schedule.time
    };

    const updatedSchedule = await this.prisma.schedule.update({
      where: whereClause,
      data: updateData,
      include: {
        medication: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    return updatedSchedule;
  }

  async deleteSchedule(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.ScheduleWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.medication = {
        createdBy: user.id,
      };
    } else if (user.role === Role.SENIOR) {
      whereClause.medication = {
        userId: user.id,
      };
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: whereClause,
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.prisma.schedule.delete({
      where: whereClause,
    });

    return { message: 'Schedule deleted successfully', success: true };
  }

  async getScheduleTemplates() {
    return Object.values(this.scheduleTemplates);
  }

  async getNextReminders(userId: string, days: number = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        medication: {
          userId: userId
        },
        isActive: true
      },
      include: {
        medication: true
      }
    });

    const reminders: any[] = [];

    for (const schedule of schedules) {
      const doseTimes = (schedule.doseTimes as unknown as DoseTimeDto[]) || [
        { time: schedule.time }
      ];

      for (const doseTime of doseTimes) {
        const nextReminders = this.calculateNextReminders(
          schedule,
          doseTime,
          new Date(),
          endDate
        );

        reminders.push(...nextReminders);
      }
    }

    return reminders.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  async toggleScheduleStatus(id: string, req: AuthenticatedRequest) {
    const user = req.user;
    let whereClause: Prisma.ScheduleWhereUniqueInput = {
      id,
    };

    if (user.role === Role.CAREGIVER) {
      whereClause.medication = {
        createdBy: user.id,
      };
    } else if (user.role === Role.SENIOR) {
      whereClause.medication = {
        userId: user.id,
      };
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: whereClause,
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const updatedSchedule = await this.prisma.schedule.update({
      where: whereClause,
      data: {
        isActive: !schedule.isActive
      },
      include: {
        medication: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    return updatedSchedule;
  }

  // Private helper methods

  private async validateMedicationAccess(medicationId: string, user: any) {
    let whereClause: Prisma.MedicationWhereUniqueInput = {
      id: medicationId,
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
      throw new NotFoundException('Medication not found or access denied');
    }

    return medication;
  }

  private validateDoseTimes(doseTimes: DoseTimeDto[]) {
    if (!doseTimes || doseTimes.length === 0) {
      throw new BadRequestException('At least one dose time is required');
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    for (const dose of doseTimes) {
      if (!timeRegex.test(dose.time)) {
        throw new BadRequestException(`Invalid time format: ${dose.time}. Use HH:MM format`);
      }
    }

    // Check for duplicate times
    const times = doseTimes.map(d => d.time);
    const uniqueTimes = new Set(times);
    if (uniqueTimes.size !== times.length) {
      throw new BadRequestException('Duplicate dose times are not allowed');
    }
  }

  private async checkScheduleConflicts(
    scheduleDetails: CreateScheduleDto | UpdateScheduleDto,
    userId: string,
    excludeScheduleId?: string
  ) {
    const doseTimes = scheduleDetails.doseTimes || [];
    
    for (const doseTime of doseTimes) {
      const conflictingSchedules = await this.prisma.schedule.findMany({
        where: {
          medication: {
            userId: userId
          },
          daysOfWeek: {
            hasSome: scheduleDetails.daysOfWeek || []
          },
          time: doseTime.time,
          isActive: true,
          id: {
            not: excludeScheduleId
          }
        },
        include: {
          medication: true
        }
      });

      if (conflictingSchedules.length > 0) {
        throw new BadRequestException(
          `Schedule conflict detected at ${doseTime.time} on ${scheduleDetails.daysOfWeek?.join(', ')}`
        );
      }
    }
  }

  private calculateNextReminders(
    schedule: any,
    doseTime: DoseTimeDto,
    startDate: Date,
    endDate: Date
  ): any[] {
    const reminders: any[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = this.getDayOfWeek(currentDate);
      
      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        const [hours, minutes] = doseTime.time.split(':').map(Number);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime >= startDate) {
          reminders.push({
            scheduleId: schedule.id,
            medicationId: schedule.medicationId,
            medicationName: schedule.medication.name,
            scheduledTime,
            doseTime: doseTime.time,
            doseLabel: doseTime.label,
            frequency: schedule.frequency,
            reminderType: schedule.reminderType,
            reminderMinutesBefore: schedule.reminderMinutesBefore
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return reminders;
  }

  private getDayOfWeek(date: Date): DaysOfWeek {
    const days = [
      DaysOfWeek.SUNDAY,
      DaysOfWeek.MONDAY,
      DaysOfWeek.TUESDAY,
      DaysOfWeek.WEDNESDAY,
      DaysOfWeek.THURSDAY,
      DaysOfWeek.FRIDAY,
      DaysOfWeek.SATURDAY
    ];
    return days[date.getDay()];
  }
}
