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

import {
  MemberRow,
  TrainerRow,
  SlotRow,
  SessionRow,
  PaginatedSessionsResponse,
} from './pt-sessions.types';
import { MessageResponse } from '../common/types/response.types';

export interface FindSessionsQuery {
  page?: string | number;
  limit?: string | number;
  memberId?: string | number;
  trainerId?: string | number;
  status?: string;
  date?: string;
}

@Injectable()
export class PtSessionsService {
  constructor(private db: DatabaseService) { }

  async findAll(query: FindSessionsQuery): Promise<PaginatedSessionsResponse | { success: boolean; message: string; statusCode: number }> {
    try {

      const page = Number(query.page) > 0 ? Number(query.page) : 1;
      const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
      const offset = (page - 1) * limit;

      const where: string[] = ['ps.deleted_at IS NULL'];
      const params: (string | number)[] = [];

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
          params.push(date.toISOString().split('T')[0]);
        }
      }

      const whereSQL = where.join(' AND ');

      const countResult = await this.db.query<{ total: number }>(
        PtSessionQueries.FIND_ALL_COUNT(whereSQL),
        params
      );

      const total = countResult?.[0]?.total || 0;

      const sessions = await this.db.query<SessionRow>(
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
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error);

      return {
        success: false,
        message: error instanceof Error && error.message ? error.message : 'Internal Server Error',
        statusCode: 500,
      };
    }
  }
  
  async findOne(id: number): Promise<SessionRow> {
    const sessions = await this.db.query<SessionRow>(
      PtSessionQueries.FIND_ONE,
      [id],
    );

    if (sessions.length === 0) {
      throw new NotFoundException('Session not found');
    }

    return sessions[0];
  }

  async bookSession(dto: BookSessionDto): Promise<SessionRow> {
    return this.db.transaction<SessionRow>(async (conn) => {

      const [memberRows] = await conn.query<MemberRow[]>(
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

      const [slotRows] = await conn.query<SlotRow[]>(
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

      const [trainerRows] = await conn.query<TrainerRow[]>(
        PtSessionQueries.LOCK_TRAINER,
        [slot.trainer_id],
      );

      if (trainerRows.length === 0) {
        throw new NotFoundException('Trainer not found');
      }

      const trainer = trainerRows[0];

      const sessionType = trainer.specialization;

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

      const [slotUpdate] = await conn.execute<ResultSetHeader>(
        PtSessionQueries.CHECK_SLOT_BOOKED,
        [SlotStatus.BOOKED, dto.slotId, SlotStatus.AVAILABLE],
      );

      if (slotUpdate.affectedRows === 0) {
        throw new ConflictException('Slot already booked');
      }

      const year = new Date().getFullYear();

      const [lastRows] = await conn.query<SessionRow[]>(
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

      const [insert] = await conn.execute<ResultSetHeader>(
        PtSessionQueries.INSERT_SESSION,

        [
          sessionCode,
          dto.memberId,
          slot.trainer_id,
          dto.slotId,
          sessionType,
          source,
          amount,
          slot.slot_date,
          SessionStatus.BOOKED,
        ],
      );

      const [resultRows] = await conn.query<SessionRow[]>(
        PtSessionQueries.GET_SESSION_BY_ID,
        [insert.insertId],
      );

      return resultRows[0];
    });
  }
  
  async cancelSession(id: number): Promise<MessageResponse> {
    return this.db.transaction<MessageResponse>(async (conn) => {

      const [sessionRows] = await conn.query<SessionRow[]>(
        PtSessionQueries.LOCK_CANCEL_STATUS,
        [id],
      );

      if (sessionRows.length === 0) {
        throw new NotFoundException('Session not found');
      }

      const session = sessionRows[0];

      if (session.status === SessionStatus.CANCELLED) {
        throw new BadRequestException('Session already cancelled');
      }

      if (session.status === SessionStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel completed session');
      }

      await conn.execute(
        PtSessionQueries.CANCEL_SESSION,
        [SessionStatus.CANCELLED, id],
      );

      await conn.execute(
        PtSessionQueries.FREE_SLOT,
        [SlotStatus.AVAILABLE, session.slot_id],
      );

      if (session.session_source === SessionSource.PLAN) {
        await conn.execute(
          PtSessionQueries.RESTORE_MEMBER_SESSION,
          [session.member_id],
        );
      }

      return { message: 'Session cancelled successfully' };
    });
  }

  async completeSession(id: number): Promise<SessionRow> {
    return this.db.transaction<SessionRow>(async (conn) => {

      const [rows] = await conn.query<SessionRow[]>(
        PtSessionQueries.LOCK_CANCEL_STATUS,
        [id],
      );

      if (rows.length === 0) {
        throw new NotFoundException('Session not found');
      }

      const session = rows[0];

      if (session.status !== SessionStatus.BOOKED) {
        throw new BadRequestException(
          'Only booked sessions can be completed',
        );
      }

      await conn.execute(
        PtSessionQueries.UPDATE_PT_SESSION_STATUS,
        [SessionStatus.COMPLETED, id],
      );

      const [updatedRows] = await conn.query<SessionRow[]>(
        PtSessionQueries.GET_SESSION_BY_ID,
        [id],
      );

      return updatedRows[0];
    });
  }

  async markNoShow(id: number): Promise<MessageResponse> {
    const session = await this.findOne(id);

    if (session.status !== SessionStatus.BOOKED) {
      throw new BadRequestException(
        'Only booked sessions can be marked as no-show',
      );
    }

    return this.db.transaction(async (conn) => {

      await conn.execute(
        PtSessionQueries.UPDATE_SESSION_NO_SHOW,
        [SessionStatus.NO_SHOW, id],
      );

      return {
        message: 'Session marked as no-show',
      };
    });
  }
  async rescheduleSession(sessionId: number, newSlotId: number): Promise<SessionRow> {
    const session = await this.findOne(sessionId);

    if (session.status !== SessionStatus.BOOKED) {
      throw new BadRequestException(
        'Only booked sessions can be rescheduled',
      );
    }

    return this.db.transaction<SessionRow>(async (conn) => {

      const [newSlotRows] = await conn.query<SlotRow[]>(
        PtSessionQueries.GET_SLOT_BY_ID,
        [newSlotId, SlotStatus.AVAILABLE],
      );

      if (newSlotRows.length === 0) {
        throw new ConflictException('New slot is not available or has been deleted');
      }

      const newSlot = newSlotRows[0];

      await conn.execute(
        PtSessionQueries.FREE_SLOT,
        [SlotStatus.AVAILABLE, session.slot_id],
      );

      const [updateSlot] = await conn.execute<ResultSetHeader>(
        PtSessionQueries.UPDATE_TRAINER_TIME_SLOT,
        [SlotStatus.BOOKED, newSlotId, SlotStatus.AVAILABLE],
      );

      if (updateSlot.affectedRows === 0) {
        throw new ConflictException('Slot was booked by someone else during this process');
      }

      await conn.execute(
        PtSessionQueries.UPDATE_SESSION_SLOT,
        [newSlotId, newSlot.slot_date, newSlot.trainer_id, sessionId],
      );

      const [finalRows] = await conn.query<SessionRow[]>(
        PtSessionQueries.GET_SESSION_BY_ID,
        [sessionId],
      );

      return finalRows[0];
    });
  }
  
  async getMemberSessions(memberId: number): Promise<SessionRow[]> {
    return this.db.query<SessionRow>(
      PtSessionQueries.GET_MEMBER_SESSIONS,
      [memberId],
    );
  }
}
