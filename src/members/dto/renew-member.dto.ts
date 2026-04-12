import { IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from 'src/common/enums';
export class RenewMemberDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Plan ID is required' })
  planId!: number;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate!: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: string;
}
