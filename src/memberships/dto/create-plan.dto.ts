import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { AccessHours } from '../../common/enums';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlanDto {
   @ApiProperty({
    example: 'Premium Plan',
    description: 'Name of the membership plan',
  })
  @IsString()
  @IsNotEmpty({ message: 'Plan name is required' })
  name!: string;

  @ApiProperty({
    example: 3,
    description: 'Duration of plan in months (1, 3, 6, 12)',
  })
  @Type(()=> Number)
  @IsNumber()
  @Min(1, { message: 'Duration must be at least 1 month' })
  durationMonths!: number;

  @ApiProperty({
    example: 2500,
    description: 'Price of the plan',
  })
  @Type(()=> Number)
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  price!: number;

   @ApiProperty({
    example: 12,
    description: 'Number of PT sessions included in the plan'
  })
  @Type(()=> Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  ptSessions?: number;

  @ApiProperty({
    example: 'FULL',
    enum: AccessHours,
    description: 'Access hours (FULL = 24/7, PEAK = limited hours)'
  })
  @IsEnum(AccessHours)
  @IsOptional()
  accessHours?: AccessHours;
}
