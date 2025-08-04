import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'generated/prisma';
import { PrismaService } from 'src/services/prisma.service';
import { AuthenticatedRequest } from './auth.guard';

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';
export const ResourceOwnership = () => SetMetadata(RESOURCE_OWNERSHIP_KEY, true);

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;
    const resourceId = request.params.id;

    if (!resourceId) {
      return true; // No resource ID to check
    }

    // Admins can access everything
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Users can always access their own resources
    if (user.id === resourceId) {
      return true;
    }

    // For user resources, check if caregiver has relation to the senior
    if (resourceId !== user.id) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: resourceId },
        include: {
          caregiverRelations: {
            where: { caregiverId: user.id },
          },
        },
      });

      if (!targetUser) {
        throw new UnauthorizedException('Resource not found');
      }

      // If user is a caregiver and has a relation to the senior, allow access
      if (user.role === Role.CAREGIVER && targetUser.caregiverRelations.length > 0) {
        return true;
      }
    }

    throw new UnauthorizedException('You are not authorized to access this resource');
  }
} 