import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getCompanySettings, updateCompanySettings } from '../services/companyService';

const updateCompanySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
  defaultDowntimeCostPerHour: z.number().nonnegative().optional(),
  defaultTechnicianHourlyCost: z.number().nonnegative().optional(),
  defaultAllowedUnavailability: z.number().min(0).max(1).optional(),
});

// GET /api/v1/company
export async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const settings = await getCompanySettings(req.user.companyId, prisma);
    res.status(200).json({ status: 'ok', data: { company: settings } });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/company
export async function patchCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const body = updateCompanySchema.parse(req.body);
    const settings = await updateCompanySettings(req.user.companyId, body, prisma);
    res.status(200).json({ status: 'ok', data: { company: settings } });
  } catch (err) {
    next(err);
  }
}
