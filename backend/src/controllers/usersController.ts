import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { activateUser, deactivateUser, listCompanyUsers, updateUser } from '../services/userService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import { updateUserSchema } from '../validators/user.schemas';

// GET /api/v1/users
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.companyId) return next(new AppError(401, 'Brak kontekstu firmy'));
    const users = await listCompanyUsers(req.companyId, prisma);
    res.status(200).json({ status: 'ok', data: { users } });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/users/:id
export async function patchUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.companyId) return next(new AppError(401, 'Brak kontekstu firmy'));
    const body = updateUserSchema.parse(req.body);
    const user = await updateUser(param(req, 'id'), req.companyId, body, prisma);
    res.status(200).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/users/:id  (soft delete — dezaktywacja)
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.companyId || !req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const user = await deactivateUser(param(req, 'id'), req.companyId, req.user.sub, prisma);
    res.status(200).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/users/:id/activate
export async function activateUserCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.companyId) return next(new AppError(401, 'Brak kontekstu firmy'));
    const user = await activateUser(param(req, 'id'), req.companyId, prisma);
    res.status(200).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}
