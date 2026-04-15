import { Request } from 'express';
import { UserRole } from '../enums';

export interface AuthUser {
  userId: number;
  role: UserRole;
  trainerId?: number;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
}
