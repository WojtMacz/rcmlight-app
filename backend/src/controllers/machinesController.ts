import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { exportBom, importBom } from '../services/bomImportExportService';
import {
  createMachine,
  deleteMachine,
  getMachineWithBOM,
  listMachines,
  updateMachine,
} from '../services/machineService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  createMachineSchema,
  deleteQuerySchema,
  listQuerySchema,
  updateMachineSchema,
} from '../validators/bom.schemas';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await listMachines(cid(req), query, prisma);
    res.json({ status: 'ok', data: result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const machine = await getMachineWithBOM(param(req, 'id'), cid(req), prisma);
    res.json({ status: 'ok', data: { machine } });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createMachineSchema.parse(req.body);
    const machine = await createMachine(cid(req), body, prisma);
    res.status(201).json({ status: 'ok', data: { machine } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateMachineSchema.parse(req.body);
    const machine = await updateMachine(param(req, 'id'), cid(req), body, prisma);
    res.json({ status: 'ok', data: { machine } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { force } = deleteQuerySchema.parse(req.query);
    await deleteMachine(param(req, 'id'), cid(req), force, prisma);
    res.json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}

export async function importBomHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw new AppError(400, 'Brak pliku XLSX w żądaniu');
    if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
      throw new AppError(400, 'Wymagany plik w formacie .xlsx lub .xls');
    }
    const result = await importBom(param(req, 'id'), cid(req), file.buffer, prisma);
    res.json({ status: 'ok', data: result });
  } catch (err) {
    next(err);
  }
}

export async function exportBomHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const buffer = await exportBom(param(req, 'id'), cid(req), prisma);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="BOM_${param(req, 'id')}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
