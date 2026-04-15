import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsDateString, IsString } from 'class-validator';

export class CreateSlotDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Trainer ID is required' })
  trainerId!: number;

  @ApiProperty({ example: '2024-07-01' })
  @IsDateString()
  @IsNotEmpty({ message: 'Slot date is required' })
  slotDate!: string;

  @ApiProperty({ example: '09:00:00' })
  @IsString()
  @IsNotEmpty({ message: 'Start time is required' })
  startTime!: string;

  @ApiProperty({ example: '10:00:00' })
  @IsString()
  @IsNotEmpty({ message: 'End time is required' })
  endTime!: string;
}
