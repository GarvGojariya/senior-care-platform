import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsObject, 
  IsBoolean, 
  IsNumber, 
  IsIn,
  IsUUID,
  IsDateString
} from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  scheduleId: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsDateString()
  scheduledFor: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateNotificationSettingsDto {
  @IsString()
  channel: string;

  @IsBoolean()
  isEnabled: boolean;

  @IsOptional()
  @IsString()
  preferredTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsNumber()
  maxNotificationsPerDay?: number;
}

export class TestNotificationDto {
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @IsString()
  title: string;

  @IsString()
  message: string;
}

export class RegisterFCMTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsIn(['ANDROID', 'IOS', 'WEB'])
  deviceType?: 'ANDROID' | 'IOS' | 'WEB';

  @IsOptional()
  @IsString()
  appVersion?: string;
}
