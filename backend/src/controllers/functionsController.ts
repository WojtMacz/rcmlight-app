import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createAssemblyFunction,
  createFunctionalFailure,
  createSystemFunction,
  deleteFunction,
  deleteFunctionalFailure,
  listFunctionalFailures,
  listFunctions,
  updateFunction,
  updateFunctionalFailure,
} from '../services/rcmService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  createFunctionalFailureSchema,
  createFunctionSchema,
  functionLevelQuerySchema,
  updateFunctionalFailureSchema,
  updateFunctionSchema,
} from '../validators/rcm.schemas';
import { deleteQuerySchema as bomDeleteQuery } from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

// ── FunctionDef ────────────────────────────────────────────────────────────

export async function listForMachine(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { level } = functionLevelQuerySchema.parse(req.query);
    const functions = await listFunctions(param(req, 'machineId'), cid(req), level, prisma);
    res.json({ status: 'ok', data: { functions } });
  } catch (err) {
    next(err);
  }
}

export async function createForSystem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createFunctionSchema.parse(req.body);
    const fn = await createSystemFunction(param(req, 'systemId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { function: fn } });
  } catch (err) {
    next(err);
  }
}

export async function createForAssembly(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createFunctionSchema.parse(req.body);
    const fn = await createAssemblyFunction(param(req, 'assemblyId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { function: fn } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateFunctionSchema.parse(req.body);
    const fn = await updateFunction(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { function: fn } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = bomDeleteQuery.parse(req.query);
    await deleteFunction(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}

// ── FunctionalFailure ──────────────────────────────────────────────────────

export async function listFF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const failures = await listFunctionalFailures(param(req, 'functionId'), cid(req), prisma);
    res.json({ status: 'ok', data: { failures } });
  } catch (err) {
    next(err);
  }
}

export async function createFF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createFunctionalFailureSchema.parse(req.body);
    const failure = await createFunctionalFailure(param(req, 'functionId'), cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { failure } });
  } catch (err) {
    next(err);
  }
}

export async function updateFF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateFunctionalFailureSchema.parse(req.body);
    const failure = await updateFunctionalFailure(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { failure } });
  } catch (err) {
    next(err);
  }
}

export async function removeFF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = bomDeleteQuery.parse(req.query);
    await deleteFunctionalFailure(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}


