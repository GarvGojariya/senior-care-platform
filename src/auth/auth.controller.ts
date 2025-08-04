import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterCaregiverDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { AuthenticatedRequest, AuthGuard, Public } from 'src/guard/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-caregiver')
  async registerCaregiver(
    @Body() registerCaregiverDto: RegisterCaregiverDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.registerCaregiver(registerCaregiverDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.changePassword(req, changePasswordDto);
  }

  @UseGuards(AuthGuard)
  @Post('refresh-token')
  async refreshToken(@Body() refreshToken: string): Promise<LoginResponseDto> {
    return this.authService.refreshToken(refreshToken);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
