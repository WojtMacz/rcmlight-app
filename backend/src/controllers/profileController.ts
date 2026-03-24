import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { updateProfile, changePassword } from '../services/profileService';

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Hasło: minimum 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
});

// PATCH /api/v1/users/me
export async function patchMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const body = updateProfileSchema.parse(req.body);
    const user = await updateProfile(req.user.sub, body, prisma);
    res.status(200).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/users/me/password
export async function changeMyPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const body = changePasswordSchema.parse(req.body);
    await changePassword(req.user.sub, body.currentPassword, body.newPassword, prisma);
    res.status(200).json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}
