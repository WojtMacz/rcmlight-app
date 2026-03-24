import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createMaterialGroup,
  deleteMaterialGroup,
  listMaterialGroups,
  updateMaterialGroup,
} from '../services/bomNodeService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  createMaterialGroupSchema,
  deleteQuerySchema,
  updateMaterialGroupSchema,
} from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await listMaterialGroups(param(req, 'assemblyId'), cid(req), prisma);
    res.json({ status: 'ok', data: { groups } });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createMaterialGroupSchema.parse(req.body);
    const group = await createMaterialGroup(param(req, 'assemblyId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { group } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateMaterialGroupSchema.parse(req.body);
    const group = await updateMaterialGroup(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { group } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = deleteQuerySchema.parse(req.query);
    await deleteMaterialGroup(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}
