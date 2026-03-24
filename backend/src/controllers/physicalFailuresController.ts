import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createCause,
  createPhysicalFailure,
  deleteCause,
  deletePhysicalFailure,
  listCauses,
  listPhysicalFailures,
  updateCause,
  updatePhysicalFailure,
} from '../services/rcmService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  createFailureCauseSchema,
  createPhysicalFailureSchema,
  updateFailureCauseSchema,
  updatePhysicalFailureSchema,
} from '../validators/rcm.schemas';
import { deleteQuerySchema } from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

// ── PhysicalFailure ────────────────────────────────────────────────────────

export async function listPF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const failures = await listPhysicalFailures(param(req, 'ffId'), cid(req), prisma);
    res.json({ status: 'ok', data: { failures } });
  } catch (err) {
    next(err);
  }
}

export async function createPF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createPhysicalFailureSchema.parse(req.body);
    const failure = await createPhysicalFailure(param(req, 'ffId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { failure } });
  } catch (err) {
    next(err);
  }
}

export async function updatePF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updatePhysicalFailureSchema.parse(req.body);
    const failure = await updatePhysicalFailure(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { failure } });
  } catch (err) {
    next(err);
  }
}

export async function removePF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = deleteQuerySchema.parse(req.query);
    await deletePhysicalFailure(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}

// ── FailureCause ───────────────────────────────────────────────────────────

export async function listCausesCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const causes = await listCauses(param(req, 'pfId'), cid(req), prisma);
    res.json({ status: 'ok', data: { causes } });
  } catch (err) {
    next(err);
  }
}

export async function createCauseCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createFailureCauseSchema.parse(req.body);
    const cause = await createCause(param(req, 'pfId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { cause } });
  } catch (err) {
    next(err);
  }
}

export async function updateCauseCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updateFailureCauseSchema.parse(req.body);
    const cause = await updateCause(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { cause } });
  } catch (err) {
    next(err);
  }
}

export async function removeCauseCtrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { force } = deleteQuerySchema.parse(req.query);
    await deleteCause(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}
