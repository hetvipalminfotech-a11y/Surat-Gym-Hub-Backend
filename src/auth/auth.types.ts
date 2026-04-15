import { UserRole, UserStatus, TokenStatus } from '../common/enums';
import { RowDataPacket } from 'mysql2';

export interface TrainerIdRow extends RowDataPacket {
  trainer_id: number;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  failed_attempts: number;
  locked_until: Date | null;
}

export interface TokenRow {
  expired_at: Date | string;
  id: number;
  access_token_hash: string;
  refresh_token_hash: string;
  user_id: number;
  status: TokenStatus;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    trainerId?: number;
  };
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
