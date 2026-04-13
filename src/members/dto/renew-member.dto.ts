import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from 'src/common/enums';
export class RenewMemberDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty({ message: 'Plan ID is required' })
  planId!: number;

   @ApiProperty()
  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate!: string;

   @ApiProperty()
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: string;
}
