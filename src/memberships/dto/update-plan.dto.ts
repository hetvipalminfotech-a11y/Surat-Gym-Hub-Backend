import { IsString, IsNumber, IsEnum, IsOptional, Min, Matches } from 'class-validator';
import { AccessHours, PlanStatus } from '../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
   @Matches(/^[^\p{Extended_Pictographic}]+$/u, { message: 'name cannot contain emojis' })
  name?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(1)
  durationMonths?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  ptSessions?: number;

  @ApiProperty()
  @IsEnum(AccessHours)
  @IsOptional()
  accessHours?: AccessHours;

  @ApiProperty()
  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;
}
