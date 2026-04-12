import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard' // ✅ ADD THIS
import type { RequestWithUser } from 'src/common/types/request-with-user';
import { plainToInstance } from 'class-transformer';
import { MembershipResponseDto } from './dto/membership-response.dto';

@ApiBearerAuth()
@Controller('membership-plans')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ FIX: add AuthGuard
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  /** ✅ Get all plans */
@Get()
async findAll(@Req() req: RequestWithUser) {
  const plans = await this.membershipsService.findAll();

  return plainToInstance(MembershipResponseDto, plans, {
    groups: [req.user.role],
    excludeExtraneousValues: true,
  });
}
  /** ✅ Get single plan */
  @Get(':id')
async findOne(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: RequestWithUser,
) {
  const plan = await this.membershipsService.findOne(id);

  return plainToInstance(MembershipResponseDto, plan, {
    groups: [req.user.role],
    excludeExtraneousValues: true,
  });
}

  /** ✅ Create plan (Admin only) */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreatePlanDto) {
    return this.membershipsService.create(dto);
  }

  /** ✅ Update plan (Admin only) */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.membershipsService.update(id, dto);
  }

  /** ✅ Soft delete plan (Admin only) */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.membershipsService.remove(id);
  }

  /** ✅ Restore plan (Admin only) — IMPORTANT (you forgot this) */
  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  async restore(@Param('id', ParseIntPipe) id: number) {
    return this.membershipsService.restore(id);
  }
}