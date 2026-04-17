import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  Min,
  Matches,
} from 'class-validator';
import { Gender, MembershipStatus } from '../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  @Matches(/^[^\p{Extended_Pictographic}]+$/u, { message: 'name cannot contain emojis' })
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsNumber()
  @Min(14)
  @IsOptional()
  age?: number;

  @ApiProperty()
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty()
  @IsString()
  @IsOptional()
  healthConditions?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiProperty()
  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;
}
