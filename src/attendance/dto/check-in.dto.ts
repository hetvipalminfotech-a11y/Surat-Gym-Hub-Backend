import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CheckInDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId!: number;
}
