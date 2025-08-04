import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import {
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterCaregiverDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { Role, User } from 'generated/prisma';
import * as bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from 'src/guard/auth.guard';
import { EmailService } from 'src/services/email.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return await bcryptjs.hash(password, this.saltRounds);
  }

  async registerCaregiver(
    registerCaregiverDto: RegisterCaregiverDto,
  ): Promise<{ message: string; success: boolean }> {
    try {
      const { email, password, firstName, lastName, phone, emergencyContact } =
        registerCaregiverDto;

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (existingUser) {
        throw new ConflictException(`User with email ${email} already exists`);
      }

      // Hash the password before saving
      const hashedPassword = await this.hashPassword(password);

      await this.prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          phone,
          emergencyContact,
          role: Role.CAREGIVER,
        },
      });

      return {
        message: 'Caregiver registered successfully',
        success: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to register caregiver',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedException(`User with email ${email} not found`);
      }

      const isPasswordValid = await bcryptjs.compare(
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { id: user.id, email: user.email, role: user.role };

      const { passwordHash, ...userWithoutPassword } = user as any;

      return {
        accessToken: await this.jwtService.signAsync(payload),
        refreshToken: await this.jwtService.signAsync(payload, {
          expiresIn: '7d',
          secret: process.env.REFRESH_TOKEN_SECRET,
        }),
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Login failed');
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const { passwordHash, ...userWithoutPassword } = user as any;

      return {
        accessToken: await this.jwtService.signAsync(payload),
        refreshToken: await this.jwtService.signAsync(payload, {
          expiresIn: '7d',
          secret: process.env.REFRESH_TOKEN_SECRET,
        }),
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Invalid refresh token');
    }
  }

  async changePassword(
    req: AuthenticatedRequest,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    const user = req.user as User;
    try {
      const { oldPassword, newPassword } = changePasswordDto;

      const existingUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!existingUser) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcryptjs.compare(
        oldPassword,
        existingUser.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Hash the new password before saving
      const hashedNewPassword = await this.hashPassword(newPassword);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedNewPassword },
      });

      return {
        message: 'Password changed successfully',
        success: true,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error.message || 'Password change failed',
      );
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    try {
      const { email } = forgotPasswordDto;

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // For security reasons, don't reveal if the email exists or not
        return {
          message: 'If an account with this email exists, a password reset code has been sent.',
          success: true,
        };
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Invalidate any existing password reset tokens for this user
      await this.prisma.passwordReset.updateMany({
        where: { userId: user.id },
        data: { isUsed: true },
      });

      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          email: user.email,
          otp,
          expiresAt,
        },
      });

      // Send email with OTP
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        otp,
      );

      return {
        message: 'If an account with this email exists, a password reset code has been sent.',
        success: true,
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new InternalServerErrorException(
        'Failed to process password reset request',
      );
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    try {
      const { email, otp, newPassword } = resetPasswordDto;

      // Find the password reset record
      const passwordReset = await this.prisma.passwordReset.findFirst({
        where: {
          email,
          otp,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!passwordReset) {
        throw new BadRequestException(
          'Invalid or expired verification code. Please request a new one.',
        );
      }

      // Hash the new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user's password
      await this.prisma.user.update({
        where: { id: passwordReset.userId },
        data: { passwordHash: hashedPassword },
      });

      // Mark the password reset as used
      await this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { isUsed: true },
      });

      return {
        message: 'Password has been reset successfully',
        success: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Reset password error:', error);
      throw new InternalServerErrorException(
        'Failed to reset password',
      );
    }
  }
}
