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
export interface TrainerRow {
  id: number;
  user_id: number;
  specialization: string;
  session_rate: number;
  commission_rate: number;
  shift_start: string | null;
  shift_end: string | null;
  status: string;
  name: string;
  email: string;
}

export interface SlotRow {
  id: number;
  trainer_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}
function normalizeTime(time: string): string {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}
@Injectable()
export class TrainersService {
  constructor(private db: DatabaseService) {}

  /** Get all trainers */
  async findAll() {
    return this.db.query<TrainerRow>(TrainerQueries.FIND_ALL);
  }

  /** Get one trainer */
  async findOne(id: number) {
   
    const rows = await this.db.query<TrainerRow>(TrainerQueries.FIND_ONE,[id]);

    if (!rows.length) {
      throw new NotFoundException('Trainer not found');
    }

    return rows[0];
  }

  /** Create trainer */
  async createTrainerWithUser(dto: CreateTrainerWithUserDto) {
    // 1️⃣ Check email already exists
    const existing = await this.db.query<RowDataPacket[]>(
      TrainerQueries.CHECK_EMAIL_EXISTS,
      [dto.email],
    );

    if (existing.length > 0) {
      throw new ConflictException('Email already exists');
    }

    // 2️⃣ Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.db.transaction(async (conn) => {
      // 3️⃣ Create USER (role = TRAINER)
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

      // 4️⃣ Create TRAINER
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

      // 5️⃣ Return joined data
      const [rows] = await conn.query<RowDataPacket[]>(
        TrainerQueries.GET_TRAINER_BY_ID,
        [trainerId],
      );

      return rows[0];
    });
  }

  /** Update trainer */
 async update(id: number, dto: UpdateTrainerDto) {
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

  /** Get slots */
  /** ✅ Get slots */
  async getSlots(trainerId: number, date?: string) {
    let sql = TrainerQueries.GET_SLOTS_BASE;
    const params: (string | number)[] = [trainerId];

    if (date) {
      sql += TrainerQueries.GET_SLOTS_BY_DATE;
      params.push(date);
    }

    sql += TrainerQueries.GET_SLOTS_ORDER;

    return this.db.query<SlotRow>(sql, params);
  }

  /** ✅ Create single slot with overlap validation */
  async createSlot(dto: CreateSlotDto) {
    const normalizeTime = (time: string): string => {
      const [h, m, s = '00'] = time.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
    };

    const startTime = normalizeTime(dto.startTime);
    const endTime = normalizeTime(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // ✅ OVERLAP CHECK
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
      // ✅ HANDLE DUPLICATE ERROR (DB LEVEL)
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
  /** ✅ Bulk slots (transaction + validation) */
  async createBulkSlots(
    trainerId: number,
    slotDate: string,
    slots: { startTime: string; endTime: string }[],
  ) {
    return this.db.transaction(async (conn) => {
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

        // ✅ CORRECT overlap check
        const [existing] = await conn.execute<RowDataPacket[]>(
          TrainerQueries.BULK_SLOT_OVERLAP_CHECK,
          [trainerId, slotDate, endTime, startTime],
        );

        if (existing.length > 0) {
          throw new ConflictException(
            `Overlap detected for ${startTime}-${endTime}`,
          );
        }

        // ✅ insert
        const [insert] = await conn.execute<ResultSetHeader>(
          TrainerQueries.BULK_INSERT_SLOT,
          [trainerId, slotDate, startTime, endTime],
        );

        // ✅ fetch inserted row (SAFE)
        const [rows] = await conn.execute<RowDataPacket[]>(
          TrainerQueries.GET_SLOT_BY_ID,
          [insert.insertId],
        );

        if (!rows.length) {
          throw new Error('Inserted slot not found');
        }

        results.push(rows[0] as SlotRow);
      }

      return results;
    });
  }

  /** Delete trainer */
  async remove(id: number) {
    await this.findOne(id);

    await this.db.execute(TrainerQueries.DELETE_TRAINER, [id]);

    return { message: 'Trainer deleted successfully' };
  }
}
