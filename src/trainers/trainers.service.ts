import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {  CreateTrainerWithUserDto } from './dto/create-trainer.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { UserRole, UserStatus } from 'src/common/enums';
import * as bcrypt from 'bcrypt';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
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
    return this.db.query<TrainerRow>(
      `SELECT t.*, u.name, u.email
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.deleted_at IS NULL
       ORDER BY u.name ASC`,
    );
  }

  /** Get one trainer */
  async findOne(id: number) {
    const rows = await this.db.query<TrainerRow>(
      `SELECT t.*, u.name, u.email
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? AND t.deleted_at IS NULL`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Trainer not found');
    }

    return rows[0];
  }

  /** Create trainer */
 async createTrainerWithUser(dto: CreateTrainerWithUserDto) {
  // 1️⃣ Check email already exists
  const existing = await this.db.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`,
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
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?)`,
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
      `INSERT INTO trainers 
       (user_id, specialization, session_rate, commission_rate, shift_start, shift_end, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
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
      `SELECT t.*, u.name, u.email
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [trainerId],
    );

    return rows[0];
  });
}

  /** Update trainer */
  async update(id: number, dto: UpdateTrainerDto) {
    await this.findOne(id);

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (dto.specialization !== undefined) {
      fields.push('specialization = ?');
      values.push(dto.specialization);
    }
    if (dto.sessionRate !== undefined) {
      fields.push('session_rate = ?');
      values.push(dto.sessionRate);
    }
    if (dto.commissionRate !== undefined) {
      fields.push('commission_rate = ?');
      values.push(dto.commissionRate);
    }
    if (dto.shiftStart !== undefined) {
      fields.push('shift_start = ?');
      values.push(dto.shiftStart);
    }
    if (dto.shiftEnd !== undefined) {
      fields.push('shift_end = ?');
      values.push(dto.shiftEnd);
    }

    if (!fields.length) return this.findOne(id);

    values.push(id);

    await this.db.execute(
      `UPDATE trainers SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    return this.findOne(id);
  }

  /** Get slots */
   /** ✅ Get slots */
  async getSlots(trainerId: number, date?: string) {
    let sql = `SELECT * FROM trainer_time_slots WHERE trainer_id = ? AND deleted_at IS NULL`;
    const params: (string | number)[] = [trainerId];

    if (date) {
      sql += ` AND slot_date = ?`;
      params.push(date);
    }

    sql += ` ORDER BY slot_date ASC, start_time ASC`;

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
    `SELECT id FROM trainer_time_slots
     WHERE trainer_id = ?
     AND slot_date = ?
     AND deleted_at IS NULL
     AND start_time < ?
     AND end_time > ?`,
    [dto.trainerId, dto.slotDate, endTime, startTime],
  );

  if (overlap.length > 0) {
    throw new ConflictException('Slot overlaps with existing slot');
  }

  try {
    const result = await this.db.execute<ResultSetHeader>(
      `INSERT INTO trainer_time_slots 
       (trainer_id, slot_date, start_time, end_time, status)
       VALUES (?, ?, ?, ?, 'AVAILABLE')`,
      [dto.trainerId, dto.slotDate, startTime, endTime],
    );

    const rows = await this.db.query<SlotRow>(
      `SELECT * FROM trainer_time_slots WHERE id = ?`,
      [result.insertId],
    );

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
        `SELECT id FROM trainer_time_slots
         WHERE trainer_id = ?
         AND slot_date = ?
         AND deleted_at IS NULL
         AND start_time < ?
         AND end_time > ?`,
        [trainerId, slotDate, endTime, startTime],
      );

      if (existing.length > 0) {
        throw new ConflictException(
          `Overlap detected for ${startTime}-${endTime}`,
        );
      }

      // ✅ insert
      const [insert] = await conn.execute<ResultSetHeader>(
        `INSERT INTO trainer_time_slots
         (trainer_id, slot_date, start_time, end_time, status)
         VALUES (?, ?, ?, ?, 'AVAILABLE')`,
        [trainerId, slotDate, startTime, endTime],
      );

      // ✅ fetch inserted row (SAFE)
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM trainer_time_slots WHERE id = ?`,
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

    await this.db.execute(
      `UPDATE trainers SET deleted_at = NOW() WHERE id = ?`,
      [id],
    );

    return { message: 'Trainer deleted successfully' };
  }
}