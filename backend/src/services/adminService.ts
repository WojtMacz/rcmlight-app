import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

// ── Super Admin Login ────────────────────────────────────────

export async function adminLogin(
  email: string,
  password: string,
  prisma: PrismaClient,
): Promise<string> {
  const admin = await prisma.superAdmin.findUnique({ where: { email } });
  const dummyHash = '$2b$12$invalidhashtopreventtimingattacks000000000000000000000';
  const isValid = await bcrypt.compare(password, admin?.passwordHash ?? dummyHash);

  if (!admin || !isValid) throw new AppError(401, 'Nieprawidłowe dane logowania');

  const secret = process.env.SUPER_ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'super-secret';
  const token = jwt.sign({ sub: admin.id, role: 'SUPER_ADMIN' }, secret, {
    expiresIn: '4h' as jwt.SignOptions['expiresIn'],
  });
  return token;
}

// ── Company management ───────────────────────────────────────

export async function listCompanies(prisma: PrismaClient) {
  return prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, machines: true } },
    },
  });
}

export async function getCompanyDetail(companyId: string, prisma: PrismaClient) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      machines: { select: { id: true, number: true, name: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!company) throw new AppError(404, 'Firma nie istnieje');
  return company;
}

export async function toggleCompanyActive(
  companyId: string,
  isActive: boolean,
  prisma: PrismaClient,
) {
  return prisma.company.update({ where: { id: companyId }, data: { isActive } });
}

// ── Impersonation — returns short-lived JWT acting as company ADMIN ──

export async function impersonateCompany(
  companyId: string,
  prisma: PrismaClient,
): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { companyId, role: 'ADMIN', isActive: true },
  });
  if (!admin) throw new AppError(404, 'Firma nie ma aktywnego administratora');

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

  // Short-lived impersonation token — 30 minutes
  return jwt.sign(
    { sub: admin.id, email: admin.email, companyId: admin.companyId, role: 'ADMIN' },
    secret,
    { expiresIn: '30m' as jwt.SignOptions['expiresIn'], algorithm: 'HS256' },
  );
}
