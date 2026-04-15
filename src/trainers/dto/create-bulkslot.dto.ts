
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class SlotDto {
  @ApiProperty({ example: '09:00:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '10:00:00' })
  @IsString()
  endTime!: string;
}

export class CreateBulkSlotDto {
  @ApiProperty({ example: '2026-04-11' })
  @IsDateString()
  slotDate!: string;

  @ApiProperty({ type: [SlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots!: SlotDto[];
}
