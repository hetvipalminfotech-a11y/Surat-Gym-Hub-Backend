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
  Query,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanRow } from './memberships.types';
import { MessageResponse } from '../common/types/response.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/common/types/request-with-user';
import { plainToInstance, instanceToPlain } from 'class-transformer';
import { MembershipResponseDto } from './dto/membership-response.dto';

@ApiBearerAuth()
@Controller('membership-plans')
@UseGuards(RolesGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  async findAll(@Req() req: RequestWithUser): Promise<Record<string, unknown>[]> {
    const plans = await this.membershipsService.findAll();

    const transformed = plainToInstance(MembershipResponseDto, plans, {
      groups: [req.user.role],
      excludeExtraneousValues: true,
    });

    return instanceToPlain(transformed, { groups: [req.user.role] }) as Record<string, unknown>[];
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<Record<string, unknown>> {
    const plan = await this.membershipsService.findOne(id);

    const transformed = plainToInstance(MembershipResponseDto, plan, {
      groups: [req.user.role],
      excludeExtraneousValues: true,
    });

    return instanceToPlain(transformed, { groups: [req.user.role] }) as Record<string, unknown>;
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreatePlanDto): Promise<PlanRow> {
    return this.membershipsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ): Promise<PlanRow> {
    return this.membershipsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<MessageResponse> {
    return this.membershipsService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  async restore(@Param('id', ParseIntPipe) id: number): Promise<PlanRow> {
    return this.membershipsService.restore(id);
  }
}
