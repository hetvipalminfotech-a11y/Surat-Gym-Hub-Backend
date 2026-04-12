import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, Min, Max, IsEmail } from 'class-validator';
import { TrainerSpecialisation, UserRole } from '../../common/enums';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateTrainerWithUserDto  {

  // USER fields
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'YOGA' })
  @IsEnum(TrainerSpecialisation)
  @IsNotEmpty({ message: 'Specialization is required' })
  specialization!: TrainerSpecialisation;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty({ message: 'Session rate is required' })
  sessionRate!: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty({ message: 'Commission rate is required' })
  commissionRate!: number;

    @ApiProperty({ example: '09:00' })
  @IsString()
  @IsOptional()
  shiftStart?: string;

    @ApiProperty({ example: '17:00' })
  @IsString()
  @IsOptional()
  shiftEnd?: string;
}
