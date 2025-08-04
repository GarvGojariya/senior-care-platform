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
import { ResourceOwnershipGuard, ResourceOwnership } from 'src/guard/resource-ownership.guard';

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
    return this.userService.createSeniorOfCaregiver(
      req.user.id,
      createCaregiverRelationDto,
    );
  }

  @Get(':id')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async getUser(
    @Param('id') id: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.userService.getUser(id);
  }

  @Put(':id')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(ResourceOwnershipGuard)
  @ResourceOwnership()
  async deleteUser(
    @Param('id') id: string,
  ): Promise<{ message: string; success: boolean }> {
    return this.userService.deleteUser(id);
  }
}
