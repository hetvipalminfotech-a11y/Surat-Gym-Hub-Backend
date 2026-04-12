import { IsNotEmpty, IsNumber } from 'class-validator';

export class CheckInDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId!: number;
}
