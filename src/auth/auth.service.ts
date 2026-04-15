import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole, UserStatus, TokenStatus } from '../common/enums';
import { AuthQueries } from './queries/auth.queries';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

import {
  UserRow,
  TokenRow,
  TrainerIdRow,
  RegisterResponse,
  LoginResponse,
  TokenResponse,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(private db: DatabaseService) { }

  async register(dto: RegisterDto): Promise<RegisterResponse> {

    const existing = await this.db.query<UserRow>(
      AuthQueries.CHECK_EMAIL_EXISTS,
      [dto.email],
    );

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.db.execute<ResultSetHeader>(
      AuthQueries.INSERT_USER,
      [dto.name, dto.email, passwordHash, UserRole.RECEPTIONIST, UserStatus.ACTIVE],
    );

    return {
      id: result.insertId,
      name: dto.name,
      email: dto.email,
      role: UserRole.RECEPTIONIST,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {

    const users = await this.db.query<UserRow>(
      AuthQueries.FIND_USER_BY_EMAIL,
      [dto.email],
    );

    if (users.length === 0) {
      throw new UnauthorizedException('User with this email not found');
    }

    const user = users[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new ForbiddenException(
        'Account is locked due to too many failed attempts. Please try again later.',
      );
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked. Contact admin.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!isPasswordValid) {
      const newAttempts = user.failed_attempts + 1;

      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await this.db.execute(
          AuthQueries.LOCK_USER,
          [newAttempts, lockUntil, user.id],
        );
        throw new ForbiddenException(
          'Account locked due to 5 failed login attempts. Try again after 30 minutes.',
        );
      }

      await this.db.execute(
        AuthQueries.UPDATE_FAILED_ATTEMPTS,
        [newAttempts, user.id],
      );

      throw new UnauthorizedException('Incorrect password');
    }

    await this.db.execute(
      AuthQueries.RESET_LOGIN_ATTEMPTS,
      [user.id],
    );

    let trainerId: number | undefined;
    if (user.role === UserRole.TRAINER) {
      const trainerRows = await this.db.query<TrainerIdRow>(
        AuthQueries.GET_TRAINER_ID_BY_USER_ID,
        [user.id],
      );
      if (trainerRows.length > 0) {
        trainerId = trainerRows[0].trainer_id;
      }
    }

    const accessToken = this.generateAccessToken(user, trainerId);
    const refreshToken = this.generateRefreshToken(user);

    const accessTokenHash = await bcrypt.hash(accessToken, 10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.execute(
      AuthQueries.INSERT_TOKEN,
      [accessTokenHash, refreshTokenHash, expiredAt, TokenStatus.ACTIVE, user.id],
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trainerId,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponse> {

    let decoded: { userId: number; email: string; role: string };

    try {
      decoded = jwt.verify(
        dto.refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
      ) as typeof decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.db.query<TokenRow>(
      AuthQueries.FIND_ACTIVE_TOKENS,
      [decoded.userId, TokenStatus.ACTIVE],
    );

    let matchedToken: TokenRow | null = null;

    for (const token of tokens) {
      const isMatch = await bcrypt.compare(
        dto.refreshToken,
        token.refresh_token_hash,
      );
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Refresh token not found or revoked');
    }

    const users = await this.db.query<UserRow>(
      AuthQueries.GET_USER_BY_ID,
      [decoded.userId],
    );

    if (users.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = users[0];

    const newAccessToken = this.generateAccessToken(user);
    const accessTokenHash = await bcrypt.hash(newAccessToken, 10);

    const refreshTokenHash = matchedToken.refresh_token_hash;

    const expiredAt = matchedToken.expired_at;

    await this.db.execute(
      AuthQueries.INSERT_TOKEN,
      [
        accessTokenHash,
        refreshTokenHash,
        expiredAt,
        TokenStatus.ACTIVE,
        user.id,
      ],
    );

    return {
      accessToken: newAccessToken,
      refreshToken: dto.refreshToken,
    };
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.db.execute(
      AuthQueries.REVOKE_ALL_TOKENS,
      [TokenStatus.REVOKED, userId, TokenStatus.ACTIVE],
    );

    return { message: 'Logged out successfully' };
  }

  private generateAccessToken(user: UserRow, trainerId?: number): string {
    const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'];
    const payload: { userId: number; email: string; role: string; trainerId?: number } = { userId: user.id, email: user.email, role: user.role };
    if (trainerId) payload.trainerId = trainerId;

    return jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET || 'your_access_secret_key',
      { expiresIn },
    );
  }

  private generateRefreshToken(user: UserRow): string {
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
      { expiresIn },
    );
  }
}
