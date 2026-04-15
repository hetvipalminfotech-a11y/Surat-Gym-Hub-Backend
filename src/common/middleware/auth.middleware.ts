import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: string;
    trainerId?: number;
  };
}

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  trainerId?: number;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token is required');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) {
        throw new Error('JWT secret not defined');
      }
      const decoded = jwt.verify(token, secret) as JwtPayload;

      (req as AuthenticatedRequest).user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        trainerId: decoded.trainerId,
      };

      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
