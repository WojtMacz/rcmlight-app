import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getFullRcmAnalysis, getPmSummary } from '../services/rcmAnalysisService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import { pmSummaryQuerySchema } from '../validators/rcm.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function getFullAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const analysis = await getFullRcmAnalysis(param(req, 'machineId'), cid(req), prisma);
    res.json({ status: 'ok', data: { analysis } });
  } catch (err) {
    next(err);
  }
}

export async function getPmSummaryCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { groupBy } = pmSummaryQuerySchema.parse(req.query);
    const summary = await getPmSummary(param(req, 'machineId'), cid(req), groupBy, prisma);
    res.json({ status: 'ok', data: { summary } });
  } catch (err) {
    next(err);
  }
}
