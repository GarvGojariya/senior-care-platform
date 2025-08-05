import { IsArray, IsEnum, IsNotEmpty, IsString, IsOptional, IsBoolean, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DaysOfWeek, Frequency } from 'generated/prisma';

export class DoseTimeDto {
  @IsString()
  @IsNotEmpty()
  time: string; // "HH:MM" format

  @IsString()
  @IsOptional()
  label?: string; // "morning", "afternoon", "evening", "before_breakfast", etc.

  @IsString()
  @IsOptional()
  instructions?: string; // Specific instructions for this dose
}

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  medicationId: string;

  @IsEnum(Frequency)
  @IsNotEmpty()
  frequency: Frequency;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoseTimeDto)
  doseTimes: DoseTimeDto[]; // Multiple doses per day

  @IsArray()
  @IsNotEmpty()
  daysOfWeek: DaysOfWeek[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  reminderType?: 'notification' | 'sms' | 'voice' | 'buzzer';

  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  reminderMinutesBefore?: number;

  @IsString()
  @IsOptional()
  seniorId?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateScheduleDto {
  @IsEnum(Frequency)
  @IsOptional()
  frequency?: Frequency;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoseTimeDto)
  @IsOptional()
  doseTimes?: DoseTimeDto[];

  @IsArray()
  @IsOptional()
  daysOfWeek?: DaysOfWeek[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  reminderType?: 'notification' | 'sms' | 'voice' | 'buzzer';

  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  reminderMinutesBefore?: number;
}

export class CreateBulkScheduleDto {
  @IsString()
  @IsNotEmpty()
  medicationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules: CreateScheduleDto[];
}

export class ScheduleTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string; // "twice_daily", "three_times_daily", "before_meals", etc.

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoseTimeDto)
  doseTimes: DoseTimeDto[];

  @IsString()
  @IsOptional()
  description?: string;
}

export class GetSchedulesQueryDto {
  @IsString()
  @IsOptional()
  medicationId?: string;

  @IsString()
  @IsOptional()
  seniorId?: string;

  @IsString()
  @IsOptional()
  isActive?: string;

  @IsEnum(Frequency)
  @IsOptional()
  frequency?: Frequency;

  @IsString()
  @IsOptional()
  dayOfWeek?: DaysOfWeek;

  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD format for specific date queries

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}