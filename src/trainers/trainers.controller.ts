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
  ForbiddenException,
} from '@nestjs/common';

import { TrainersService } from './trainers.service';
import { CreateTrainerWithUserDto } from './dto/create-trainer.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import type { RequestWithUser } from 'src/common/types/request-with-user';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { CreateBulkSlotDto } from './dto/create-bulkslot.dto';
import { plainToInstance } from 'class-transformer';
import { TrainerResponseDto } from './dto/trainer-response.dto';
import { TrainerRow, SlotRow } from './trainers.types';
import { MessageResponse } from '../common/types/response.types';
@ApiBearerAuth()
@Controller('trainers')
@UseGuards(RolesGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async findAll(@Req() req: RequestWithUser): Promise<TrainerResponseDto[]> {
    const trainers = await this.trainersService.findAll();
    return plainToInstance(TrainerResponseDto, trainers, {
      groups: [req.user.role],
      excludeExtraneousValues: true,
    }) as unknown as TrainerResponseDto[];
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async findOne(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: RequestWithUser,
): Promise<TrainerResponseDto> {
  const trainer = await this.trainersService.findOne(id);

  return plainToInstance(TrainerResponseDto, trainer, {
    groups: [req.user.role],
    excludeExtraneousValues: true,
  }) as unknown as TrainerResponseDto;
}

  @Post('create-with-user')
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateTrainerWithUserDto): Promise<TrainerRow> {
    return this.trainersService.createTrainerWithUser(dto);
  }

  @Patch('update/:id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainerDto,
  ): Promise<TrainerRow> {
    return this.trainersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<MessageResponse> {
    return this.trainersService.remove(id);
  }

  @Get(':id/slots')
  async getSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date?: string,
  ): Promise<SlotRow[]> {
    return this.trainersService.getSlots(id, date);
  }

  @Post('slots')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  async createSlot(@Body() dto: CreateSlotDto): Promise<SlotRow> {
    return this.trainersService.createSlot(dto);
  }

  @Post(':id/slots/bulk')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  async createBulk(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateBulkSlotDto,
   ): Promise<SlotRow[]> {
    return this.trainersService.createBulkSlots(id, body.slotDate, body.slots);
  }
}
