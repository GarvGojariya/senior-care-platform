import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Role, User } from 'generated/prisma';
import { CreateCaregiverRelationDto, UpdateUserDto } from './dto/user.dto';
import { AuthenticatedRequest, AuthGuard } from 'src/guard/auth.guard';
import { Roles } from 'src/decorators/roles.decorators';
import {
  ResourceOwnershipGuard,
  ResourceOwnership,
} from 'src/guard/resource-ownership.guard';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(Role.ADMIN)
  async getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    return this.userService.getUsers();
  }

  @Post('caregiver/create-senior')
  @Roles(Role.CAREGIVER)
  async createSeniorOfCaregiver(
    @Req() req: AuthenticatedRequest,
    @Body() createCaregiverRelationDto: CreateCaregiverRelationDto,
  ): Promise<{ message: string; success: boolean }> {
    const res = await this.userService.createSeniorOfCaregiver(
      req.user.id,
      createCaregiverRelationDto,
    );

    return {
      message: res.message,
      success: res.success,
    };
  }

  @Get('caregiver/seniors')
  @Roles(Role.CAREGIVER)
  async getSeniorsOfCaregiver(
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    message: string;
    data: Array<{
      senior: Omit<User, 'passwordHash'>;
      relationship: string;
    }>;
    success: boolean;
  }> {
    const seniors = await this.userService.getSeniorsOfCaregiver(req.user.id);

    return {
      message: 'Seniors fetched successfully',
      data: seniors,
      success: true,
    };
  }

  @Get(':id')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async getUser(
    @Param('id') id: string,
  ): Promise<{
    message: string;
    data: Omit<User, 'passwordHash'>;
    success: boolean;
  }> {
    const res = await this.userService.getUser(id);

    return {
      message: 'User fetched successfully',
      data: res,
      success: true,
    };
  }

  @Put(':id')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<{
    message: string;
    data: Omit<User, 'passwordHash'>;
    success: boolean;
  }> {
    const res = await this.userService.updateUser(id, updateUserDto);

    return {
      message: 'User updated successfully',
      data: res,
      success: true,
    };
  }

  @Delete(':id')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async deleteUser(
    @Param('id') id: string,
  ): Promise<{ message: string; success: boolean }> {
    const res = await this.userService.deleteUser(id);

    return {
      message: res.message,
      success: res.success,
    };
  }
}
