import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { deletePMTask, updatePMTask, upsertPMTask } from '../services/pmTaskService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import { createPMTaskSchema, updatePMTaskSchema } from '../validators/rcm.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function upsertPMTaskCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createPMTaskSchema.parse(req.body);
    const pmTask = await upsertPMTask(param(req, 'causeId'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { pmTask } });
  } catch (err) {
    next(err);
  }
}

export async function updatePMTaskCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updatePMTaskSchema.parse(req.body);
    const pmTask = await updatePMTask(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { pmTask } });
  } catch (err) {
    next(err);
  }
}

export async function removePMTaskCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deletePMTask(param(req, 'id'), cid(req), prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}
