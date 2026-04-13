import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BookSessionDto } from './dto/book-session.dto';
import { SessionStatus, SessionSource, MembershipStatus, SlotStatus } from '../common/enums';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PtSessionQueries } from './queries/pt-sessions.queries';

export interface MemberRow {
  id: number;
  member_code: string;
  status: string;
  remaining_pt_sessions: number;
  membership_plan_id: number;
}

export interface TrainerRow {
  id: number;
  specialization: string;
  session_rate: number;
  status: string;
}

export interface SlotRow {
  id: number;
  trainer_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface SessionRow {
  id: number;
  session_code: string;
  member_id: number;
  trainer_id: number;
  slot_id: number;
  session_type: string;
  session_source: string;
  amount_charged: number;
  session_date: string;
  status: string;
  member_name: string;
  trainer_name: string;
}

@Injectable()
export class PtSessionsService {
  constructor(private db: DatabaseService) {}

  /** Get all sessions with filters */
async findAll(query: any) {
  try {
    // Pagination
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    // WHERE conditions
    const where: string[] = ['ps.deleted_at IS NULL'];
    const params: (string | number)[] = [];

    // Filters
    if (query.memberId) {
      where.push('ps.member_id = ?');
      params.push(Number(query.memberId));
    }

    if (query.trainerId) {
      where.push('ps.trainer_id = ?');
      params.push(Number(query.trainerId));
    }

    if (query.status) {
      where.push('ps.status = ?');
      params.push(query.status);
    }

    if (query.date) {
      const date = new Date(query.date);
      if (!isNaN(date.getTime())) {
        where.push('DATE(ps.session_date) = ?');
        params.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
      }
    }

    const whereSQL = where.join(' AND ');

    // -----------------------
    // COUNT QUERY
    // -----------------------
    const countResult = await this.db.query<{ total: number }>(
      PtSessionQueries.FIND_ALL_COUNT(whereSQL),
      params
    );

    const total = countResult?.[0]?.total || 0;

    // -----------------------
    // DATA QUERY
    // -----------------------
    const sessions = await this.db.query(
   PtSessionQueries.FIND_ALL(whereSQL, limit, offset),
      params
    );

    return {
     sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error:any) {
    console.error('Error fetching sessions:', error);

    return {
      success: false,
      message: error.message || 'Internal Server Error',
      statusCode: 500,
    };
  }
}
  /** Get single session */
  async findOne(id: number) {
    const sessions = await this.db.query<SessionRow>(
        PtSessionQueries.FIND_ONE,
      [id],
    );

    if (sessions.length === 0) {
      throw new NotFoundException('Session not found');
    }

    return sessions[0];
  }

  /**
   * BOOK A PT SESSION - 3-WRITE TRANSACTION (CRITICAL)
   *
   * This is the MOST IMPORTANT business logic:
   * 1. INSERT the session
   * 2. UPDATE slot → Booked
   * 3. DECREMENT remaining sessions (if plan-based)
   *
   * Concurrency: We INSERT first and catch UNIQUE constraint errors
   * instead of SELECT → INSERT pattern.
   */
async bookSession(dto: BookSessionDto) {
  return this.db.transaction(async (conn) => {
    // 🔒 STEP 1: LOCK MEMBER
    const [memberRows] = await conn.query<RowDataPacket[]>(
     PtSessionQueries.LOCK_MEMBER,

      [dto.memberId],
    );

    if (memberRows.length === 0) {
      throw new NotFoundException('Member not found');
    }

    const member = memberRows[0];

    if (member.status !== MembershipStatus.ACTIVE) {
      throw new UnprocessableEntityException('Membership not active');
    }
    

    // 🔒 STEP 2: LOCK SLOT (and derive trainer from slot)
    const [slotRows] = await conn.query<RowDataPacket[]>(
       PtSessionQueries.LOCK_SLOT,
      [dto.slotId],
    );

    if (slotRows.length === 0) {
      throw new NotFoundException('Slot not found');
    }

    const slot = slotRows[0];

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new ConflictException('Slot already booked');
    }

    // 🔒 STEP 3: LOCK TRAINER (derived from slot)
    const [trainerRows] = await conn.query<RowDataPacket[]>(
     PtSessionQueries.LOCK_TRAINER,
      [slot.trainer_id],
    );

    if (trainerRows.length === 0) {
      throw new NotFoundException('Trainer not found');
    }

    const trainer = trainerRows[0];

    // ✅ sessionType comes from trainer (NOT from DTO)
    const sessionType = trainer.specialization;

    // 🔥 STEP 4: DETERMINE PLAN vs PAID
    let source: SessionSource;
    let amount = 0;

    if (member.remaining_pt_sessions > 0) {
      source = SessionSource.PLAN;

      const [updateMember] = await conn.execute<ResultSetHeader>(
      PtSessionQueries.DECREMENT_MEMBER_SESSION,
        [dto.memberId],
      );

      if (updateMember.affectedRows === 0) {
        throw new UnprocessableEntityException('No remaining sessions');
      }
    } else {
      source = SessionSource.PAID;
      amount = trainer.session_rate;
    }

    // 🔥 STEP 5: UPDATE SLOT → BOOKED
    const [slotUpdate] = await conn.execute<ResultSetHeader>(
     PtSessionQueries.CHECK_SLOT_BOOKED,
      [SlotStatus.BOOKED, dto.slotId, SlotStatus.AVAILABLE],
    );

    if (slotUpdate.affectedRows === 0) {
      throw new ConflictException('Slot already booked');
    }

    // 🔥 STEP 6: GENERATE SESSION CODE
    const year = new Date().getFullYear();

    const [lastRows] = await conn.query<RowDataPacket[]>(
    PtSessionQueries.GENERATE_SESSION_CODE,
      [`PT-${year}-%`],
    );

    let next = 1;

    if (lastRows.length > 0) {
      const lastCode = lastRows[0].session_code;
      const lastNumber = parseInt(lastCode.split('-')[2], 10);
      next = lastNumber + 1;
    }

    const sessionCode = `PT-${year}-${String(next).padStart(3, '0')}`;

    // 🔥 STEP 7: INSERT SESSION
    const [insert] = await conn.execute<ResultSetHeader>(
    PtSessionQueries.INSERT_SESSION,

      [
        sessionCode,
        dto.memberId,
        slot.trainer_id, // ✅ from slot (NOT dto)
        dto.slotId,
        sessionType,     // ✅ from trainer
        source,
        amount,
        slot.slot_date,
        SessionStatus.BOOKED,
      ],
    );

    // 🔥 STEP 8: RETURN RESULT
    const [resultRows] = await conn.query<RowDataPacket[]>(
    PtSessionQueries.GET_SESSION_BY_ID,
      [insert.insertId],
    );

    return resultRows[0];
  });
}
  /**
   * CANCEL A SESSION
   * - Slot → Available
   * - Restore session count (if PLAN)
   */
async cancelSession(id: number) {
  return this.db.transaction(async (conn) => {
    // 🔒 STEP 1: LOCK SESSION
    const [sessionRows] = await conn.query<RowDataPacket[]>(
     PtSessionQueries.LOCK_CANCEL_STATUS,
      [id],
    );

    if (sessionRows.length === 0) {
      throw new NotFoundException('Session not found');
    }

    const session = sessionRows[0];

    // 🚫 STEP 2: VALIDATION
    if (session.status === SessionStatus.CANCELLED) {
      throw new BadRequestException('Session already cancelled');
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed session');
    }

    // 🔥 STEP 3: UPDATE SESSION
    await conn.execute(
      SessionStatus.CANCELLED,
      [SessionStatus.CANCELLED, id],
    );

    // 🔥 STEP 4: FREE SLOT
    await conn.execute(
      SlotStatus.AVAILABLE,
      [SlotStatus.AVAILABLE, session.slot_id],
    );

    // 🔥 STEP 5: RESTORE MEMBER SESSION (ONLY PLAN)
    if (session.session_source === SessionSource.PLAN) {
      await conn.execute(
       PtSessionQueries.RESTORE_MEMBER_SESSION,
        [session.member_id],
      );
    }

    return { message: 'Session cancelled successfully' };
  });
}

  /** Mark session as completed */
async completeSession(id: number) {
  return this.db.transaction(async (conn) => {
    // 🔒 STEP 1: LOCK SESSION
    const [rows] = await conn.query<RowDataPacket[]>(
     PtSessionQueries.COMPLETE_SESSION,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Session not found');
    }

    const session = rows[0];

    // 🚫 STEP 2: VALIDATION
    if (session.status !== SessionStatus.BOOKED) {
      throw new BadRequestException(
        'Only booked sessions can be completed',
      );
    }
    if (session.status === SessionStatus.CANCELLED) {
      throw new BadRequestException('Cancelled session cannot be completed');
    }
    // 🔥 STEP 3: UPDATE STATUS
    await conn.execute(
      PtSessionQueries.UPDATE_PT_SESSION_STATUS,
      [SessionStatus.COMPLETED, id],
    );

    // 🔥 STEP 4: RETURN UPDATED SESSION
    const [updatedRows] = await conn.query<RowDataPacket[]>(
      PtSessionQueries.GET_SESSION_BY_ID,
      [id],
    );

    return updatedRows[0];
  });
}

  /** Mark session as no-show */
 async markNoShow(id: number) {
  const session = await this.findOne(id);

  if (session.status !== SessionStatus.BOOKED) {
    throw new BadRequestException(
      'Only booked sessions can be marked as no-show',
    );
  }

  return this.db.transaction(async (conn) => {
    // 1️⃣ Update session → NO_SHOW
    await conn.execute(
     PtSessionQueries.UPDATE_SESSION_NO_SHOW,
      [SessionStatus.NO_SHOW, id],
    );

 
    return {
      message: 'Session marked as no-show',
    };
  });
}
async rescheduleSession(sessionId: number, newSlotId: number) {
  const session = await this.findOne(sessionId);

  if (session.status !== SessionStatus.BOOKED) {
    throw new BadRequestException(
      'Only booked sessions can be rescheduled',
    );
  }

  return this.db.transaction(async (conn) => {
    // 1️⃣ Get new slot
    const [newSlotRows] = await conn.query<RowDataPacket[]>(
      PtSessionQueries.GET_SLOT_BY_ID,
      [newSlotId, SlotStatus.AVAILABLE],
    );

    if (newSlotRows.length === 0) {
      throw new ConflictException('New slot is not available');
    }

    const newSlot = newSlotRows[0];

    // 2️⃣ Free old slot
    await conn.execute(
     PtSessionQueries.FREE_SLOT, 
      [SlotStatus.AVAILABLE, session.slot_id],
    );

    // 3️⃣ Book new slot (CONCURRENCY SAFE)
    const [updateSlot] = await conn.execute<ResultSetHeader>(
     PtSessionQueries.UPDATE_TRAINER_TIME_SLOT,
      [SlotStatus.BOOKED, newSlotId, SlotStatus.AVAILABLE],
    );

    if (updateSlot.affectedRows === 0) {
      throw new ConflictException('Slot already booked by someone else');
    }

    // 4️⃣ Update session
    await conn.execute(
     PtSessionQueries.UPDATE_SESSION_SLOT,
      [newSlotId, newSlot.slot_date, sessionId],
    );

    return this.findOne(sessionId);
  });
}
  /** Get sessions for a specific member */
  async getMemberSessions(memberId: number) {
    return this.db.query<SessionRow>(
      PtSessionQueries.GET_MEMBER_SESSIONS,
      [memberId],
    );
  }
}
