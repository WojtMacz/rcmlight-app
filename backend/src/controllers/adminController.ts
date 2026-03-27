import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import {
  adminLogin,
  listCompanies,
  getCompanyDetail,
  toggleCompanyActive,
  impersonateCompany,
  createCompany,
  addUserToCompany,
  updateAdminUser,
  updateCompany,
  deleteCompany,
} from '../services/adminService';
import { param } from '../utils/reqParams';
import jwt from 'jsonwebtoken';

// Verify super admin token middleware helper
function verifySuperAdminToken(req: Request): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) throw new AppError(401, 'Brak tokenu super admina');
  const token = auth.slice(7);
  const secret = process.env.SUPER_ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'super-secret';
  try {
    const payload = jwt.verify(token, secret) as { role?: string };
    if (payload.role !== 'SUPER_ADMIN') throw new AppError(403, 'Brak uprawnień super admina');
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(401, 'Token super admina nieprawidłowy lub wygasł');
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/admin/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const token = await adminLogin(body.email, body.password, prisma);
    res.status(200).json({ status: 'ok', data: { token } });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/companies
export async function getCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const companies = await listCompanies(prisma);
    res.status(200).json({ status: 'ok', data: { companies } });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/companies/:id
export async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const company = await getCompanyDetail(id, prisma);
    res.status(200).json({ status: 'ok', data: { company } });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/companies/:id/toggle-active
export async function toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const company = await toggleCompanyActive(id, isActive, prisma);
    res.status(200).json({ status: 'ok', data: { company } });
  } catch (err) {
    next(err);
  }
}

const createCompanySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug może zawierać tylko małe litery, cyfry i myślniki'),
  defaultDowntimeCostPerHour: z.number().optional(),
  defaultTechnicianHourlyCost: z.number().optional(),
  defaultAllowedUnavailability: z.number().min(0).max(1).optional(),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

// POST /api/v1/admin/companies
export async function createCompanyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const body = createCompanySchema.parse(req.body);
    const company = await createCompany(body, prisma);
    res.status(201).json({ status: 'ok', data: { company } });
  } catch (err) {
    next(err);
  }
}

const addUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']),
});

// POST /api/v1/admin/companies/:id/users
export async function addUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const body = addUserSchema.parse(req.body);
    const user = await addUserToCompany(id, body, prisma);
    res.status(201).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// PATCH /api/v1/admin/users/:id
export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const body = updateUserSchema.parse(req.body);
    const user = await updateAdminUser(id, body, prisma);
    res.status(200).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  defaultDowntimeCostPerHour: z.number().optional(),
  defaultTechnicianHourlyCost: z.number().optional(),
  defaultAllowedUnavailability: z.number().min(0).max(1).optional(),
});

// PATCH /api/v1/admin/companies/:id
export async function updateCompanyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const body = updateCompanySchema.parse(req.body);
    const company = await updateCompany(id, body, prisma);
    res.status(200).json({ status: 'ok', data: { company } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/admin/companies/:id
export async function deleteCompanyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const result = await deleteCompany(id, prisma);
    res.status(200).json({ status: 'ok', data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/companies/:id/impersonate
export async function impersonate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifySuperAdminToken(req);
    const id = param(req, 'id');
    const accessToken = await impersonateCompany(id, prisma);
    res.status(200).json({ status: 'ok', data: { accessToken } });
  } catch (err) {
    next(err);
  }
}
