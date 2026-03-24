import { NextFunction, Request, Response } from 'express';
import type { Role } from './auth';
import { AppError } from '../utils/AppError';

/**
 * Wymaga, żeby zalogowany użytkownik miał jedną z podanych ról.
 * Musi być użyty PO middleware `authenticate`.
 *
 * @example
 * router.delete('/users/:id', authenticate, requireRole('ADMIN'), controller)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Brak autoryzacji'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(403, `Wymagana rola: ${roles.join(' lub ')}. Twoja rola: ${req.user.role}`),
      );
    }
    next();
  };
}
