/**
 * Serwis dla węzłów BOM: System, Assembly, MaterialGroup, SparePart.
 * Każda operacja weryfikuje przynależność do firmy przez hierarchię do Machine.
 */
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { getMachineOrFail } from './machineService';
import type {
  CreateAssemblyInput,
  CreateMaterialGroupInput,
  CreateSparePartInput,
  CreateSystemInput,
  ReorderSystemsInput,
  UpdateAssemblyInput,
  UpdateMaterialGroupInput,
  UpdateSparePartInput,
  UpdateSystemInput,
} from '../validators/bom.schemas';

// ── HELPERS ────────────────────────────────────────────────────────────────

async function getSystemOrFail(systemId: string, companyId: string, prisma: PrismaClient) {
  const system = await prisma.system.findUnique({
    where: { id: systemId },
    include: { machine: { select: { companyId: true } } },
  });
  if (!system) throw new AppError(404, 'System nie istnieje');
  if (system.machine.companyId !== companyId)
    throw new AppError(403, 'Brak dostępu do tego systemu');
  return system;
}

async function getAssemblyOrFail(assemblyId: string, companyId: string, prisma: PrismaClient) {
  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: { system: { include: { machine: { select: { companyId: true } } } } },
  });
  if (!assembly) throw new AppError(404, 'Zespół nie istnieje');
  if (assembly.system.machine.companyId !== companyId)
    throw new AppError(403, 'Brak dostępu do tego zespołu');
  return assembly;
}

async function getMaterialGroupOrFail(
  groupId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  const group = await prisma.materialGroup.findUnique({
    where: { id: groupId },
    include: {
      assembly: { include: { system: { include: { machine: { select: { companyId: true } } } } } },
    },
  });
  if (!group) throw new AppError(404, 'Grupa materiałowa nie istnieje');
  if (group.assembly.system.machine.companyId !== companyId)
    throw new AppError(403, 'Brak dostępu do tej grupy materiałowej');
  return group;
}

async function getSparePartOrFail(partId: string, companyId: string, prisma: PrismaClient) {
  const part = await prisma.sparePart.findUnique({
    where: { id: partId },
    include: {
      materialGroup: {
        include: {
          assembly: {
            include: { system: { include: { machine: { select: { companyId: true } } } } },
          },
        },
      },
    },
  });
  if (!part) throw new AppError(404, 'Część zamienna nie istnieje');
  if (part.materialGroup.assembly.system.machine.companyId !== companyId)
    throw new AppError(403, 'Brak dostępu do tej części zamiennej');
  return part;
}

// ── SYSTEMS ────────────────────────────────────────────────────────────────

export async function listSystems(machineId: string, companyId: string, prisma: PrismaClient) {
  await getMachineOrFail(machineId, companyId, prisma);
  return prisma.system.findMany({
    where: { machineId },
    orderBy: { number: 'asc' },
    include: { _count: { select: { assemblies: true } } },
  });
}

export async function createSystem(
  machineId: string,
  companyId: string,
  data: CreateSystemInput,
  prisma: PrismaClient,
) {
  await getMachineOrFail(machineId, companyId, prisma);
  const exists = await prisma.system.findFirst({ where: { machineId, number: data.number } });
  if (exists) throw new AppError(409, `System o numerze ${data.number} już istnieje w tej maszynie`);
  return prisma.system.create({ data: { ...data, machineId } });
}

export async function updateSystem(
  systemId: string,
  companyId: string,
  data: UpdateSystemInput,
  prisma: PrismaClient,
) {
  await getSystemOrFail(systemId, companyId, prisma);
  return prisma.system.update({ where: { id: systemId }, data });
}

export async function deleteSystem(
  systemId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getSystemOrFail(systemId, companyId, prisma);

  const assemblyCount = await prisma.assembly.count({ where: { systemId } });
  if (assemblyCount > 0 && !force) {
    throw new AppError(
      409,
      `System posiada ${assemblyCount} zespół(ołów). Dodaj ?force=true, aby usunąć kaskadowo`,
    );
  }
  return prisma.system.delete({ where: { id: systemId } });
}

export async function reorderSystems(
  companyId: string,
  data: ReorderSystemsInput,
  prisma: PrismaClient,
) {
  // Weryfikacja — wszystkie systemy muszą należeć do tej samej maszyny i firmy
  const systems = await prisma.system.findMany({
    where: { id: { in: data.items.map((i) => i.id) } },
    include: { machine: { select: { companyId: true } } },
  });

  if (systems.length !== data.items.length) {
    throw new AppError(404, 'Jeden lub więcej systemów nie istnieje');
  }
  if (systems.some((s) => s.machine.companyId !== companyId)) {
    throw new AppError(403, 'Brak dostępu do co najmniej jednego systemu');
  }

  const machineIds = new Set(systems.map((s) => s.machineId));
  if (machineIds.size > 1) {
    throw new AppError(400, 'Można zmieniać kolejność systemów tylko w obrębie jednej maszyny');
  }

  await prisma.$transaction(
    data.items.map((item) =>
      prisma.system.update({ where: { id: item.id }, data: { number: item.number } }),
    ),
  );
  return { reordered: data.items.length };
}

// ── ASSEMBLIES ─────────────────────────────────────────────────────────────

export async function listAssemblies(
  systemId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getSystemOrFail(systemId, companyId, prisma);
  return prisma.assembly.findMany({
    where: { systemId },
    orderBy: { number: 'asc' },
    include: { _count: { select: { materialGroups: true } } },
  });
}

export async function createAssembly(
  systemId: string,
  companyId: string,
  data: CreateAssemblyInput,
  prisma: PrismaClient,
) {
  await getSystemOrFail(systemId, companyId, prisma);
  const exists = await prisma.assembly.findFirst({ where: { systemId, number: data.number } });
  if (exists) throw new AppError(409, `Zespół o numerze ${data.number} już istnieje w tym systemie`);
  return prisma.assembly.create({ data: { ...data, systemId } });
}

export async function updateAssembly(
  assemblyId: string,
  companyId: string,
  data: UpdateAssemblyInput,
  prisma: PrismaClient,
) {
  await getAssemblyOrFail(assemblyId, companyId, prisma);
  return prisma.assembly.update({ where: { id: assemblyId }, data });
}

export async function deleteAssembly(
  assemblyId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getAssemblyOrFail(assemblyId, companyId, prisma);

  const groupCount = await prisma.materialGroup.count({ where: { assemblyId } });
  if (groupCount > 0 && !force) {
    throw new AppError(
      409,
      `Zespół posiada ${groupCount} grup(ę/y) materiałowe. Dodaj ?force=true, aby usunąć kaskadowo`,
    );
  }
  return prisma.assembly.delete({ where: { id: assemblyId } });
}

// ── MATERIAL GROUPS ────────────────────────────────────────────────────────

export async function listMaterialGroups(
  assemblyId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getAssemblyOrFail(assemblyId, companyId, prisma);
  return prisma.materialGroup.findMany({
    where: { assemblyId },
    orderBy: { code: 'asc' },
    include: { _count: { select: { spareParts: true, physicalFailures: true } } },
  });
}

export async function createMaterialGroup(
  assemblyId: string,
  companyId: string,
  data: CreateMaterialGroupInput,
  prisma: PrismaClient,
) {
  await getAssemblyOrFail(assemblyId, companyId, prisma);
  const exists = await prisma.materialGroup.findFirst({ where: { assemblyId, code: data.code } });
  if (exists) throw new AppError(409, `Grupa o kodzie ${data.code} już istnieje w tym zespole`);
  return prisma.materialGroup.create({ data: { ...data, assemblyId } });
}

export async function updateMaterialGroup(
  groupId: string,
  companyId: string,
  data: UpdateMaterialGroupInput,
  prisma: PrismaClient,
) {
  await getMaterialGroupOrFail(groupId, companyId, prisma);
  return prisma.materialGroup.update({ where: { id: groupId }, data });
}

export async function deleteMaterialGroup(
  groupId: string,
  companyId: string,
  force: boolean,
  prisma: PrismaClient,
) {
  await getMaterialGroupOrFail(groupId, companyId, prisma);

  const [partCount, failureCount] = await Promise.all([
    prisma.sparePart.count({ where: { materialGroupId: groupId } }),
    prisma.physicalFailure.count({ where: { materialGroupId: groupId } }),
  ]);

  if ((partCount > 0 || failureCount > 0) && !force) {
    const details = [
      partCount > 0 ? `${partCount} część(i) zamiennych` : '',
      failureCount > 0 ? `${failureCount} uszkodzenie(ń) fizycznych` : '',
    ]
      .filter(Boolean)
      .join(', ');
    throw new AppError(409, `Grupa posiada ${details}. Dodaj ?force=true, aby usunąć kaskadowo`);
  }
  return prisma.materialGroup.delete({ where: { id: groupId } });
}

// ── SPARE PARTS ────────────────────────────────────────────────────────────

export async function listSpareParts(
  groupId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getMaterialGroupOrFail(groupId, companyId, prisma);
  return prisma.sparePart.findMany({
    where: { materialGroupId: groupId },
    orderBy: { name: 'asc' },
  });
}

export async function createSparePart(
  groupId: string,
  companyId: string,
  data: CreateSparePartInput,
  prisma: PrismaClient,
) {
  await getMaterialGroupOrFail(groupId, companyId, prisma);
  return prisma.sparePart.create({ data: { ...data, materialGroupId: groupId } });
}

export async function updateSparePart(
  partId: string,
  companyId: string,
  data: UpdateSparePartInput,
  prisma: PrismaClient,
) {
  await getSparePartOrFail(partId, companyId, prisma);
  return prisma.sparePart.update({ where: { id: partId }, data });
}

export async function deleteSparePart(
  partId: string,
  companyId: string,
  prisma: PrismaClient,
) {
  await getSparePartOrFail(partId, companyId, prisma);
  return prisma.sparePart.delete({ where: { id: partId } });
}
