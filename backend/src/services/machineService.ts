import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { paginatedResponse, parsePagination } from '../utils/pagination';
import type {
  CreateMachineInput,
  ListQueryInput,
  UpdateMachineInput,
} from '../validators/bom.schemas';

// ── Ownership guard ────────────────────────────────────────────────────────

export async function getMachineOrFail(
  machineId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) throw new AppError(404, 'Maszyna nie istnieje');
  if (machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu do tej maszyny');
  return machine;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function listMachines(
  companyId: string,
  query: ListQueryInput,
  prisma: PrismaClient,
) {
  const pagination = parsePagination(query);
  const where = {
    companyId,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { number: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [machines, total] = await Promise.all([
    prisma.machine.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { _count: { select: { systems: true } } },
    }),
    prisma.machine.count({ where }),
  ]);

  return paginatedResponse(machines, total, pagination);
}

export async function getMachineWithBOM(
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
                  spareParts: { orderBy: { name: 'asc' } },
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
  return machine;
}

export async function createMachine(
  companyId: string,
  data: CreateMachineInput,
  prisma: PrismaClient,
) {
  return prisma.machine.create({ data: { ...data, companyId } });
}

export async function updateMachine(
  machineId: string,
  companyId: string,
  data: UpdateMachineInput,
  prisma: PrismaClient,
) {
  await getMachineOrFail(machineId, companyId, prisma);
  return prisma.machine.update({ where: { id: machineId }, data });
}

export async function getMachineStats(
  machineId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getMachineOrFail(machineId, companyId, prisma);

  // 1. Systems count
  const systemsCount = await prisma.system.count({ where: { machineId } });

  if (systemsCount === 0) {
    return { systemsCount: 0, causesCount: 0, highCriticalityCount: 0, causesWithoutPmCount: 0, pmTasksCount: 0, completionPercent: 0 };
  }

  // 2. Collect hierarchy IDs
  const systems = await prisma.system.findMany({
    where: { machineId },
    select: { id: true, assemblies: { select: { id: true } } },
  });
  const sIds = systems.map((s) => s.id);
  const aIds = systems.flatMap((s) => s.assemblies.map((a) => a.id));

  const fdWhere = sIds.length > 0 || aIds.length > 0
    ? { OR: [...(sIds.length ? [{ systemId: { in: sIds } }] : []), ...(aIds.length ? [{ assemblyId: { in: aIds } }] : [])] }
    : { id: 'none' };

  const functionDefs = await prisma.functionDef.findMany({ where: fdWhere, select: { id: true } });
  const fdIds = functionDefs.map((f) => f.id);
  if (fdIds.length === 0) {
    return { systemsCount, causesCount: 0, highCriticalityCount: 0, causesWithoutPmCount: 0, pmTasksCount: 0, completionPercent: 0 };
  }

  const funcFailures = await prisma.functionalFailure.findMany({
    where: { functionId: { in: fdIds } },
    select: { id: true },
  });
  const ffIds = funcFailures.map((f) => f.id);
  if (ffIds.length === 0) {
    return { systemsCount, causesCount: 0, highCriticalityCount: 0, causesWithoutPmCount: 0, pmTasksCount: 0, completionPercent: 0 };
  }

  const physFailures = await prisma.physicalFailure.findMany({
    where: { functionalFailureId: { in: ffIds } },
    select: { id: true },
  });
  const pfIds = physFailures.map((p) => p.id);
  if (pfIds.length === 0) {
    return { systemsCount, causesCount: 0, highCriticalityCount: 0, causesWithoutPmCount: 0, pmTasksCount: 0, completionPercent: 0 };
  }

  const causeWhere = { physicalFailureId: { in: pfIds } };

  // 3. Cause counts
  const causesCount = await prisma.failureCause.count({ where: causeWhere });
  const causesWithPmCount = await prisma.failureCause.count({
    where: { ...causeWhere, pmTask: { isNot: null } },
  });
  const causesWithoutPmCount = causesCount - causesWithPmCount;

  // 4. Active PM tasks
  const pmTasksCount = await prisma.pMTask.count({
    where: { cause: causeWhere, isActive: true },
  });

  // 5. High criticality — WKF = avg(WK, WP), WK = avg(S,Q,P,F,D), WP = avg(C,L)
  const criticalities = await prisma.criticality.findMany({
    where: { cause: causeWhere },
    select: { safety: true, quality: true, production: true, frequency: true, availability: true, repairCost: true, laborTime: true },
  });
  const highCriticalityCount = criticalities.filter((c) => {
    const wk = (c.safety + c.quality + c.production + c.frequency + c.availability) / 5;
    const wp = (c.repairCost + c.laborTime) / 2;
    return (wk + wp) / 2 >= 2.0;
  }).length;

  // 6. Completion
  const completionPercent = causesCount > 0
    ? Math.round((causesWithPmCount / causesCount) * 100)
    : 0;

  return { systemsCount, causesCount, highCriticalityCount, causesWithoutPmCount, pmTasksCount, completionPercent };
}

export async function deleteMachine(
  machineId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getMachineOrFail(machineId, companyId, prisma);

  if (!force) {
    // Bez force — blokuj jeśli jest cokolwiek powiązanego
    const systemCount = await prisma.system.count({ where: { machineId } });
    if (systemCount > 0) {
      throw new AppError(
        409,
        `Maszyna posiada ${systemCount} system(ów) i powiązane dane. Użyj force=true, aby usunąć kaskadowo`,
      );
    }
    return prisma.machine.delete({ where: { id: machineId } });
  }

  // force=true — usuń całą analizę RCM ręcznie (brak onDelete:Cascade w schemacie dla FunctionDef)
  // 1. Usuń FunctionDef powiązane z systemami maszyny (kaskada: FF → PF → Cause → Criticality/PMTask)
  const systemIds = await prisma.system.findMany({
    where: { machineId },
    select: { id: true },
  });
  const sIds = systemIds.map((s) => s.id);

  if (sIds.length > 0) {
    const assemblyIds = await prisma.assembly.findMany({
      where: { systemId: { in: sIds } },
      select: { id: true },
    });
    const aIds = assemblyIds.map((a) => a.id);

    await prisma.functionDef.deleteMany({
      where: { OR: [{ systemId: { in: sIds } }, { assemblyId: { in: aIds } }] },
    });
  }

  // 2. Usuń maszynę — kaskada usuwa: System → Assembly → MaterialGroup → SparePart
  //    PhysicalFailures zostały już usunięte via FunctionDef cascade powyżej
  return prisma.machine.delete({ where: { id: machineId } });
}
