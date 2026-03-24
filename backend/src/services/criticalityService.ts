import { Criticality, PrismaClient } from '@prisma/client';
import { getCauseOrFail } from './rcmService';
import type { CriticalityInput } from '../validators/rcm.schemas';

// ── Calculation helpers ────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CriticalityIndices {
  consequenceIndex: number; // WK = avg(S,Q,P,F)
  workloadIndex: number;    // WP = avg(C,L,D)
  criticalityIndex: number; // WK_final = avg(WK, WP)
  totalFailureCost: number; // suma kosztów z ratami maszyny
}

type NumericLike = { toNumber(): number } | number | null | undefined;

function n(v: NumericLike): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return v.toNumber();
}

export function computeIndices(
  c: Pick<Criticality, 'safety' | 'quality' | 'production' | 'frequency' | 'availability' | 'repairCost' | 'laborTime'>,
  costFields: {
    downtimeHours?: NumericLike;
    qualityLossCost?: NumericLike;
    secondaryDamageCost?: NumericLike;
    sparepartCost?: NumericLike;
    repairManHours?: NumericLike;
  },
  machine: {
    machineDowntimeCostPerHour: { toNumber(): number };
    technicianHourlyCost: { toNumber(): number };
  },
): CriticalityIndices {
  const consequenceIndex = round2(
    (c.safety + c.quality + c.production + c.frequency) / 4,
  );
  const workloadIndex = round2((c.repairCost + c.laborTime + c.availability) / 3);
  const criticalityIndex = round2((consequenceIndex + workloadIndex) / 2);

  const mdcph = machine.machineDowntimeCostPerHour.toNumber();
  const thc = machine.technicianHourlyCost.toNumber();
  const totalFailureCost = round2(
    n(costFields.downtimeHours) * mdcph +
      n(costFields.qualityLossCost) +
      n(costFields.secondaryDamageCost) +
      n(costFields.sparepartCost) +
      n(costFields.repairManHours) * thc,
  );

  return { consequenceIndex, workloadIndex, criticalityIndex, totalFailureCost };
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function upsertCriticality(
  causeId: string,
  companyId: string,
  data: CriticalityInput,
  prisma: PrismaClient,
) {
  const cause = await getCauseOrFail(causeId, companyId, prisma);
  const machine = cause.physicalFailure.materialGroup.assembly.system.machine;

  const criticality = await prisma.criticality.upsert({
    where: { causeId },
    update: data,
    create: { ...data, causeId },
  });

  const indices = computeIndices(criticality, criticality, machine);
  return { ...criticality, ...indices };
}

export async function getCriticality(
  causeId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const cause = await getCauseOrFail(causeId, companyId, prisma);
  const machine = cause.physicalFailure.materialGroup.assembly.system.machine;

  const criticality = await prisma.criticality.findUnique({ where: { causeId } });
  if (!criticality) return null;

  const indices = computeIndices(criticality, criticality, machine);
  return { ...criticality, ...indices };
}
