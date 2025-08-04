import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './services/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { RoleGuard } from './guard/role.guard';
import { AuthGuard } from './guard/auth.guard';
import { ResourceOwnershipGuard } from './guard/resource-ownership.guard';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get('ACCESS_TOKEN_SECRET');
        if (!secret) {
          throw new Error(
            'ACCESS_TOKEN_SECRET environment variable is required',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '1d' },
        };
      },
      inject: [ConfigService],
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    ResourceOwnershipGuard,
  ],
})
export class AppModule {}
