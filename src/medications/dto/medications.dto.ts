import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddMedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsNotEmpty()
  dosage: string;
  @IsString()
  @IsNotEmpty()
  seniorId: string;
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class UpdateMedicationDto {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  @IsOptional()
  dosage?: string;
  @IsString()
  @IsOptional()
  instructions?: string;
  @IsString()
  @IsOptional()
  prescriptionImageUrl?: string;
}
