import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { AppError } from '../utils/AppError';
import { getMachineOrFail } from './machineService';

// ── Typy robocze ───────────────────────────────────────────────────────────

interface BomRow {
  systemNumber: number;
  systemName: string;
  assemblyNumber: string;
  assemblyName: string;
  groupCode: string;
  groupName: string;
  groupCategory: string;
  partName?: string;
  partCatalogNumber?: string;
}

// Nagłówki kolumn arkusza BOM
const HEADERS = [
  'System Nr',
  'System Nazwa',
  'Zespół Nr',
  'Zespół Nazwa',
  'Grupa Kod',
  'Grupa Nazwa',
  'Kategoria',
  'Część Nazwa',
  'Część Nr Kat.',
];

// ── IMPORT ─────────────────────────────────────────────────────────────────

function parseXlsx(buffer: Buffer): BomRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames.includes('BOM')
    ? 'BOM'
    : workbook.SheetNames[0];

  if (!sheetName) throw new AppError(400, 'Plik XLSX nie zawiera żadnego arkusza');

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: HEADERS,
    range: 1, // pomiń nagłówek
    defval: '',
  });

  const rows: BomRow[] = [];
  for (const row of raw) {
    const sysNum = Number(row['System Nr']);
    const sysName = String(row['System Nazwa'] ?? '').trim();
    const asmNum = String(row['Zespół Nr'] ?? '').trim();
    const asmName = String(row['Zespół Nazwa'] ?? '').trim();
    const grpCode = String(row['Grupa Kod'] ?? '').trim().toUpperCase();
    const grpName = String(row['Grupa Nazwa'] ?? '').trim().toUpperCase();
    const grpCat = String(row['Kategoria'] ?? '').trim().toUpperCase();

    if (!sysNum || !sysName || !asmNum || !asmName || !grpCode || !grpName || !grpCat) continue;

    rows.push({
      systemNumber: sysNum,
      systemName: sysName,
      assemblyNumber: asmNum,
      assemblyName: asmName,
      groupCode: grpCode,
      groupName: grpName,
      groupCategory: grpCat,
      partName: String(row['Część Nazwa'] ?? '').trim() || undefined,
      partCatalogNumber: String(row['Część Nr Kat.'] ?? '').trim() || undefined,
    });
  }

  if (rows.length === 0) throw new AppError(400, 'Plik XLSX nie zawiera danych do importu');
  return rows;
}

export interface ImportResult {
  systems: number;
  assemblies: number;
  materialGroups: number;
  spareParts: number;
  skipped: number;
}

export async function importBom(
  machineId: string,
  companyId: string,
  fileBuffer: Buffer,
  prisma: PrismaClient,
): Promise<ImportResult> {
  await getMachineOrFail(machineId, companyId, prisma);
  const rows = parseXlsx(fileBuffer);

  const stats: ImportResult = { systems: 0, assemblies: 0, materialGroups: 0, spareParts: 0, skipped: 0 };

  // Mapy cache — unikamy wielokrotnych zapytań do DB dla tych samych encji
  const systemCache = new Map<number, string>(); // systemNumber → systemId
  const assemblyCache = new Map<string, string>(); // `${systemId}:${asmNum}` → assemblyId
  const groupCache = new Map<string, string>(); // `${assemblyId}:${grpCode}` → groupId

  for (const row of rows) {
    try {
      // ── System ──────────────────────────────────────────────────────────
      let systemId = systemCache.get(row.systemNumber);
      if (!systemId) {
        const existing = await prisma.system.findFirst({
          where: { machineId, number: row.systemNumber },
        });
        if (existing) {
          systemId = existing.id;
        } else {
          const created = await prisma.system.create({
            data: { machineId, number: row.systemNumber, name: row.systemName },
          });
          systemId = created.id;
          stats.systems++;
        }
        systemCache.set(row.systemNumber, systemId);
      }

      // ── Assembly ─────────────────────────────────────────────────────────
      const asmCacheKey = `${systemId}:${row.assemblyNumber}`;
      let assemblyId = assemblyCache.get(asmCacheKey);
      if (!assemblyId) {
        const existing = await prisma.assembly.findFirst({
          where: { systemId, number: row.assemblyNumber },
        });
        if (existing) {
          assemblyId = existing.id;
        } else {
          const created = await prisma.assembly.create({
            data: { systemId, number: row.assemblyNumber, name: row.assemblyName },
          });
          assemblyId = created.id;
          stats.assemblies++;
        }
        assemblyCache.set(asmCacheKey, assemblyId);
      }

      // ── MaterialGroup ────────────────────────────────────────────────────
      const grpCacheKey = `${assemblyId}:${row.groupCode}`;
      let groupId = groupCache.get(grpCacheKey);
      if (!groupId) {
        const existing = await prisma.materialGroup.findFirst({
          where: { assemblyId, code: row.groupCode },
        });
        if (existing) {
          groupId = existing.id;
        } else {
          const created = await prisma.materialGroup.create({
            data: {
              assemblyId,
              code: row.groupCode,
              name: row.groupName,
              category: row.groupCategory,
            },
          });
          groupId = created.id;
          stats.materialGroups++;
        }
        groupCache.set(grpCacheKey, groupId);
      }

      // ── SparePart (opcjonalnie) ──────────────────────────────────────────
      if (row.partName) {
        const existingPart = await prisma.sparePart.findFirst({
          where: { materialGroupId: groupId, name: row.partName },
        });
        if (!existingPart) {
          await prisma.sparePart.create({
            data: {
              materialGroupId: groupId,
              name: row.partName,
              catalogNumber: row.partCatalogNumber,
            },
          });
          stats.spareParts++;
        }
      }
    } catch {
      stats.skipped++;
    }
  }

  return stats;
}

// ── EKSPORT ────────────────────────────────────────────────────────────────

export async function exportBom(
  machineId: string,
  companyId: string,
  prisma: PrismaClient,
): Promise<Buffer> {
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
                include: { spareParts: { orderBy: { name: 'asc' } } },
              },
            },
          },
        },
      },
    },
  });

  if (!machine) throw new AppError(404, 'Maszyna nie istnieje');
  if (machine.companyId !== companyId) throw new AppError(403, 'Brak dostępu do tej maszyny');

  const rows: (string | number)[][] = [HEADERS];

  for (const system of machine.systems) {
    for (const assembly of system.assemblies) {
      for (const group of assembly.materialGroups) {
        if (group.spareParts.length === 0) {
          rows.push([
            system.number,
            system.name,
            assembly.number,
            assembly.name,
            group.code,
            group.name,
            group.category,
            '',
            '',
          ]);
        } else {
          for (const part of group.spareParts) {
            rows.push([
              system.number,
              system.name,
              assembly.number,
              assembly.name,
              group.code,
              group.name,
              group.category,
              part.name,
              part.catalogNumber ?? '',
            ]);
          }
        }
      }
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  // Szerokości kolumn
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 30 },
    { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 35 }, { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BOM');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
