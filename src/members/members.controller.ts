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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { request } from 'express';
import { ChangePlanDto } from './dto/change-plan.dto';

interface AuthRequest extends Request {
  user: {
    userId: number;
    role:string;
  };
}

@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /** ✅ Get all members (filters + pagination) */
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.membersService.findAll({
      search,
      status,
      planId,
      page,
      limit,
    });
  }

  /** ✅ Get single member */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.findOne(id);
  }

  /** ✅ Create member */
 @Post()
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
async create(
  @Body() dto: CreateMemberDto,
  @Req() req: AuthRequest,
) {
  console.log('USER:', req.user); // debug

  if (!req.user) {
    throw new Error('User not found in request'); // safety
  }

  return this.membersService.create(dto, req.user.userId);
}

  /** ✅ Update member */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(id, dto);
  }

  /** ✅ Renew membership */
  @Patch(':id/renew')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewMemberDto,
    @Req() req: AuthRequest,
  ) {
    return this.membersService.renew(id, dto, req.user.userId);
  }

  

  /** ✅ Soft delete member */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.remove(id);
  }
@Patch(':id/freeze')
async freeze(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: AuthRequest,
) {
  return this.membersService.freeze(id, req.user.userId);
}

@Patch(':id/unfreeze')
async unfreeze(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: AuthRequest,
) {
  return this.membersService.unfreeze(id, req.user.userId);
}

@Patch(':id/cancel')
async cancel(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: AuthRequest,
) {
  return this.membersService.cancel(id, req.user.userId);
}

@Patch(':id/change-plan')
@Roles(UserRole.ADMIN)
async changePlan(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: ChangePlanDto,
  @Req() req: AuthRequest,
) {
  return this.membersService.changePlan(id, dto, req.user.userId);
}
}