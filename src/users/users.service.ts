import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserQueries } from './queries/users.queries';
import { UserItem, PaginatedUsersResponse } from './users.types';
import { UpdateUserDto, ChangePasswordDto, AdminResetPasswordDto } from './dto/users.dto';
import { UserRole, UserStatus } from '../common/enums';
import * as bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findAll(query: { page?: number; limit?: number; search?: string }): Promise<PaginatedUsersResponse> {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const where: string[] = ['deleted_at IS NULL'];
    const params: (string | number)[] = [];

    if (query.search) {
      where.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const whereSQL = where.join(' AND ');

    const countResult = await this.db.query<{ total: number }>(
      UserQueries.FIND_ALL_COUNT(whereSQL),
      params,
    );
    const total = countResult[0]?.total || 0;

    const users = await this.db.query<UserItem>(
      UserQueries.FIND_ALL(whereSQL, limit, offset),
      params,
    );

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, currentUserId: number, currentUserRole: UserRole): Promise<UserItem> {

    if (currentUserRole !== UserRole.ADMIN && id !== currentUserId) {
      throw new ForbiddenException('You do not have permission to view other users');
    }

    const rows = await this.db.query<UserItem>(UserQueries.FIND_ONE, [id]);

    if (!rows.length) {
      throw new NotFoundException('User not found');
    }

    return rows[0];
  }

  async update(id: number, dto: UpdateUserDto, currentUserId: number, currentUserRole: UserRole): Promise<UserItem> {
    const user = await this.db.query<{ id: number; role: UserRole }>(UserQueries.FIND_BY_ID_INTERNAL, [id]);
    if (!user.length) throw new NotFoundException('User not found');

    if (currentUserRole !== UserRole.ADMIN && id !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const fields: string[] = [];
    const values: (string | number | UserRole | UserStatus | null)[] = [];

    if (dto.name) {
      fields.push('name = ?');
      values.push(dto.name);
    }

    if (dto.email) {

      const existing = await this.db.query(UserQueries.CHECK_EMAIL_EXISTS, [dto.email, id]);
      if (existing.length > 0) throw new ConflictException('Email already in use');
      
      fields.push('email = ?');
      values.push(dto.email);
    }

    if (currentUserRole === UserRole.ADMIN) {
      if (dto.role) {
        fields.push('role = ?');
        values.push(dto.role);
      }
      if (dto.status) {
        fields.push('status = ?');
        values.push(dto.status);
      }
    }

    if (fields.length === 0) return this.findOne(id, currentUserId, currentUserRole);

    const sql = UserQueries.UPDATE_DYNAMIC(fields.join(', '));
    values.push(id);

    await this.db.execute(sql, values);

    return this.findOne(id, currentUserId, currentUserRole);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const rows = await this.db.query<{ password_hash: string }>(UserQueries.FIND_BY_ID_INTERNAL, [userId]);
    if (!rows.length) throw new NotFoundException('User not found');

    const user = rows[0];
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Incorrect current password');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.db.execute(UserQueries.UPDATE_PASSWORD, [newHash, userId]);

    return { message: 'Password changed successfully' };
  }

  async adminResetPassword(targetUserId: number, dto: AdminResetPasswordDto): Promise<{ message: string }> {
    const rows = await this.db.query(UserQueries.FIND_BY_ID_INTERNAL, [targetUserId]);
    if (!rows.length) throw new NotFoundException('User not found');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.db.execute(UserQueries.UPDATE_PASSWORD, [newHash, targetUserId]);

    return { message: 'Password reset successfully by administrator' };
  }

  async remove(id: number): Promise<{ message: string }> {
    const rows = await this.db.query(UserQueries.FIND_BY_ID_INTERNAL, [id]);
    if (!rows.length) throw new NotFoundException('User not found');

    await this.db.execute(UserQueries.SOFT_DELETE, [id]);
    return { message: 'User deleted successfully' };
  }
}
