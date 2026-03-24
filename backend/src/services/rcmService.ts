/**
 * CRUD dla encji łańcucha uszkodzeń RCM:
 * FunctionDef, FunctionalFailure, PhysicalFailure, FailureCause.
 *
 * Każda operacja weryfikuje przynależność do firmy przez hierarchię.
 */
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { getMachineOrFail } from './machineService';
import type {
  CreateFailureCauseInput,
  CreateFunctionalFailureInput,
  CreateFunctionInput,
  CreatePhysicalFailureInput,
  UpdateFailureCauseInput,
  UpdateFunctionalFailureInput,
  UpdateFunctionInput,
  UpdatePhysicalFailureInput,
} from '../validators/rcm.schemas';

// ── Ownership helpers ──────────────────────────────────────────────────────

export async function getFunctionOrFail(
  functionId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const fn = await prisma.functionDef.findUnique({
    where: { id: functionId },
    include: {
      system: { include: { machine: { select: { companyId: true } } } },
      assembly: {
        include: { system: { include: { machine: { select: { companyId: true } } } } },
      },
    },
  });
  if (!fn) throw new AppError(404, 'Funkcja nie istnieje');
  const cid = fn.system?.machine.companyId ?? fn.assembly?.system.machine.companyId;
  if (cid !== companyId) throw new AppError(403, 'Brak dostępu do tej funkcji');
  return fn;
}

export async function getFunctionalFailureOrFail(
  ffId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const ff = await prisma.functionalFailure.findUnique({
    where: { id: ffId },
    include: {
      function: {
        include: {
          system: { include: { machine: { select: { companyId: true } } } },
          assembly: {
            include: { system: { include: { machine: { select: { companyId: true } } } } },
          },
        },
      },
    },
  });
  if (!ff) throw new AppError(404, 'Uszkodzenie funkcjonalne nie istnieje');
  const cid =
    ff.function.system?.machine.companyId ?? ff.function.assembly?.system.machine.companyId;
  if (cid !== companyId) throw new AppError(403, 'Brak dostępu do tego uszkodzenia');
  return ff;
}

// Includes z pełną ścieżką do Machine (dla kosztów i companyId)
const physicalFailureMachineInclude = {
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
} as const;

export async function getPhysicalFailureOrFail(
  pfId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const pf = await prisma.physicalFailure.findUnique({
    where: { id: pfId },
    include: physicalFailureMachineInclude,
  });
  if (!pf) throw new AppError(404, 'Uszkodzenie fizyczne nie istnieje');
  if (pf.materialGroup.assembly.system.machine.companyId !== companyId) {
    throw new AppError(403, 'Brak dostępu do tego uszkodzenia');
  }
  return pf;
}

export async function getCauseOrFail(
  causeId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const cause = await prisma.failureCause.findUnique({
    where: { id: causeId },
    include: {
      physicalFailure: { include: physicalFailureMachineInclude },
    },
  });
  if (!cause) throw new AppError(404, 'Przyczyna uszkodzenia nie istnieje');
  if (cause.physicalFailure.materialGroup.assembly.system.machine.companyId !== companyId) {
    throw new AppError(403, 'Brak dostępu do tej przyczyny');
  }
  return cause;
}

// ── FunctionDef ────────────────────────────────────────────────────────────

export async function listFunctions(
  machineId: string,
  companyId: string,
  level: 'SYSTEM' | 'ASSEMBLY' | undefined,
  prisma: PrismaClient,
) {
  await getMachineOrFail(machineId, companyId, prisma);
  return prisma.functionDef.findMany({
    where: {
      ...(level ? { level } : {}),
      OR: [
        { system: { machineId } },
        { assembly: { system: { machineId } } },
      ],
    },
    include: {
      system: { select: { id: true, name: true, number: true } },
      assembly: { select: { id: true, name: true, number: true } },
      _count: { select: { functionalFailures: true } },
    },
    orderBy: { code: 'asc' },
  });
}

export async function createSystemFunction(
  systemId: string,
  companyId: string,
  data: CreateFunctionInput,
  prisma: PrismaClient,
) {
  const system = await prisma.system.findUnique({
    where: { id: systemId },
    include: { machine: { select: { companyId: true } } },
  });
  if (!system) throw new AppError(404, 'System nie istnieje');
  if (system.machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu');
  return prisma.functionDef.create({ data: { ...data, level: 'SYSTEM', systemId } });
}

export async function createAssemblyFunction(
  assemblyId: string,
  companyId: string,
  data: CreateFunctionInput,
  prisma: PrismaClient,
) {
  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: { system: { include: { machine: { select: { companyId: true } } } } },
  });
  if (!assembly) throw new AppError(404, 'Zespół nie istnieje');
  if (assembly.system.machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu');
  return prisma.functionDef.create({ data: { ...data, level: 'ASSEMBLY', assemblyId } });
}

export async function updateFunction(
  functionId: string,
  companyId: string,
  data: UpdateFunctionInput,
  prisma: PrismaClient,
) {
  await getFunctionOrFail(functionId, companyId, prisma);
  return prisma.functionDef.update({ where: { id: functionId }, data });
}

export async function deleteFunction(
  functionId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getFunctionOrFail(functionId, companyId, prisma);
  const ffCount = await prisma.functionalFailure.count({ where: { functionId } });
  if (ffCount > 0 && !force) {
    throw new AppError(
      409,
      `Funkcja posiada ${ffCount} uszkodzenie(ń) funkcjonalnych. Dodaj ?force=true`,
    );
  }
  return prisma.functionDef.delete({ where: { id: functionId } });
}

// ── FunctionalFailure ──────────────────────────────────────────────────────

export async function listFunctionalFailures(
  functionId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getFunctionOrFail(functionId, companyId, prisma);
  return prisma.functionalFailure.findMany({
    where: { functionId },
    orderBy: { code: 'asc' },
    include: { _count: { select: { physicalFailures: true } } },
  });
}

export async function createFunctionalFailure(
  functionId: string,
  companyId: string,
  data: CreateFunctionalFailureInput,
  prisma: PrismaClient,
) {
  await getFunctionOrFail(functionId, companyId, prisma);
  return prisma.functionalFailure.create({ data: { ...data, functionId } });
}

export async function updateFunctionalFailure(
  ffId: string,
  companyId: string,
  data: UpdateFunctionalFailureInput,
  prisma: PrismaClient,
) {
  await getFunctionalFailureOrFail(ffId, companyId, prisma);
  return prisma.functionalFailure.update({ where: { id: ffId }, data });
}

export async function deleteFunctionalFailure(
  ffId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getFunctionalFailureOrFail(ffId, companyId, prisma);
  const pfCount = await prisma.physicalFailure.count({ where: { functionalFailureId: ffId } });
  if (pfCount > 0 && !force) {
    throw new AppError(
      409,
      `Uszkodzenie funkcjonalne posiada ${pfCount} uszkodzenie(ń) fizycznych. Dodaj ?force=true`,
    );
  }
  return prisma.functionalFailure.delete({ where: { id: ffId } });
}

// ── PhysicalFailure ────────────────────────────────────────────────────────

export async function listPhysicalFailures(
  ffId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getFunctionalFailureOrFail(ffId, companyId, prisma);
  return prisma.physicalFailure.findMany({
    where: { functionalFailureId: ffId },
    orderBy: { code: 'asc' },
    include: {
      materialGroup: { select: { id: true, code: true, name: true } },
      _count: { select: { causes: true } },
    },
  });
}

export async function createPhysicalFailure(
  ffId: string,
  companyId: string,
  data: CreatePhysicalFailureInput,
  prisma: PrismaClient,
) {
  const ff = await getFunctionalFailureOrFail(ffId, companyId, prisma);
  // Verify materialGroup and fetch hierarchy for code generation
  const mg = await prisma.materialGroup.findUnique({
    where: { id: data.materialGroupId },
    include: { assembly: { include: { system: { include: { machine: { select: { companyId: true } } } } } } },
  });
  if (!mg) throw new AppError(404, 'Grupa materiałowa nie istnieje');
  if (mg.assembly.system.machine.companyId !== companyId) {
    throw new AppError(403, 'Grupa materiałowa należy do innej firmy');
  }
  // Count existing PFs for same FF+MG to assign sequential number
  const pfCount = await prisma.physicalFailure.count({
    where: { functionalFailureId: ffId, materialGroupId: data.materialGroupId },
  });
  const pfNumber = pfCount + 1;
  // Auto-generate code: [sysNum].[asmNum].[mgCode].[ffCode].PF[n]
  const code = `${mg.assembly.system.number}.${mg.assembly.number}.${mg.code}.${ff.code}.PF${pfNumber}`;
  return prisma.physicalFailure.create({ data: { ...data, functionalFailureId: ffId, code } });
}

export async function updatePhysicalFailure(
  pfId: string,
  companyId: string,
  data: UpdatePhysicalFailureInput,
  prisma: PrismaClient,
) {
  await getPhysicalFailureOrFail(pfId, companyId, prisma);
  return prisma.physicalFailure.update({ where: { id: pfId }, data });
}

export async function deletePhysicalFailure(
  pfId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getPhysicalFailureOrFail(pfId, companyId, prisma);
  const causeCount = await prisma.failureCause.count({ where: { physicalFailureId: pfId } });
  if (causeCount > 0 && !force) {
    throw new AppError(
      409,
      `Uszkodzenie fizyczne posiada ${causeCount} przyczynę(y). Dodaj ?force=true`,
    );
  }
  return prisma.physicalFailure.delete({ where: { id: pfId } });
}

// ── FailureCause ───────────────────────────────────────────────────────────

export async function listCauses(pfId: string, companyId: string, prisma: PrismaClient) {
  await getPhysicalFailureOrFail(pfId, companyId, prisma);
  return prisma.failureCause.findMany({
    where: { physicalFailureId: pfId },
    orderBy: { code: 'asc' },
    include: {
      criticality: true,
      pmTask: true,
    },
  });
}

export async function createCause(
  pfId: string,
  companyId: string,
  data: CreateFailureCauseInput,
  prisma: PrismaClient,
) {
  await getPhysicalFailureOrFail(pfId, companyId, prisma);
  return prisma.failureCause.create({ data: { ...data, physicalFailureId: pfId } });
}

export async function updateCause(
  causeId: string,
  companyId: string,
  data: UpdateFailureCauseInput,
  prisma: PrismaClient,
) {
  await getCauseOrFail(causeId, companyId, prisma);
  return prisma.failureCause.update({ where: { id: causeId }, data });
}

export async function deleteCause(
  causeId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  const cause = await getCauseOrFail(causeId, companyId, prisma);
  const hasChildren = cause.physicalFailure; // just the cause check
  const critExists = await prisma.criticality.findUnique({ where: { causeId } });
  const pmExists = await prisma.pMTask.findUnique({ where: { causeId } });
  if ((critExists || pmExists) && !force) {
    const what = [critExists ? 'ocenę krytyczności' : '', pmExists ? 'zadanie PM' : '']
      .filter(Boolean)
      .join(' i ');
    throw new AppError(409, `Przyczyna posiada ${what}. Dodaj ?force=true`);
  }
  // suppress unused warning
  void hasChildren;
  return prisma.failureCause.delete({ where: { id: causeId } });
}
