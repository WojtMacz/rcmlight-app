import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { param } from '../utils/reqParams';
import {
  updateCriterionSchema,
  resetCriteriaSchema,
  createMaterialGroupTemplateSchema,
  updateMaterialGroupTemplateSchema,
} from '../validators/settings.schemas';
import {
  getCriteriaCriteria,
  updateCriterion,
  resetCriteriaForCategory,
  getMaterialGroupTemplates,
  createMaterialGroupTemplate,
  updateMaterialGroupTemplate,
  deleteMaterialGroupTemplate,
} from '../services/settingsService';

function cid(req: Request): string {
  if (!req.companyId) throw new AppError(401, 'Brak kontekstu firmy');
  return req.companyId;
}

// ── Criticality Criteria ─────────────────────────────────────────────────────

export async function getCriteriaCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const criteria = await getCriteriaCriteria(cid(req), prisma);
    res.json({ status: 'ok', data: { criteria } });
  } catch (err) { next(err); }
}

export async function updateCriterionCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateCriterionSchema.parse(req.body);
    const userId = req.user?.sub;
    const criterion = await updateCriterion(cid(req), param(req, 'id'), body, userId, prisma);
    res.json({ status: 'ok', data: { criterion } });
  } catch (err) { next(err); }
}

export async function resetCriteriaCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = resetCriteriaSchema.parse(req.body);
    await resetCriteriaForCategory(cid(req), body.category, prisma);
    const criteria = await getCriteriaCriteria(cid(req), prisma);
    res.json({ status: 'ok', data: { criteria } });
  } catch (err) { next(err); }
}

// ── Material Group Templates ─────────────────────────────────────────────────

export async function getTemplatesCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const templates = await getMaterialGroupTemplates(cid(req), prisma);
    res.json({ status: 'ok', data: { templates } });
  } catch (err) { next(err); }
}

export async function createTemplateCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createMaterialGroupTemplateSchema.parse(req.body);
    const template = await createMaterialGroupTemplate(cid(req), body, prisma);
    res.json({ status: 'ok', data: { template } });
  } catch (err) { next(err); }
}

export async function updateTemplateCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateMaterialGroupTemplateSchema.parse(req.body);
    const template = await updateMaterialGroupTemplate(cid(req), param(req, 'id'), body, prisma);
    res.json({ status: 'ok', data: { template } });
  } catch (err) { next(err); }
}

export async function deleteTemplateCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteMaterialGroupTemplate(cid(req), param(req, 'id'), prisma);
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
}
