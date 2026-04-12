import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { RenewMemberDto } from './dto/renew-member.dto';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ChangePlanDto } from './dto/change-plan.dto';

export interface MemberRow {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  health_conditions: string | null;
  emergency_contact_phone: string | null;
  membership_plan_id: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  remaining_pt_sessions: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlanRow {
  id: number;
  name: string;
  duration_months: number;
  price: number;
  pt_sessions: number;
}

@Injectable()
export class MembersService {
  constructor(private db: DatabaseService) {}

  /** ✅ Get all members */
  async findAll(query: {
    search?: string;
    status?: string;
    planId?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const offset = (page - 1) * limit;

    let whereClauses = ['m.deleted_at IS NULL'];
    const params: (string | number)[] = [];

    if (query.search) {
      whereClauses.push('(m.name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?)');
      const search = `%${query.search}%`;
      params.push(search, search, search);
    }

    if (query.status) {
      whereClauses.push('m.status = ?');
      params.push(query.status);
    }

    if (query.planId) {
      whereClauses.push('m.membership_plan_id = ?');
      params.push(Number(query.planId));
    }

    const whereSQL = whereClauses.join(' AND ');

    // COUNT
    const countRows = await this.db.execute(
      `SELECT COUNT(*) as total FROM members m WHERE ${whereSQL}`,
      params,
    ) as RowDataPacket[];

    const total = Number(countRows[0].total);

    // DATA
    const rows = await this.db.execute(
      `SELECT m.*, mp.name as plan_name
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE ${whereSQL}
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ) as RowDataPacket[];

    return {
      members: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** ✅ Get one member */
  async findOne(id: number) {
    const rows = await this.db.execute(
      `SELECT m.*, mp.name as plan_name
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE m.id = ? AND m.deleted_at IS NULL`,
      [id],
    ) as RowDataPacket[];

    if (rows.length === 0) {
      throw new NotFoundException('Member not found');
    }

    return rows[0];
  }

  /** ✅ Create member */
  async create(dto: CreateMemberDto, createdBy: number) {
    
    if (!createdBy) {
  throw new BadRequestException('User not authenticated');
}
    const planRows = await this.db.execute(
      `SELECT * FROM membership_plans WHERE id = ? AND deleted_at IS NULL`,
      [dto.membershipPlanId],
    ) as RowDataPacket[];

    if (planRows.length === 0) {
      throw new BadRequestException('Membership plan not found');
    }

    const plan = planRows[0] as PlanRow;

    // Generate member code
    const year = new Date().getFullYear();

    const lastRows = await this.db.execute(
      `SELECT member_code FROM members WHERE member_code LIKE ? ORDER BY id DESC LIMIT 1`,
      [`MEM-${year}-%`],
    ) as RowDataPacket[];

    let next = 1;
    if (lastRows.length > 0) {
      const lastCode = String(lastRows[0].member_code);
      const num = Number(lastCode.split('-')[2]);
      next = num + 1;
    }

    const memberCode = `MEM-${year}-${String(next).padStart(3, '0')}`;

    // Dates
  // Dates (FIXED)
const startDate = dto.startDate;

const start = new Date(startDate + 'T00:00:00');
const end = new Date(start);
end.setMonth(end.getMonth() + plan.duration_months);

const endDate = end.toISOString().split('T')[0]; 
if (new Date(endDate) <= new Date(dto.startDate)) {
  throw new BadRequestException('End date must be after start date');
}
    return this.db.transaction(async (conn) => {
      const [insertResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO members
        (member_code,name,phone,email,age,gender,health_conditions,
        emergency_contact_phone,membership_plan_id,start_date,end_date,
        status,remaining_pt_sessions,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          memberCode,
          dto.name,
          dto.phone,
          dto.email ?? null,
          dto.age ?? null,
          dto.gender ?? null,
          dto.healthConditions ?? null,
          dto.emergencyContactPhone ?? null,
          dto.membershipPlanId,
          startDate,
          endDate,
          'ACTIVE',
          plan.pt_sessions,
          createdBy ?? null
        ],
      );

      const memberId = insertResult.insertId;

      await conn.execute(
        `INSERT INTO membership_transactions
        (member_id,plan_id,amount,payment_method,transaction_type,start_date,end_date,status,created_by)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          memberId,
          dto.membershipPlanId,
          plan.price,
          dto.paymentMethod ?? 'CASH',
          'NEW',
          startDate,
          endDate,
          'SUCCESS',
          createdBy,
        ],
      );
      console.log(startDate,endDate);
      
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT m.*, mp.name as plan_name
         FROM members m
         LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
         WHERE m.id = ?`,
        [memberId],
      );
      
      return rows[0];
    });
  }

  /** ✅ Update */
  async update(id: number, dto: UpdateMemberDto) {
    await this.findOne(id);

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (dto.name !== undefined) {
      fields.push('name=?');
      values.push(dto.name);
    }
    if (dto.phone !== undefined) {
      fields.push('phone=?');
      values.push(dto.phone);
    }
    if (dto.email !== undefined) {
      fields.push('email=?');
      values.push(dto.email);
    }
    if (dto.age !== undefined) {
      fields.push('age=?');
      values.push(dto.age);
    }
    if (dto.gender !== undefined) {
      fields.push('gender=?');
      values.push(dto.gender);
    }
    if (dto.healthConditions !== undefined) {
      fields.push('health_conditions=?');
      values.push(dto.healthConditions);
    }
    if (dto.emergencyContactPhone !== undefined) {
      fields.push('emergency_contact_phone=?');
      values.push(dto.emergencyContactPhone);
    }
    if (dto.status !== undefined) {
      fields.push('status=?');
      values.push(dto.status);
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }
   
    values.push(id);

    await this.db.execute(
      `UPDATE members SET ${fields.join(',')} WHERE id=? AND deleted_at IS NULL`,
      values,
    );

    return this.findOne(id);
  }

  /** ✅ Cancel */
 async cancel(id: number, userId: number) {
  const member = await this.findOne(id);

  await this.db.transaction(async (conn) => {
    await conn.execute(
      `UPDATE members SET status = 'CANCELLED' WHERE id = ?`,
      [id],
    );

    await conn.execute(
      `INSERT INTO member_status_history
       (member_id, old_status, new_status, created_by)
       VALUES (?, ?, ?, ?)`,
      [id, member.status, 'CANCELLED', userId],
    );
  });

  return this.findOne(id);
}

  /** ✅ Delete */
  async remove(id: number) {
    await this.findOne(id);

    await this.db.execute(
      `UPDATE members SET deleted_at=NOW() WHERE id=?`,
      [id],
    );

    return { message: 'Member deleted successfully' };
  }
  /** ✅ Renew membership */
async renew(id: number, dto: RenewMemberDto, userId: number) {
  const member = await this.findOne(id);

  // ❌ Business rule
  if (member.status === 'CANCELLED') {
    throw new BadRequestException('Cancelled member cannot be renewed');
  }

  // ✅ Get plan
  const planRows = await this.db.execute(
    `SELECT * FROM membership_plans WHERE id = ? AND deleted_at IS NULL`,
    [dto.planId],
  ) as import('mysql2').RowDataPacket[];

  if (planRows.length === 0) {
    throw new BadRequestException('Membership plan not found');
  }

  const plan = planRows[0] as {
    id: number;
    duration_months: number;
    price: number;
    pt_sessions: number;
  };

  // ✅ Dates
  const start = new Date(dto.startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  if (end <= start) {
    throw new BadRequestException('End date must be after start date');
  }

  const endStr = end.toISOString().split('T')[0];

  return this.db.transaction(async (conn) => {
    // ✅ Update member
    await conn.execute(
      `UPDATE members
       SET membership_plan_id = ?, start_date = ?, end_date = ?,
           status = 'ACTIVE',
           remaining_pt_sessions =  ?
       WHERE id = ?`,
      [dto.planId, dto.startDate, endStr, plan.pt_sessions, id],
    );

    // ✅ Insert transaction
    await conn.execute(
      `INSERT INTO membership_transactions
      (member_id, plan_id, amount, payment_method, transaction_type,
       start_date, end_date, status, created_by)
      VALUES (?, ?, ?, ?, 'RENEW', ?, ?, 'SUCCESS', ?)`,
      [
        id,
        dto.planId,
        plan.price,
        dto.paymentMethod ?? 'CASH',
        dto.startDate,
        endStr,
        userId,
      ],
    );

    await conn.execute(
  `INSERT INTO member_status_history
   (member_id, old_status, new_status, created_by)
   VALUES (?, ?, ?, ?)`,
  [id, member.status, 'ACTIVE', userId],
);
    // ✅ Return updated member
    const [rows] = await conn.query<import('mysql2').RowDataPacket[]>(
      `SELECT m.*, mp.name as plan_name
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE m.id = ?`,
      [id],
    );

    return rows[0];
  });

}
async freeze(id: number, userId: number) {
  const member = await this.findOne(id);

  if (member.status !== 'ACTIVE') {
    throw new BadRequestException('Only active members can be frozen');
  }

  const today = new Date().toISOString().split('T')[0];

  await this.db.transaction(async (conn) => {
    // 1. Update member status
    await conn.execute(
      `UPDATE members SET status = 'FROZEN' WHERE id = ?`,
      [id],
    );

    // 2. Insert freeze history
    await conn.execute(
      `INSERT INTO member_freeze_history
       (member_id, freeze_start_date, created_by)
       VALUES (?, ?, ?)`,
      [id, today, userId],
    );

    // 3. Insert status history
    await conn.execute(
      `INSERT INTO member_status_history
       (member_id, old_status, new_status, created_by)
       VALUES (?, ?, ?, ?)`,
      [id, member.status, 'FROZEN', userId],
    );
  });

  return this.findOne(id);
}
async unfreeze(id: number, userId: number) {
  const member = await this.findOne(id);

  if (member.status !== 'FROZEN') {
    throw new BadRequestException('Member is not frozen');
  }

  // Get latest freeze record
  const rows = await this.db.execute(
    `SELECT * FROM member_freeze_history
     WHERE member_id = ? AND freeze_end_date IS NULL
     ORDER BY id DESC LIMIT 1`,
    [id],
  ) as RowDataPacket[];

  if (rows.length === 0) {
    throw new BadRequestException('Freeze record not found');
  }

  const freeze = rows[0];

  const today = new Date();
  const start = new Date(freeze.freeze_start_date);

  const diffDays = Math.ceil(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  const endDate = new Date(member.end_date);
  endDate.setDate(endDate.getDate() + diffDays);

  const endDateStr = endDate.toISOString().split('T')[0];

  await this.db.transaction(async (conn) => {
    // 1. Update member
    await conn.execute(
      `UPDATE members 
       SET status = 'ACTIVE', end_date = ?
       WHERE id = ?`,
      [endDateStr, id],
    );

    // 2. Update freeze history
    await conn.execute(
      `UPDATE member_freeze_history
       SET freeze_end_date = ?, total_days = ?
       WHERE id = ?`,
      [today.toISOString().split('T')[0], diffDays, freeze.id],
    );

    // 3. Status history
    await conn.execute(
      `INSERT INTO member_status_history
       (member_id, old_status, new_status, created_by)
       VALUES (?, ?, ?, ?)`,
      [id, 'FROZEN', 'ACTIVE', userId],
    );
  });

  return this.findOne(id);
}
async changePlan(id: number, dto: ChangePlanDto, userId: number) {
  const member = await this.findOne(id);

  if (member.status === 'CANCELLED') {
    throw new BadRequestException('Cancelled member cannot change plan');
  }

  // ✅ Validate plan
  const planRows = await this.db.execute(
    `SELECT * FROM membership_plans WHERE id = ? AND deleted_at IS NULL`,
    [dto.planId],
  ) as RowDataPacket[];

  if (planRows.length === 0) {
    throw new BadRequestException('Plan not found');
  }

  const plan = planRows[0] as PlanRow;

  // ✅ Use provided startDate OR today
  const startDate =
    dto.startDate || new Date().toISOString().split('T')[0];

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  const endDate = end.toISOString().split('T')[0];

  return this.db.transaction(async (conn) => {
    // 1️⃣ Update member
    await conn.execute(
      `UPDATE members 
       SET membership_plan_id = ?, 
           start_date = ?, 
           end_date = ?, 
           remaining_pt_sessions = ?
       WHERE id = ?`,
      [dto.planId, startDate, endDate, plan.pt_sessions, id],
    );

    // 2️⃣ Insert transaction
    await conn.execute(
      `INSERT INTO membership_transactions
       (member_id, plan_id, amount, payment_method, transaction_type, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, 'UPGRADE', ?, ?, 'SUCCESS', ?)`,
      [
        id,
        dto.planId,
        plan.price,
        dto.paymentMethod || 'CASH',
        startDate,
        endDate,
        userId,
      ],
    );

    // 3️⃣ Status history
 await conn.execute(
  `INSERT INTO member_status_history
   (member_id, old_status, new_status, old_plan_id, new_plan_id, note, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [
    id,
    member.status,
    member.status,
    member.membership_plan_id,
    dto.planId,
    'PLAN_CHANGED',
    userId,
  ],
);

    // 4️⃣ Return updated member
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT m.*, mp.name as plan_name
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE m.id = ?`,
      [id],
    );

    return rows[0];
  });
}
}