import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('attendance')
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto.memberId);
  }

  @Patch('check-out/:memberId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async checkOut(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.attendanceService.checkOut(memberId);
  }

  @Get('date/:date')
  async getByDate(@Param('date') date: string) {
    return this.attendanceService.getByDate(date);
  }

  @Get('member/:memberId')
  async getByMember(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Query('month') month?: string,
  ) {
    return this.attendanceService.getByMember(memberId, month);
  }
}
