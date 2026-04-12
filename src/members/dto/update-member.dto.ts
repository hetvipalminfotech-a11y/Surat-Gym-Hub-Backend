import { IsString, IsNumber, IsEnum, IsOptional, IsEmail, Min } from 'class-validator';
import { Gender, MembershipStatus } from '../../common/enums';

export class UpdateMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @Min(14)
  @IsOptional()
  age?: number;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  healthConditions?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;
}
