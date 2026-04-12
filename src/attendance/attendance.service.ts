import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ResultSetHeader } from 'mysql2';
import { MembershipStatus } from 'src/common/enums';

export interface AttendanceRow {
  id: number;
  member_id: number;
  check_in_time: string;
  check_out_time: string | null;
  attendance_date: string;
  member_name?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private db: DatabaseService) {}

  /** Check-in a member */
 async checkIn(memberId: number) {
  const members = await this.db.query<{ id: number; status: string; name: string }>(
    'SELECT id, status, name FROM members WHERE id = ? AND deleted_at IS NULL',
    [memberId],
  );

  if (!members.length) {
    throw new NotFoundException('Member not found');
  }

  if (members[0].status !== MembershipStatus.ACTIVE) {
    throw new BadRequestException('Member membership is not active');
  }

  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const time = now.toTimeString().slice(0, 8);
  const dateTime = `${today} ${time}`;

  try {
    const result = await this.db.execute<ResultSetHeader>(
      `INSERT INTO attendance (member_id, check_in_time, attendance_date)
       VALUES (?, ?, ?)`,
      [memberId, dateTime, today],
    );

    const rows = await this.db.query<AttendanceRow>(
      `SELECT a.*, m.name as member_name
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       WHERE a.id = ?`,
      [result.insertId],
    );

    return rows[0];
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('Member already checked in today');
    }

    throw error;
  }
}

  /** Check-out a member */
  async checkOut(memberId: number) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date()
  .toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' })
  .replace('T', ' ');
    const member = await this.db.query(
      `SELECT id FROM members WHERE id = ?`,
      [memberId],
    );

    if (!member.length) {
      throw new NotFoundException('Member not found');
    }
    const result = await this.db.execute<ResultSetHeader>(
      `UPDATE attendance SET check_out_time = ?
       WHERE member_id = ? AND attendance_date = ? AND check_out_time IS NULL`,
      [now, memberId, today],
    );

    if (result.affectedRows === 0) {
      throw new BadRequestException('No active check-in found for today');
    }

    return { message: 'Checked out successfully', checkOutTime: now };
  }

  /** Get attendance for a date */
  async getByDate(date: string) {
    return this.db.query<AttendanceRow>(
      `SELECT a.*, m.name as member_name
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       WHERE a.attendance_date = ? AND a.deleted_at IS NULL
       ORDER BY a.check_in_time DESC`,
      [date],
    );
  }

  /** Get attendance for a member */
  async getByMember(memberId: number, month?: string) {
    let sql = `SELECT * FROM attendance WHERE member_id = ? AND deleted_at IS NULL`;
    const params: (string | number | boolean | null | Date)[] = [memberId];

    if (month) {
      sql += ` AND DATE_FORMAT(attendance_date, '%Y-%m') = ?`;
      params.push(month);
    }

    sql += ` ORDER BY attendance_date DESC`;

    return this.db.query<AttendanceRow>(sql, params);
  }
}
