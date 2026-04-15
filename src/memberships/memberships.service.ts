import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { MembershipPlanQueries } from './queries/membership.queries';

import { PlanRow } from './memberships.types';
import { MessageResponse } from '../common/types/response.types';

@Injectable()
export class MembershipsService {
  constructor(private db: DatabaseService) {}

  async findAll(query?: { status?: string; accessHours?: string }): Promise<PlanRow[]> {
    const whereClauses = ['deleted_at IS NULL'];
    const params: (string | number)[] = [];

    if (query?.status) {
      whereClauses.push('status = ?');
      params.push(query.status);
    }

    if (query?.accessHours) {
      whereClauses.push('access_hours = ?');
      params.push(query.accessHours);
    }

    const whereSQL = whereClauses.join(' AND ');
    const sql = MembershipPlanQueries.FIND_ALL(whereSQL);

    const result = await this.db.execute<PlanRow[]>(sql, params);
    return result;
  }

  async findOne(id: number): Promise<PlanRow> {
    const result = await this.db.execute(
      MembershipPlanQueries.FIND_ONE,
      [id],
    );

    const plans = result as PlanRow[];

    if (plans.length === 0) {
      throw new NotFoundException('Membership plan not found');
    }

    return plans[0];
  }

  async create(dto: CreatePlanDto): Promise<PlanRow> {
    const existingResult = await this.db.execute(
      MembershipPlanQueries.FIND_BY_NAME,
      [dto.name],
    );

    const existing = existingResult as { id: number }[];

    if (existing.length > 0) {
      throw new ConflictException('Plan with this name already exists');
    }

    if (dto.durationMonths <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

    if (dto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
    
    const result = await this.db.execute(
      MembershipPlanQueries.INSERT,
      [
        dto.name,
        dto.durationMonths,
        dto.price,
        dto.ptSessions ?? 0,
        dto.accessHours ?? 'FULL',
        'ACTIVE',
      ],
    );

    const insertResult = result as { insertId: number };

    return this.findOne(insertResult.insertId);
  }

  async update(id: number, dto: UpdatePlanDto): Promise<PlanRow> {
    await this.findOne(id);

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (dto.name !== undefined) {
      const checkResult = await this.db.execute(
        MembershipPlanQueries.FIND_BY_NAME_EXCLUDE_ID,
        [dto.name, id],
      );

      const existing = checkResult as { id: number }[];

      if (existing.length > 0) {
        throw new ConflictException('Plan name already exists');
      }

      fields.push('name = ?');
      values.push(dto.name);
    }

    if (dto.durationMonths !== undefined) {
      if (dto.durationMonths <= 0) {
        throw new BadRequestException('Duration must be greater than 0');
      }
      fields.push('duration_months = ?');
      values.push(dto.durationMonths);
    }

    if (dto.price !== undefined) {
      if (dto.price < 0) {
        throw new BadRequestException('Price cannot be negative');
      }
      fields.push('price = ?');
      values.push(dto.price);
    }

    if (dto.ptSessions !== undefined) {
      if (dto.ptSessions < 0) {
        throw new BadRequestException('PT sessions cannot be negative');
      }
      fields.push('pt_sessions = ?');
      values.push(dto.ptSessions);
    }

    if (dto.accessHours !== undefined) {
      fields.push('access_hours = ?');
      values.push(dto.accessHours);
    }

    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }

    if (fields.length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    values.push(id);

    const sql = MembershipPlanQueries.UPDATE_BASE.replace(
      '%FIELDS%',
      fields.join(', '),
    );

    await this.db.execute(sql, values);

    return this.findOne(id);
  }

  async remove(id: number): Promise<MessageResponse> {
    await this.findOne(id);

    const usedResult = await this.db.execute(
      MembershipPlanQueries.CHECK_USED,
      [id],
    );

    const used = usedResult as { id: number }[];

    if (used.length > 0) {
      throw new BadRequestException('Plan is assigned to active members and cannot be deleted');
    }

    await this.db.execute(
      MembershipPlanQueries.SOFT_DELETE,
      [id],
    );

    return { message: 'Plan deleted successfully' };
  }

  async restore(id: number): Promise<PlanRow> {
    const result = await this.db.execute(
      MembershipPlanQueries.FIND_WITH_DELETED,
      [id],
    );

    const plans = result as PlanRow[];

    if (plans.length === 0) {
      throw new NotFoundException('Plan not found');
    }

    if (!plans[0].deleted_at) {
      throw new BadRequestException('Plan is not deleted');
    }

    await this.db.execute(
      MembershipPlanQueries.RESTORE,
      [id],
    );

    return this.findOne(id);
  }
}
