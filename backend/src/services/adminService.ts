import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { seedCompanyDefaults } from './settingsService';

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

// ── Create company ───────────────────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string;
  slug: string;
  defaultDowntimeCostPerHour?: number;
  defaultTechnicianHourlyCost?: number;
  defaultAllowedUnavailability?: number;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function createCompany(input: CreateCompanyInput, prisma: PrismaClient) {
  const existing = await prisma.company.findUnique({ where: { slug: input.slug } });
  if (existing) throw new AppError(409, `Firma ze slugiem "${input.slug}" już istnieje`);

  const emailTaken = await prisma.user.findUnique({ where: { email: input.adminEmail } });
  if (emailTaken) throw new AppError(409, `Email "${input.adminEmail}" jest już zajęty`);

  const passwordHash = await bcrypt.hash(input.adminPassword, 12);

  const company = await prisma.company.create({
    data: {
      name: input.name,
      slug: input.slug,
      ...(input.defaultDowntimeCostPerHour !== undefined && {
        defaultDowntimeCostPerHour: input.defaultDowntimeCostPerHour,
      }),
      ...(input.defaultTechnicianHourlyCost !== undefined && {
        defaultTechnicianHourlyCost: input.defaultTechnicianHourlyCost,
      }),
      ...(input.defaultAllowedUnavailability !== undefined && {
        defaultAllowedUnavailability: input.defaultAllowedUnavailability,
      }),
      users: {
        create: {
          email: input.adminEmail,
          passwordHash,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          role: 'ADMIN',
        },
      },
    },
    include: {
      users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
    },
  });

  // Seed default criteria and material group templates
  await seedCompanyDefaults(company.id, prisma);

  return company;
}

// ── Add user to company ───────────────────────────────────────────────────────

export interface AddUserToCompanyInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}

export async function addUserToCompany(
  companyId: string,
  input: AddUserToCompanyInput,
  prisma: PrismaClient,
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError(404, 'Firma nie istnieje');

  const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
  if (emailTaken) throw new AppError(409, `Email "${input.email}" jest już zajęty`);

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      companyId,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
  });
}

// ── Update user (admin panel) ─────────────────────────────────────────────────

export interface UpdateAdminUserInput {
  role?: Role;
  isActive?: boolean;
  password?: string;
}

export async function updateAdminUser(
  userId: string,
  input: UpdateAdminUserInput,
  prisma: PrismaClient,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Użytkownik nie istnieje');

  const data: Record<string, unknown> = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });
}

// ── Update company ────────────────────────────────────────────────────────────

export interface UpdateCompanyInput {
  name?: string;
  defaultDowntimeCostPerHour?: number;
  defaultTechnicianHourlyCost?: number;
  defaultAllowedUnavailability?: number;
}

export async function updateCompany(
  companyId: string,
  input: UpdateCompanyInput,
  prisma: PrismaClient,
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError(404, 'Firma nie istnieje');
  return prisma.company.update({ where: { id: companyId }, data: input });
}

// ── Delete company (all data) ─────────────────────────────────────────────────

export async function deleteCompany(companyId: string, prisma: PrismaClient) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError(404, 'Firma nie istnieje');

  // 1. Pobierz wszystkie systemy i assemblies tej firmy (potrzebne do usunięcia FunctionDef)
  const machines = await prisma.machine.findMany({
    where: { companyId },
    include: {
      systems: { include: { assemblies: true } },
    },
  });

  const systemIds = machines.flatMap((m) => m.systems.map((s) => s.id));
  const assemblyIds = machines.flatMap((m) => m.systems.flatMap((s) => s.assemblies.map((a) => a.id)));

  // 2. Usuń FunctionDef (kaskada: FunctionalFailure → PhysicalFailure → FailureCause → Criticality/PMTask)
  if (systemIds.length || assemblyIds.length) {
    await prisma.functionDef.deleteMany({
      where: {
        OR: [
          ...(systemIds.length ? [{ systemId: { in: systemIds } }] : []),
          ...(assemblyIds.length ? [{ assemblyId: { in: assemblyIds } }] : []),
        ],
      },
    });
  }

  // 3. Usuń maszyny (kaskada: System → Assembly → MaterialGroup → SparePart)
  await prisma.machine.deleteMany({ where: { companyId } });

  // 4. Usuń dane konfiguracyjne firmy
  await prisma.criticalityCriteria.deleteMany({ where: { companyId } });
  await prisma.materialGroupTemplate.deleteMany({ where: { companyId } });

  // 5. Usuń userów (kaskada: RefreshToken)
  await prisma.user.deleteMany({ where: { companyId } });

  // 6. Usuń firmę (kaskada: InviteToken)
  await prisma.company.delete({ where: { id: companyId } });

  return { deleted: true, companyName: company.name };
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
