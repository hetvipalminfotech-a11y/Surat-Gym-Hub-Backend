import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString, IsString } from 'class-validator';

export class GetSessionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  memberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ default: '1' })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ default: '20' })
  @IsOptional()
  limit?: string;
}
