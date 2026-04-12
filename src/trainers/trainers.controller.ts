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
@ApiBearerAuth()
@Controller('trainers')
@UseGuards(RolesGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  // ========================
  // GET ALL TRAINERS
  // ========================
@Get()
async findAll(@Req() req: RequestWithUser) {
  const trainers = await this.trainersService.findAll();
 return plainToInstance(TrainerResponseDto, trainers, {
    groups: [req.user.role], // 🔥 dynamic role-based serialization
    excludeExtraneousValues: true,
  });
}

  // ========================
  // GET ONE TRAINER
  // ========================
  @Get(':id')
async findOne(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: RequestWithUser,
) {
  const trainer = await this.trainersService.findOne(id);

  return plainToInstance(TrainerResponseDto, trainer, {
    groups: [req.user.role],
    excludeExtraneousValues: true,
  });
}

  // ========================
  // CREATE TRAINER (ADMIN ONLY)
  // ========================
  @Post('create-with-user')
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateTrainerWithUserDto) {
    return this.trainersService.createTrainerWithUser(dto);
  }

  // ========================
  // UPDATE TRAINER (ADMIN ONLY)
  // ========================
  @Patch('update/:id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainerDto,
  ) {
    return this.trainersService.update(id, dto);
  }

  // ========================
  // DELETE TRAINER (ADMIN ONLY)
  // ========================
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.trainersService.remove(id);
  }

  // ========================
  // GET SLOTS
  // ========================
  @Get(':id/slots')
  getSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date?: string,
  ) {
    return this.trainersService.getSlots(id, date);
  }

  @Post('slots')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  createSlot(@Body() dto: CreateSlotDto) {
    return this.trainersService.createSlot(dto);
  }

  @Post(':id/slots/bulk')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  createBulk(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateBulkSlotDto,
   ) {
    return this.trainersService.createBulkSlots(id, body.slotDate, body.slots);
  }
}