import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { getCauseOrFail } from './rcmService';
import type { CreatePMTaskInput, UpdatePMTaskInput } from '../validators/rcm.schemas';
import { param } from '../utils/reqParams';

// ── Calculation helpers ────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * calculatedFrequencyMonths = 2 * MTBF_months * allowedUnavailability
 * Jeśli MTBF nie jest ustawione → null (obsługa uszkodzeniowa / RTF)
 */
function calcFrequency(
  mtbfMonths: { toNumber(): number } | null,
  allowedUnavailability: { toNumber(): number },
): number | null {
  if (!mtbfMonths) return null;
  return round2(2 * mtbfMonths.toNumber() * allowedUnavailability.toNumber());
}

type NumericLike = { toNumber(): number } | number | null | undefined;

function n(v: NumericLike): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return v.toNumber();
}

function calcTotalCostPM(
  data: {
    plannedDowntimeH?: NumericLike;
    sparepartCost?: NumericLike;
    repairManHours?: NumericLike;
  },
  machine: {
    machineDowntimeCostPerHour: { toNumber(): number };
    technicianHourlyCost: { toNumber(): number };
  },
): number {
  return round2(
    n(data.plannedDowntimeH) * machine.machineDowntimeCostPerHour.toNumber() +
      n(data.sparepartCost) +
      n(data.repairManHours) * machine.technicianHourlyCost.toNumber(),
  );
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function upsertPMTask(
  causeId: string,
  companyId: string,
  data: CreatePMTaskInput,
  prisma: PrismaClient,
) {
  const cause = await getCauseOrFail(causeId, companyId, prisma);
  const pf = cause.physicalFailure;
  const machine = pf.materialGroup.assembly.system.machine;

  const calculatedFrequencyMonths = calcFrequency(pf.mtbfMonths, machine.allowedUnavailability);
  const totalCostPM = calcTotalCostPM(data, machine);

  const pmTask = await prisma.pMTask.upsert({
    where: { causeId },
    update: { ...data, calculatedFrequencyMonths, totalCostPM },
    create: { ...data, causeId, calculatedFrequencyMonths, totalCostPM },
  });

  return { ...pmTask, totalCostPM, calculatedFrequencyMonths };
}

export async function updatePMTask(
  pmTaskId: string,
  companyId: string,
  data: UpdatePMTaskInput,
  prisma: PrismaClient,
) {
  // Retrieve existing PMTask → traverse to cause → physicalFailure → machine
  const existing = await prisma.pMTask.findUnique({
    where: { id: pmTaskId },
    include: {
      cause: {
        include: {
          physicalFailure: {
            include: {
              materialGroup: {
                include: {
                  assembly: {
                    include: {
                      system: {
                        include: {
                          machine: {
                            select: {
                              companyId: true,
                              machineDowntimeCostPerHour: true,
                              technicianHourlyCost: true,
                              allowedUnavailability: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!existing) throw new AppError(404, 'Zadanie PM nie istnieje');
  const machine = existing.cause.physicalFailure.materialGroup.assembly.system.machine;
  if (machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu');

  const pf = existing.cause.physicalFailure;
  const merged = { ...existing, ...data };
  const calculatedFrequencyMonths = calcFrequency(pf.mtbfMonths, machine.allowedUnavailability);
  const totalCostPM = calcTotalCostPM(merged, machine);

  return prisma.pMTask.update({
    where: { id: pmTaskId },
    data: { ...data, calculatedFrequencyMonths, totalCostPM },
  });
}

export async function deletePMTask(
  pmTaskId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const existing = await prisma.pMTask.findUnique({
    where: { id: pmTaskId },
    include: {
      cause: {
        include: {
          physicalFailure: {
            include: {
              materialGroup: {
                include: {
                  assembly: { include: { system: { include: { machine: { select: { companyId: true } } } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!existing) throw new AppError(404, 'Zadanie PM nie istnieje');
  if (existing.cause.physicalFailure.materialGroup.assembly.system.machine.companyId !== companyId) {
    throw new AppError(403, 'Brak dostępu');
  }
  return prisma.pMTask.delete({ where: { id: pmTaskId } });
}

// suppress unused import warning
void param;
