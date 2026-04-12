import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { TrainerSpecialisation } from 'src/common/enums';

export class BookSessionDto {

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId!: number;


  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Slot ID is required' })
  slotId!: number;

}
