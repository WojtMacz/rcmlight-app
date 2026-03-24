import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { computeIndices } from './criticalityService';

// ── Pełna analiza RCM ──────────────────────────────────────────────────────

export async function getFullRcmAnalysis(
  machineId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: {
      systems: {
        orderBy: { number: 'asc' },
        include: {
          assemblies: {
            orderBy: { number: 'asc' },
            include: {
              materialGroups: {
                orderBy: { code: 'asc' },
                include: {
                  physicalFailures: {
                    orderBy: { code: 'asc' },
                    include: {
                      functionalFailure: {
                        include: {
                          function: {
                            select: { id: true, code: true, description: true, level: true },
                          },
                        },
                      },
                      causes: {
                        orderBy: { code: 'asc' },
                        include: {
                          criticality: true,
                          pmTask: true,
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

  if (!machine) throw new AppError(404, 'Maszyna nie istnieje');
  if (machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu do tej maszyny');

  // Wzbogać criticality o wskaźniki obliczeniowe
  const enriched = {
    ...machine,
    systems: machine.systems.map((system) => ({
      ...system,
      assemblies: system.assemblies.map((assembly) => ({
        ...assembly,
        materialGroups: assembly.materialGroups.map((mg) => ({
          ...mg,
          physicalFailures: mg.physicalFailures.map((pf) => ({
            ...pf,
            causes: pf.causes.map((cause) => ({
              ...cause,
              criticality: cause.criticality
                ? {
                    ...cause.criticality,
                    ...computeIndices(cause.criticality, cause.criticality, machine),
                  }
                : null,
            })),
          })),
        })),
      })),
    })),
  };

  return enriched;
}

// ── PM Summary ─────────────────────────────────────────────────────────────

interface PmTaskFlat {
  pmTaskId: string;
  causeId: string;
  causeCode: string;
  physicalFailureDescription: string;
  materialGroupCode: string;
  assemblyName: string;
  systemName: string;
  taskType: string;
  description: string;
  assignedTo: string | null;
  isActive: boolean;
  finalFrequencyMonths: number | null;
  totalCostPM: number | null;
  calculatedFrequencyMonths: number | null;
}

async function collectPmTasks(
  machineId: string,
  companyId: string,
  prisma: PrismaClient,
): Promise<PmTaskFlat[]> {
  const machine = await prisma.machine.findUnique({ where: { id: machineId }, select: { companyId: true, machineDowntimeCostPerHour: true, technicianHourlyCost: true } });
  if (!machine) throw new AppError(404, 'Maszyna nie istnieje');
  if (machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu do tej maszyny');

  const tasks = await prisma.pMTask.findMany({
    where: {
      isActive: true,
      cause: {
        physicalFailure: { materialGroup: { assembly: { system: { machineId } } } },
      },
    },
    include: {
      cause: {
        include: {
          physicalFailure: {
            include: {
              materialGroup: {
                include: {
                  assembly: { include: { system: { select: { name: true } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { finalFrequencyMonths: 'asc' },
  });

  return tasks.map((t) => ({
    pmTaskId: t.id,
    causeId: t.causeId,
    causeCode: t.cause.code,
    physicalFailureDescription: t.cause.physicalFailure.description,
    materialGroupCode: t.cause.physicalFailure.materialGroup.code,
    assemblyName: t.cause.physicalFailure.materialGroup.assembly.name,
    systemName: t.cause.physicalFailure.materialGroup.assembly.system.name,
    taskType: t.taskType,
    description: t.description,
    assignedTo: t.assignedTo,
    isActive: t.isActive,
    finalFrequencyMonths: t.finalFrequencyMonths,
    totalCostPM: t.totalCostPM ? Number(t.totalCostPM) : null,
    calculatedFrequencyMonths: t.calculatedFrequencyMonths
      ? Number(t.calculatedFrequencyMonths)
      : null,
  }));
}

// Frequency bucket labels
const FREQ_BUCKETS = [1, 3, 6, 12, 24, 36] as const;
function freqLabel(months: number | null): string {
  if (!months) return 'Nieokreślona';
  const buckets: Record<number, string> = {
    1: 'Co miesiąc (1M)',
    3: 'Co 3 miesiące (3M)',
    6: 'Co 6 miesięcy (6M)',
    12: 'Co rok (12M)',
    24: 'Co 2 lata (24M)',
    36: 'Co 3 lata (36M)',
  };
  return buckets[months] ?? `Co ${months} miesięcy`;
}

function costLabel(cost: number | null): string {
  if (cost === null) return 'Nieokreślony';
  if (cost < 500) return 'Niski (< 500 zł)';
  if (cost <= 2000) return 'Średni (500–2000 zł)';
  return 'Wysoki (> 2000 zł)';
}

function costOrder(label: string): number {
  if (label.startsWith('Niski')) return 0;
  if (label.startsWith('Średni')) return 1;
  if (label.startsWith('Wysoki')) return 2;
  return 3;
}

export async function getPmSummary(
  machineId: string,
  companyId: string,
  groupBy: 'frequency' | 'cost' | 'assignedTo',
  prisma: PrismaClient,
) {
  const tasks = await collectPmTasks(machineId, companyId, prisma);

  const grouped = new Map<string, PmTaskFlat[]>();
  for (const task of tasks) {
    let key: string;
    if (groupBy === 'frequency') key = freqLabel(task.finalFrequencyMonths);
    else if (groupBy === 'cost') key = costLabel(task.totalCostPM);
    else key = task.assignedTo ?? 'Nieprzypisano';

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  let groups = Array.from(grouped.entries()).map(([key, items]) => ({ key, tasks: items }));

  // Sort groups
  if (groupBy === 'frequency') {
    const order = Object.fromEntries(FREQ_BUCKETS.map((b, i) => [freqLabel(b), i]));
    groups.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
  } else if (groupBy === 'cost') {
    groups.sort((a, b) => costOrder(b.key) - costOrder(a.key));
  } else {
    groups.sort((a, b) => a.key.localeCompare(b.key, 'pl'));
  }

  return {
    groupBy,
    totalTasks: tasks.length,
    groups,
  };
}
