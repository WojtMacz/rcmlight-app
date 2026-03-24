import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createSparePart,
  deleteSparePart,
  listSpareParts,
  updateSparePart,
} from '../services/bomNodeService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import { createSparePartSchema, updateSparePartSchema } from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parts = await listSpareParts(param(req, 'groupId'), cid(req), prisma);
    res.json({ status: 'ok', data: { parts } });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSparePartSchema.parse(req.body);
    const part = await createSparePart(param(req, 'groupId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { part } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSparePartSchema.parse(req.body);
    const part = await updateSparePart(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { part } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteSparePart(param(req, 'id'), cid(req), prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}
