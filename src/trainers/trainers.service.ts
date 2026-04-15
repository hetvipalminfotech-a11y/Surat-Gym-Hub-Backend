import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTrainerWithUserDto } from './dto/create-trainer.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { UserRole, UserStatus } from 'src/common/enums';
import * as bcrypt from 'bcrypt';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { TrainerQueries } from './queries/trainers.queries';
import { TrainerRow, SlotRow } from './trainers.types';
import { MessageResponse } from '../common/types/response.types';
function normalizeTime(time: string): string {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}
@Injectable()
export class TrainersService {
  constructor(private db: DatabaseService) {}

  async findAll(): Promise<TrainerRow[]> {
    return this.db.query<TrainerRow>(TrainerQueries.FIND_ALL);
  }

  async findOne(id: number): Promise<TrainerRow> {
   
    const rows = await this.db.query<TrainerRow>(TrainerQueries.FIND_ONE,[id]);

    if (!rows.length) {
      throw new NotFoundException('Trainer not found');
    }

    return rows[0];
  }

  async createTrainerWithUser(dto: CreateTrainerWithUserDto): Promise<TrainerRow> {

    const existing = await this.db.query<{ id: number }>(
      TrainerQueries.CHECK_EMAIL_EXISTS,
      [dto.email],
    );

    if (existing.length > 0) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.db.transaction<TrainerRow>(async (conn) => {

      const [userResult] = await conn.execute<ResultSetHeader>(
        TrainerQueries.CREATE_USER,
        [
          dto.name,
          dto.email,
          passwordHash,
          UserRole.TRAINER,
          UserStatus.ACTIVE,
        ],
      );

      const userId = userResult.insertId;

      const [trainerResult] = await conn.execute<ResultSetHeader>(
        TrainerQueries.CREATE_TRAINER,
        [
          userId,
          dto.specialization,
          dto.sessionRate,
          dto.commissionRate,
          dto.shiftStart || null,
          dto.shiftEnd || null,
        ],
      );

      const trainerId = trainerResult.insertId;

      const [rows] = await conn.query<TrainerRow[]>(
        TrainerQueries.GET_TRAINER_BY_ID,
        [trainerId],
      );

      return rows[0];
    });
  }

 async update(id: number, dto: UpdateTrainerDto): Promise<TrainerRow> {
  console.log("log");
  await this.findOne(id);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (dto.specialization != null) {
    fields.push('specialization = ?');
    values.push(dto.specialization);
  }

  if (dto.sessionRate != null) {
    fields.push('session_rate = ?');
    values.push(Number(dto.sessionRate));
  }

  if (dto.commissionRate != null) {
    fields.push('commission_rate = ?');
    values.push(Number(dto.commissionRate));
  }

  if (dto.shiftStart != null) {
    fields.push('shift_start = ?');
    values.push(dto.shiftStart);
  }

  if (dto.shiftEnd != null) {
    fields.push('shift_end = ?');
    values.push(dto.shiftEnd);
  }

  if (!fields.length) return this.findOne(id);
console.log(fields);

  const sql = TrainerQueries.UPDATE_DYNAMIC(fields.join(', '));

  console.log('SQL:', sql);
  console.log('VALUES:', values);

  values.push(id);

  await this.db.execute(sql, values);

  return this.findOne(id);
}

  async getSlots(trainerId: number, date?: string): Promise<SlotRow[]> {
    let sql = TrainerQueries.GET_SLOTS_BASE;
    const params: (string | number)[] = [trainerId];

    if (date) {
      sql += TrainerQueries.GET_SLOTS_BY_DATE;
      params.push(date);
    }

    sql += TrainerQueries.GET_SLOTS_ORDER;

    return this.db.query<SlotRow>(sql, params);
  }

  async createSlot(dto: CreateSlotDto): Promise<SlotRow> {

    await this.findOne(dto.trainerId);

    const normalizeTime = (time: string): string => {
      const [h, m, s = '00'] = time.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
    };

    const startTime = normalizeTime(dto.startTime);
    const endTime = normalizeTime(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const overlap = await this.db.query<{ id: number }>(
      TrainerQueries.SLOT_OVERLAP_CHECK,
      [dto.trainerId, dto.slotDate, endTime, startTime],
    );

    if (overlap.length > 0) {
      throw new ConflictException('Slot overlaps with existing slot');
    }

    try {
      const result = await this.db.execute<ResultSetHeader>(
        TrainerQueries.INSERT_SLOT,
        [dto.trainerId, dto.slotDate, startTime, endTime],
      );

      const rows = await this.db.query<SlotRow>(TrainerQueries.GET_SLOT_BY_ID, [
        result.insertId,
      ]);

      return rows[0];
    } catch (error: unknown) {

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('Exact slot already exists');
      }

      throw error;
    }
  }
  
  async createBulkSlots(
    trainerId: number,
    slotDate: string,
    slots: { startTime: string; endTime: string }[],
  ): Promise<SlotRow[]> {

    await this.findOne(trainerId);

    return this.db.transaction<SlotRow[]>(async (conn) => {
      const results: SlotRow[] = [];

      const normalize = (t: string) => {
        const [h, m, s = '00'] = t.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
      };

      for (const slot of slots) {
        const startTime = normalize(slot.startTime);
        const endTime = normalize(slot.endTime);

        if (startTime >= endTime) {
          throw new BadRequestException(
            `Invalid time range ${startTime}-${endTime}`,
          );
        }

        const [existing] = await conn.execute<SlotRow[]>(
          TrainerQueries.BULK_SLOT_OVERLAP_CHECK,
          [trainerId, slotDate, endTime, startTime],
        );

        if (existing.length > 0) {
          throw new ConflictException(
            `Overlap detected for ${startTime}-${endTime}`,
          );
        }

        const [insert] = await conn.execute<ResultSetHeader>(
          TrainerQueries.BULK_INSERT_SLOT,
          [trainerId, slotDate, startTime, endTime],
        );

        const [rows] = await conn.execute<SlotRow[]>(
          TrainerQueries.GET_SLOT_BY_ID,
          [insert.insertId],
        );

        if (!rows.length) {
          throw new Error('Inserted slot not found');
        }

        results.push(rows[0]);
      }

      return results;
    });
  }

  async remove(id: number): Promise<MessageResponse> {
    await this.findOne(id);

    await this.db.transaction(async (conn) => {

      await conn.execute(TrainerQueries.DELETE_TRAINER, [id]);

      await conn.execute(TrainerQueries.DELETE_TRAINER_SLOTS, [id]);

      await conn.execute(TrainerQueries.DELETE_TRAINER_SESSIONS, [id]);

      await conn.execute(TrainerQueries.DELETE_ASSOCIATED_USER, [id]);
    });

    return { message: 'Trainer and related data deleted successfully' };
  }
}
