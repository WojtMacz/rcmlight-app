import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getCriticality, upsertCriticality } from '../services/criticalityService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import { criticalitySchema } from '../validators/rcm.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function upsertCriticalityCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = criticalitySchema.parse(req.body);
    const criticality = await upsertCriticality(param(req, 'causeId'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { criticality } });
  } catch (err) {
    next(err);
  }
}

export async function getCriticalityCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const criticality = await getCriticality(param(req, 'causeId'), cid(req), prisma);
    res.json({ status: 'ok', data: { criticality } });
  } catch (err) {
    next(err);
  }
}
