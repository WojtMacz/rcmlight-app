import { PrismaClient, Company } from '@prisma/client';
import { AppError } from '../utils/AppError';

export interface CompanySettings {
  name: string;
  logoUrl: string | null;
  defaultDowntimeCostPerHour: number;
  defaultTechnicianHourlyCost: number;
  defaultAllowedUnavailability: number;
}

function toSettings(c: Company): CompanySettings {
  return {
    name: c.name,
    logoUrl: c.logoUrl,
    defaultDowntimeCostPerHour: Number(c.defaultDowntimeCostPerHour),
    defaultTechnicianHourlyCost: Number(c.defaultTechnicianHourlyCost),
    defaultAllowedUnavailability: Number(c.defaultAllowedUnavailability),
  };
}

export async function getCompanySettings(
  companyId: string,
  prisma: PrismaClient,
): Promise<CompanySettings> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError(404, 'Firma nie istnieje');
  return toSettings(company);
}

export async function updateCompanySettings(
  companyId: string,
  data: Partial<CompanySettings>,
  prisma: PrismaClient,
): Promise<CompanySettings> {
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.defaultDowntimeCostPerHour !== undefined && {
        defaultDowntimeCostPerHour: data.defaultDowntimeCostPerHour,
      }),
      ...(data.defaultTechnicianHourlyCost !== undefined && {
        defaultTechnicianHourlyCost: data.defaultTechnicianHourlyCost,
      }),
      ...(data.defaultAllowedUnavailability !== undefined && {
        defaultAllowedUnavailability: data.defaultAllowedUnavailability,
      }),
    },
  });
  return toSettings(updated);
}
