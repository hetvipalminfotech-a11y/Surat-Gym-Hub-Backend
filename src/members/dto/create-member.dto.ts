import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  Min,
  IsDateString,
  Matches,
} from 'class-validator';
import { Gender } from '../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be 10 digits' })
  @IsNotEmpty({ message: 'Phone is required' })
  phone!: string;

  @ApiProperty({ example: 'H8P4o@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(14, { message: 'Age must be at least 14' })
  @IsOptional()
  age?: number;

  @ApiProperty({ example: 'MALE' })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ example: 'None' })
  @IsString()
  @IsOptional()
  healthConditions?: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Membership plan is required' })
  membershipPlanId!: number;

  @ApiProperty({ example: '2023-01-01' })
  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate!: string;

  @ApiProperty({ example: 'CASH' })
  @IsEnum(['CASH', 'UPI', 'CARD', 'ONLINE'])
  @IsOptional()
  paymentMethod?: string;
}
