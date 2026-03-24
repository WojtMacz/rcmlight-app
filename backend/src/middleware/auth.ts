import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  companyId: string;
  role: Role;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Brak tokenu autoryzacji'));
  }

  const token = authHeader.slice(7);
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Token wygasł — zaloguj się ponownie'));
    }
    next(new AppError(401, 'Token nieprawidłowy'));
  }
}
