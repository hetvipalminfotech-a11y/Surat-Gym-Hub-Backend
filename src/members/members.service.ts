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
import { MemberQueries } from './queries/members.queries';
import { MemberFilterDto } from './dto/member-filter.dto';

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
 async findAll(query: MemberFilterDto) {
  // ✅ Parse pagination safely
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit =
    Number(query.limit) > 0 && Number(query.limit) <= 100
      ? Number(query.limit)
      : 20;

  const offset = (page - 1) * limit;

  // ✅ WHERE conditions
  const whereClauses = ['m.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (query.search) {
    whereClauses.push(
      '(m.name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?)',
    );
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

  // ✅ COUNT
  const countRows = (await this.db.execute(
    MemberQueries.FIND_ALL_COUNT(whereSQL),
    params,
  )) as RowDataPacket[];

  const total = Number(countRows[0]?.total ?? 0);

  // ✅ DATA
  const rows = (await this.db.execute(
    MemberQueries.FIND_ALL_DATA(whereSQL, limit, offset),
    params,
  )) as RowDataPacket[];

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
    const rows = (await this.db.execute(MemberQueries.FIND_ONE, [
      id,
    ])) as RowDataPacket[];

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

  // ✅ Validate plan
  const planRows = (await this.db.execute(
    MemberQueries.RENEW_GET_PLAN,
    [dto.membershipPlanId],
  )) as RowDataPacket[];

  if (planRows.length === 0) {
    throw new BadRequestException('Membership plan not found');
  }

  const plan = planRows[0] as PlanRow;

  // ✅ Generate member code
  const year = new Date().getFullYear();

  const lastRows = (await this.db.execute(
    MemberQueries.FIND_MEMBER_CODE,
    [`MEM-${year}-%`],
  )) as RowDataPacket[];

  let next = 1;
  if (lastRows.length > 0) {
    const lastCode = String(lastRows[0].member_code);
    const num = Number(lastCode.split('-')[2]);
    next = num + 1;
  }

  const memberCode = `MEM-${year}-${String(next).padStart(3, '0')}`;

  // ✅ Date handling
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(dto.startDate + 'T00:00:00');

  // ❌ Prevent past date
  if (start < today) {
    throw new BadRequestException('Start date cannot be in the past');
  }

  // ✅ Calculate end date
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  if (end <= start) {
    throw new BadRequestException('End date must be after start date');
  }

  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  // ✅ Determine status dynamically
  let status: string = 'ACTIVE';

  const now = new Date();
  if (end < now) {
    status = 'EXPIRED';
  }

  // ✅ Transaction
  return this.db.transaction(async (conn) => {
    const [insertResult] = await conn.execute<ResultSetHeader>(
      MemberQueries.INSERT_MEMBER,
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
        status, // ✅ dynamic
        plan.pt_sessions,
        createdBy,
      ],
    );

    const memberId = insertResult.insertId;

    // ✅ Insert transaction
    await conn.execute(MemberQueries.INSERT_TRANSACTION_NEW, [
      memberId,
      dto.membershipPlanId,
      plan.price,
      dto.paymentMethod ?? 'CASH',
      'NEW',
      startDate,
      endDate,
      'SUCCESS',
      createdBy,
    ]);

    // ✅ Return created member
    const [rows] = await conn.query<RowDataPacket[]>(
      MemberQueries.GET_MEMBER_WITH_PLAN,
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
      MemberQueries.UPDATE_MEMBER_DYNAMIC(fields.join(',')),
      values,
    );

    return this.findOne(id);
  }

  /** ✅ Cancel */
  async cancel(id: number, userId: number) {
    const member = await this.findOne(id);

    await this.db.transaction(async (conn) => {
      await conn.execute(MemberQueries.CANCEL_MEMBER, [id]);

      await conn.execute(MemberQueries.INSERT_STATUS_HISTORY_CANCEL, [
        id,
        member.status,
        'CANCELLED',
        userId,
      ]);
    });

    return this.findOne(id);
  }

  /** ✅ Delete */
  async remove(id: number) {
    await this.findOne(id);

    await this.db.execute(MemberQueries.DELETE_MEMBER, [id]);

    return { message: 'Member deleted successfully' };
  }
  /** ✅ Renew membership */
 async renew(id: number, dto: RenewMemberDto, userId: number) {
  const member = await this.findOne(id);

  const today = new Date();
  const memberEndDate = new Date(member.end_date);

  // ❌ Cancelled
  if (member.status === 'CANCELLED') {
    throw new BadRequestException('Cancelled member cannot be renewed');
  }

  // ❌ Frozen
  if (member.status === 'FROZEN') {
    throw new BadRequestException('Unfreeze member before renewal');
  }

  // ❌ Too early renewal
  const diffDays = Math.ceil(
    (memberEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (member.status === 'ACTIVE' && diffDays > 7) {
    throw new BadRequestException('Member can renew only near expiry');
  }

  // ✅ Get plan FIRST
  const planRows = await this.db.execute(MemberQueries.RENEW_GET_PLAN, [
    dto.planId,
  ]) as import('mysql2').RowDataPacket[];

  if (planRows.length === 0) {
    throw new BadRequestException('Membership plan not found');
  }

  const plan = planRows[0] as {
    id: number;
    duration_months: number;
    price: number;
    pt_sessions: number;
  };

  // ✅ Decide START DATE (stack logic)
  let start: Date;

  if (memberEndDate >= today) {
    // active → start after current plan ends
    start = new Date(memberEndDate);
    start.setDate(start.getDate() + 1);
  } else {
    // expired → start today or given date
    start = new Date(dto.startDate || today);
  }

  // ❌ Validate start date
  if (start < today) {
    throw new BadRequestException('Start date cannot be in the past');
  }

  // ✅ Calculate END DATE
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  if (end <= start) {
    throw new BadRequestException('End date must be after start date');
  }

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  // ✅ Transaction
  return this.db.transaction(async (conn) => {
    // ✅ Update member
    await conn.execute(MemberQueries.RENEW_UPDATE_MEMBER, [
      dto.planId,
      startStr,   // ✅ FIXED
      endStr,
      plan.pt_sessions,
      id,
    ]);

    // ✅ Insert transaction
    await conn.execute(MemberQueries.RENEW_TRANSACTION, [
      id,
      dto.planId,
      plan.price,
      dto.paymentMethod ?? 'CASH',
      startStr,   // ✅ FIXED
      endStr,
      userId,
    ]);

    // ✅ Status history
    await conn.execute(MemberQueries.RENEW_STATUS_HISTORY, [
      id,
      member.status,
      'ACTIVE',
      userId,
    ]);

    // ✅ Return updated member
    const [rows] = await conn.query<import('mysql2').RowDataPacket[]>(
      MemberQueries.RETURN_UPDATE_MEMBER,
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
      await conn.execute(MemberQueries.UPDATE_MEMBER_STATUS, [id]);

      // 2. Insert freeze history
      await conn.execute(MemberQueries.FREEZE_HISTORY_INSERT, [
        id,
        today,
        userId,
      ]);

      // 3. Insert status history
      await conn.execute(MemberQueries.FREEZE_STATUS_HISTORY, [
        id,
        member.status,
        'FROZEN',
        userId,
      ]);
    });

    return this.findOne(id);
  }
  async unfreeze(id: number, userId: number) {
    const member = await this.findOne(id);

    if (member.status !== 'FROZEN') {
      throw new BadRequestException('Member is not frozen');
    }

    // Get latest freeze record
    const rows = (await this.db.execute(MemberQueries.UNFREEZE_GET_LATEST, [
      id,
    ])) as RowDataPacket[];

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
      await conn.execute(MemberQueries.UNFREEZE_UPDATE_MEMBER, [
        endDateStr,
        id,
      ]);

      // 2. Update freeze history
      await conn.execute(MemberQueries.UNFREEZE_UPDATE_FREEZE, [
        today.toISOString().split('T')[0],
        diffDays,
        freeze.id,
      ]);

      // 3. Status history
      await conn.execute(MemberQueries.UNFREEZE_STATUS_HISTORY, [
        id,
        'FROZEN',
        'ACTIVE',
        userId,
      ]);
    });

    return this.findOne(id);
  }
  async changePlan(id: number, dto: ChangePlanDto, userId: number) {
  const member = await this.findOne(id);

  // ❌ Cancelled
  if (member.status === 'CANCELLED') {
    throw new BadRequestException('Cancelled member cannot change plan');
  }

  // ❌ Frozen
  if (member.status === 'FROZEN') {
    throw new BadRequestException('Unfreeze member before changing plan');
  }

  // ❌ Only ACTIVE allowed
  if (member.status !== 'ACTIVE') {
    throw new BadRequestException('Only active members can change plan');
  }

  // ✅ Validate new plan
  const planRows = await this.db.execute<RowDataPacket[]>(
    MemberQueries.CHANGE_PLAN_GET_PLAN,
    [dto.planId],
  );

  if (planRows.length === 0) {
    throw new BadRequestException('Plan not found');
  }

  const plan = planRows[0] as PlanRow;

  // ✅ Date handling
  const today = new Date();

  let start: Date;

  if (dto.startDate) {
    start = new Date(dto.startDate + 'T00:00:00');

    // ❌ Past date not allowed
    if (start < today) {
      throw new BadRequestException('Start date cannot be in the past');
    }
  } else {
    // ✅ Default → immediate change
    start = today;
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  if (end <= start) {
    throw new BadRequestException('Invalid plan duration');
  }

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  return this.db.transaction(async (conn) => {
    // ✅ 1. Update member (IMMEDIATE CHANGE)
    await conn.execute(MemberQueries.CHANGE_PLAN_UPDATE_MEMBER, [
      dto.planId,
      startStr,
      endStr,
      plan.pt_sessions,
      id,
    ]);

    // ✅ 2. Insert transaction
    await conn.execute(MemberQueries.CHANGE_PLAN_TRANSACTION, [
      id,
      dto.planId,
      plan.price,
      dto.paymentMethod || 'CASH',
      startStr,
      endStr,
      userId,
    ]);

    // ✅ 3. Status history (plan change tracking)
    await conn.execute(MemberQueries.CHANGE_PLAN_STATUS_HISTORY, [
      id,
      member.status,
      member.status, // remains ACTIVE
      member.membership_plan_id,
      dto.planId,
      'PLAN_CHANGED',
      userId,
    ]);

    // ✅ 4. Return updated member
    const [rows] = await conn.query<RowDataPacket[]>(
      MemberQueries.CHANGE_PLAN_AFTER_UPDATE_MEMBER,
      [id],
    );

    return rows[0];
  });
}
}
