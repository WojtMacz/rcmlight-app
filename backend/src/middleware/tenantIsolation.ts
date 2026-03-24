import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

declare global {
  namespace Express {
    interface Request {
      companyId?: string;
    }
  }
}

/**
 * Middleware — wyciąga companyId z JWT i udostępnia jako `req.companyId`.
 * Zapewnia, że każde kolejne zapytanie do DB jest filtrowane przez companyId.
 * Musi być użyty PO middleware `authenticate`.
 */
export function tenantIsolation(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.companyId) {
    return next(new AppError(401, 'Brak identyfikatora firmy w tokenie'));
  }
  req.companyId = req.user.companyId;
  next();
}

/**
 * Helper do sprawdzenia czy zasób należy do firmy użytkownika.
 * Rzuca AppError 403 jeśli nie — używaj w serwisach/kontrolerach.
 */
export function assertSameCompany(
  userCompanyId: string,
  resourceCompanyId: string,
  label = 'zasób',
): void {
  if (userCompanyId !== resourceCompanyId) {
    throw new AppError(403, `Brak dostępu — ${label} należy do innej firmy`);
  }
}
