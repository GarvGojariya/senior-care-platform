import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { CaregiverRelation, Role, User } from 'generated/prisma';
import { CreateCaregiverRelationDto, UpdateUserDto } from './dto/user.dto';
import * as bcryptjs from 'bcryptjs';
import { AuthenticatedRequest } from 'src/guard/auth.guard';

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
}
