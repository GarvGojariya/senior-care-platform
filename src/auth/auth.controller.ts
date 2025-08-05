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
    const res = await this.authService.registerCaregiver(registerCaregiverDto);

    return {
      message: res.message,
      success: res.success,
    };
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<{
    message: string;
    data: LoginResponseDto;
    success: boolean;
  }> {
    const res = await this.authService.login(loginDto);

    return {
      message: 'Login successful',
      data: res,
      success: true,
    };
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    const res = await this.authService.changePassword(req, changePasswordDto);

    return {
      message: res.message,
      success: res.success,
    };
  }

  @UseGuards(AuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @Body() refreshToken: string,
  ): Promise<{ message: string; data: LoginResponseDto; success: boolean }> {
    const res = await this.authService.refreshToken(refreshToken);

    return {
      message: 'Token refreshed successfully',
      data: res,
      success: true,
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    const res = await this.authService.forgotPassword(forgotPasswordDto);

    return {
      message: res.message,
      success: res.success,
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    const res = await this.authService.resetPassword(resetPasswordDto);

    return {
      message: res.message,
      success: res.success,
    };
  }
}
