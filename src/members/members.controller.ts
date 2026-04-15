import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { RenewMemberDto } from './dto/renew-member.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChangePlanDto } from './dto/change-plan.dto';
import { MemberFilterDto } from './dto/member-filter.dto';
import { MemberRow, PaginatedMembersResponse } from './members.types';
import { MessageResponse } from '../common/types/response.types';

interface AuthRequest extends Request {
  user: {
    userId: number;
    role:string;
  };
}

  @ApiBearerAuth()
  @Controller('members')
  @UseGuards(RolesGuard)
  export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async findAll(@Query() query: MemberFilterDto): Promise<PaginatedMembersResponse> {
    return this.membersService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MemberRow> {
    return this.membersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async create(
    @Body() dto: CreateMemberDto,
    @Req() req: AuthRequest,
  ): Promise<MemberRow> {

  if (!req.user) {
    throw new Error('User not found in request');
  }
  return this.membersService.create(dto, req.user.userId);
}

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberRow> {
    return this.membersService.update(id, dto);
  }

  @Patch(':id/renew')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewMemberDto,
    @Req() req: AuthRequest,
  ): Promise<MemberRow> {
    return this.membersService.renew(id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<MessageResponse> {
    return this.membersService.remove(id);
  }

  @Patch(':id/freeze')
  async freeze(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ): Promise<MemberRow> {
    return this.membersService.freeze(id, req.user.userId);
  }

  @Patch(':id/unfreeze')
  async unfreeze(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ): Promise<MemberRow> {
    return this.membersService.unfreeze(id, req.user.userId);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ): Promise<MemberRow> {
    return this.membersService.cancel(id, req.user.userId);
  }

  @Patch(':id/change-plan')
  @Roles(UserRole.ADMIN)
  async changePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePlanDto,
    @Req() req: AuthRequest,
  ): Promise<MemberRow> {
    return this.membersService.changePlan(id, dto, req.user.userId);
  }
}
