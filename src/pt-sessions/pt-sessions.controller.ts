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
  Req,
} from '@nestjs/common';
import { PtSessionsService, FindSessionsQuery } from './pt-sessions.service';
import { BookSessionDto } from './dto/book-session.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetSessionsQueryDto } from './dto/get-session.dto';
import type { RequestWithUser } from '../common/types/request-with-user';
import { SessionRow, PaginatedSessionsResponse } from './pt-sessions.types';
import { MessageResponse } from '../common/types/response.types';

@ApiBearerAuth()
@Controller('pt-sessions')
@UseGuards(RolesGuard)
export class PtSessionsController {
  constructor(private readonly ptSessionsService: PtSessionsService) { }

  @Get()
  async findAll(@Query() query: GetSessionsQueryDto, @Req() req: RequestWithUser): Promise<PaginatedSessionsResponse | { success: boolean; message: string; statusCode: number }> {

    const serviceQuery: FindSessionsQuery = {
      page: query.page,
      limit: query.limit,
      memberId: query.memberId,
      status: query.status,
      date: query.date,

      trainerId:
        req.user.role === UserRole.TRAINER && req.user.trainerId
          ? req.user.trainerId
          : query.trainerId,
    };
    return this.ptSessionsService.findAll(serviceQuery);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SessionRow> {
    return this.ptSessionsService.findOne(id);
  }

  @Post('book')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async book(@Body() dto: BookSessionDto): Promise<SessionRow> {
    return this.ptSessionsService.bookSession(dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async cancel(@Param('id', ParseIntPipe) id: number): Promise<MessageResponse> {
    return this.ptSessionsService.cancelSession(id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  async completeSession(@Param('id', ParseIntPipe) id: number): Promise<SessionRow> {
    return this.ptSessionsService.completeSession(id);
  }

  @Patch(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  async markNoShow(@Param('id', ParseIntPipe) id: number): Promise<MessageResponse> {
    return this.ptSessionsService.markNoShow(id);
  }

  @Patch(':id/reschedule/:slotId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Param('slotId', ParseIntPipe) slotId: number,
  ): Promise<SessionRow> {
    return this.ptSessionsService.rescheduleSession(id, slotId);
  }
  
  @Get('member/:memberId')
  async getMemberSessions(@Param('memberId', ParseIntPipe) memberId: number): Promise<SessionRow[]> {
    return this.ptSessionsService.getMemberSessions(memberId);
  }
}
