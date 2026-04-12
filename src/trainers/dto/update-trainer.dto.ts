import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { TrainerSpecialisation } from '../../common/enums';

export class UpdateTrainerDto {
  @IsOptional()
  @IsEnum(TrainerSpecialisation)
  specialization?: TrainerSpecialisation;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sessionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsString()
  shiftStart?: string;

  @IsOptional()
  @IsString()
  shiftEnd?: string;
}