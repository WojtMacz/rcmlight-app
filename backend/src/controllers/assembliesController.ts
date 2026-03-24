import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createAssembly,
  deleteAssembly,
  listAssemblies,
  updateAssembly,
} from '../services/bomNodeService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  createAssemblySchema,
  deleteQuerySchema,
  updateAssemblySchema,
} from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assemblies = await listAssemblies(param(req, 'systemId'), cid(req), prisma);
    res.json({ status: 'ok', data: { assemblies } });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createAssemblySchema.parse(req.body);
    const assembly = await createAssembly(param(req, 'systemId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { assembly } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateAssemblySchema.parse(req.body);
    const assembly = await updateAssembly(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { assembly } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = deleteQuerySchema.parse(req.query);
    await deleteAssembly(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}
