import { IsInt, IsOptional, IsString, IsDateString } from 'class-validator';

export class ChangePlanDto {
  @IsInt()
  planId!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}