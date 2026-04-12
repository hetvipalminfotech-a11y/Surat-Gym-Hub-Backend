import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PtSessionsService } from './pt-sessions.service';
import { BookSessionDto } from './dto/book-session.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetSessionsQueryDto } from './dto/get-session.dto';

@ApiBearerAuth()
@Controller('pt-sessions')
@UseGuards(RolesGuard)
export class PtSessionsController {
  constructor(private readonly ptSessionsService: PtSessionsService) {}

  @Get()
async findAll(@Query() query: GetSessionsQueryDto) {
  return this.ptSessionsService.findAll(query);
}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ptSessionsService.findOne(id);
  }
  
  @Post('book')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  book(@Body() dto: BookSessionDto) {
    return this.ptSessionsService.bookSession(dto);
  }

   @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.ptSessionsService.cancelSession(id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  async completeSession(@Param('id', ParseIntPipe) id: number) {
    return this.ptSessionsService.completeSession(id);
  }

  @Patch(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  async markNoShow(@Param('id', ParseIntPipe) id: number) {
    return this.ptSessionsService.markNoShow(id);
  }

  @Patch(':id/reschedule/:slotId')
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
async reschedule(
  @Param('id', ParseIntPipe) id: number,
  @Param('slotId', ParseIntPipe) slotId: number,
) {
  return this.ptSessionsService.rescheduleSession(id, slotId);
}
  @Get('member/:memberId')
  async getMemberSessions(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.ptSessionsService.getMemberSessions(memberId);
  }
}
