import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import {  Role, User } from 'generated/prisma';
import { CreateCaregiverRelationDto, UpdateUserDto } from './dto/user.dto';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(
    id: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        caregiverRelations: {
          include: {
            senior: true,
          },
        },
        _count: {
          select: {
            caregiverRelations: true,
          }
        }
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    const { passwordHash, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<{ message: string; success: boolean }> {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      message: 'User deleted successfully',
      success: true,
    };
  }

  async getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => {
      const { passwordHash, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    });
  }

  async createSeniorOfCaregiver(
    caregiverId: string,
    data: CreateCaregiverRelationDto,
  ): Promise<{ message: string; success: boolean }> {
    const caregiver = await this.prisma.user.findUnique({
      where: { id: caregiverId },
    });
    if (!caregiver) {
      throw new NotFoundException('Caregiver not found');
    }

    const existingSenior = await this.prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (existingSenior) {
      throw new ConflictException(
        `Senior with email ${data.email} already exists`,
      );
    }

    const senior = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: await bcryptjs.hash(data.password, 10),
        role: Role.SENIOR,
        phone: data.phone,
        emergencyContact: data.emergencyContact,
      },
    });

    await this.prisma.caregiverRelation.create({
      data: {
        caregiverId,
        seniorId: senior.id,
        relationship: data.relationship,
      },
    });

    return {
      message: 'Senior created successfully',
      success: true,
    };
  }

  async getSeniorsOfCaregiver(
    caregiverId: string,
  ): Promise<Array<{
    senior: Omit<User, 'passwordHash'>;
    relationship: string;
  }>> {
    const caregiverRelations = await this.prisma.caregiverRelation.findMany({
      where: {
        caregiverId,
        isActive: true,
      },
      include: {
        senior: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            emergencyContact: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return caregiverRelations.map((relation) => ({
      senior: relation.senior,
      relationship: relation.relationship,
    }));
  }
}
