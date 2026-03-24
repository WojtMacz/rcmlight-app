import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createSystem,
  deleteSystem,
  listSystems,
  reorderSystems,
  updateSystem,
} from '../services/bomNodeService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  createSystemSchema,
  deleteQuerySchema,
  reorderSystemsSchema,
  updateSystemSchema,
} from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const systems = await listSystems(param(req, 'machineId'), cid(req), prisma);
    res.json({ status: 'ok', data: { systems } });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSystemSchema.parse(req.body);
    const system = await createSystem(param(req, 'machineId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { system } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSystemSchema.parse(req.body);
    const system = await updateSystem(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { system } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = deleteQuerySchema.parse(req.query);
    await deleteSystem(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = reorderSystemsSchema.parse(req.body);
    const result = await reorderSystems(cid(req), body, prisma);
    res.json({ status: 'ok', data: result });
  } catch (err) {
    next(err);
  }
}
