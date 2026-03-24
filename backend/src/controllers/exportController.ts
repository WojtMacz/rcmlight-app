import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateDocx, generateXlsx } from '../services/exportService';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

export async function exportDocxCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const machineId = param(req, 'id');
    const buffer = await generateDocx(machineId, cid(req), prisma);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="RCM_${machineId}.docx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportXlsxCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const machineId = param(req, 'id');
    const buffer = await generateXlsx(machineId, cid(req), prisma);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="RCM_${machineId}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
