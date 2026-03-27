import { PrismaClient, CriteriaCategory } from '@prisma/client';
import { AppError } from '../utils/AppError';
import type {
  UpdateCriterionInput,
  CreateMaterialGroupTemplateInput,
  UpdateMaterialGroupTemplateInput,
} from '../validators/settings.schemas';

// ── Default criteria data ────────────────────────────────────────────────────

type LevelDef = { level: number; label: string; description: string };

export const DEFAULT_CRITERIA: Record<CriteriaCategory, LevelDef[]> = {
  SAFETY: [
    { level: 0, label: 'Brak', description: 'Wystąpienie uszkodzenia nie wpływa na bezpieczeństwo' },
    { level: 1, label: 'Niski', description: 'Wystąpienie uszkodzenia może spowodować drobne obrażenia bez wpływu na absencję w pracy' },
    { level: 2, label: 'Średni', description: 'Wystąpienie uszkodzenia może spowodować obrażenia powodujące tymczasową absencję w pracy' },
    { level: 3, label: 'Wysoki', description: 'Wystąpienie uszkodzenia może spowodować śmierć lub poważne obrażenia powodujące stałą absencję w pracy' },
  ],
  IMPACT: [
    { level: 0, label: 'Brak', description: 'Brak — koszty tylko w danym procesie' },
    { level: 1, label: 'Niski', description: 'Niski — koszty w danym procesie, czas do 1h' },
    { level: 2, label: 'Średni', description: 'Średni — koszty w danym procesie, czas 1–2h' },
    { level: 3, label: 'Wysoki', description: 'Wysoki — znaczące koszty w dalszym procesie technologicznym, powyżej 2h' },
  ],
  QUALITY: [
    { level: 0, label: 'Brak', description: 'Wystąpienie uszkodzenia nie wpływa na aspekty jakościowe' },
    { level: 1, label: 'Niski', description: 'Wystąpienie uszkodzenia może powodować braki które poddane są poprawkom lub ponownemu przetworzeniu' },
    { level: 2, label: 'Średni', description: 'Wystąpienie uszkodzenia może powodować braki które mogą zablokować całą partię i powodują wysoki poziom poprawek' },
    { level: 3, label: 'Wysoki', description: 'Wystąpienie uszkodzenia może spowodować złomowanie partii produkcyjnej lub reklamację klienta - brak wychwycenia wewnątrz zakładu' },
  ],
  PRODUCTION: [
    { level: 0, label: 'Brak', description: 'Wystąpienie uszkodzenia nie wpływa na aspekty produkcyjne' },
    { level: 1, label: 'Niski', description: 'Wystąpienie uszkodzenia może zatrzymać proces < kilkunastu minut (0,5h)' },
    { level: 2, label: 'Średni', description: 'Wystąpienie uszkodzenia może zatrzymać proces między kilkanaście minut (0,5h) a kilka godzin (5h)' },
    { level: 3, label: 'Wysoki', description: 'Wystąpienie uszkodzenia może zatrzymać proces > kilku godzin (5h)' },
  ],
  FREQUENCY: [
    { level: 0, label: 'Brak', description: 'Rzadziej niż raz na rok' },
    { level: 1, label: 'Niski', description: 'Raz w roku' },
    { level: 2, label: 'Średni', description: 'Raz na dwa miesiące' },
    { level: 3, label: 'Wysoki', description: 'Raz na miesiąc lub częściej' },
  ],
  REPAIR_COST: [
    { level: 0, label: 'Brak', description: 'Koszt awarii do 1 000 PLN' },
    { level: 1, label: 'Niski', description: 'Koszty awarii 1 000 - 3 000 PLN' },
    { level: 2, label: 'Średni', description: 'Koszty awarii 3 000 - 5 000 PLN' },
    { level: 3, label: 'Wysoki', description: 'Koszty awarii powyżej 5 000 PLN' },
  ],
  LABOR: [
    { level: 0, label: 'Brak', description: 'Naprawa polega na regulacji (1 osoba)' },
    { level: 1, label: 'Niski', description: 'Naprawa polega na wymianie pojedynczego komponentu (1 osoba)' },
    { level: 2, label: 'Średni', description: 'Naprawa polegająca na wymianie kilku komponentów (1-2 osoby)' },
    { level: 3, label: 'Wysoki', description: 'Skomplikowana wymiana polegająca na wymianie kilku komponentów i wsparcie większej ilości osób' },
  ],
  AVAILABILITY: [
    { level: 0, label: 'Brak', description: 'Część łatwo dostępna - od ręki' },
    { level: 1, label: 'Niski', description: 'Część dostępna z terminem do 4 tygodni' },
    { level: 2, label: 'Średni', description: 'Część dostępna z terminem od 4 do 8 tygodni' },
    { level: 3, label: 'Wysoki', description: 'Część trudnodostępna - powyżej 8 tygodni' },
  ],
};

// ── Default material group templates ─────────────────────────────────────────

export const DEFAULT_MATERIAL_GROUP_TEMPLATES = [
  // ME — Mechanika (20 grup)
  { code: 'ME01', name: 'ELEMENTY ŁĄCZENIOWE', category: 'ME', categoryName: 'Mechanika', sortOrder: 1 },
  { code: 'ME02', name: 'ŁOŻYSKA', category: 'ME', categoryName: 'Mechanika', sortOrder: 2 },
  { code: 'ME03', name: 'ŁAŃCUCHY', category: 'ME', categoryName: 'Mechanika', sortOrder: 3 },
  { code: 'ME04', name: 'PASY', category: 'ME', categoryName: 'Mechanika', sortOrder: 4 },
  { code: 'ME05', name: 'SPRZĘGŁA', category: 'ME', categoryName: 'Mechanika', sortOrder: 5 },
  { code: 'ME06', name: 'PRZEKŁADNIE', category: 'ME', categoryName: 'Mechanika', sortOrder: 6 },
  { code: 'ME07', name: 'UKŁAD PLASTYFIKUJĄCY', category: 'ME', categoryName: 'Mechanika', sortOrder: 7 },
  { code: 'ME08', name: 'DYSZE', category: 'ME', categoryName: 'Mechanika', sortOrder: 8 },
  { code: 'ME09', name: 'TAŚMY TRANSPORTOWE', category: 'ME', categoryName: 'Mechanika', sortOrder: 9 },
  { code: 'ME10', name: 'ELEMENTY KONSTRUKCJI', category: 'ME', categoryName: 'Mechanika', sortOrder: 10 },
  { code: 'ME11', name: 'SPRĘŻYNY', category: 'ME', categoryName: 'Mechanika', sortOrder: 11 },
  { code: 'ME12', name: 'AMORTYZATORY', category: 'ME', categoryName: 'Mechanika', sortOrder: 12 },
  { code: 'ME13', name: 'NOŻE', category: 'ME', categoryName: 'Mechanika', sortOrder: 13 },
  { code: 'ME14', name: 'WAŁKI', category: 'ME', categoryName: 'Mechanika', sortOrder: 14 },
  { code: 'ME15', name: 'KOŁA', category: 'ME', categoryName: 'Mechanika', sortOrder: 15 },
  { code: 'ME16', name: 'ELEMENTY PROWADZĄCE I USTALAJĄCE', category: 'ME', categoryName: 'Mechanika', sortOrder: 16 },
  { code: 'ME17', name: 'TULEJE WTRYSKOWE', category: 'ME', categoryName: 'Mechanika', sortOrder: 17 },
  { code: 'ME18', name: 'WYPYCHACZE', category: 'ME', categoryName: 'Mechanika', sortOrder: 18 },
  { code: 'ME19', name: 'DATOWNIKI', category: 'ME', categoryName: 'Mechanika', sortOrder: 19 },
  { code: 'ME20', name: 'ELEMENTY GORĄCYCH KANAŁÓW', category: 'ME', categoryName: 'Mechanika', sortOrder: 20 },
  // EL — Elektryka (15 grup)
  { code: 'EL01', name: 'CZUJNIKI I PRZETWORNIKI', category: 'EL', categoryName: 'Elektryka', sortOrder: 21 },
  { code: 'EL02', name: 'MODUŁY STEROWANIA', category: 'EL', categoryName: 'Elektryka', sortOrder: 22 },
  { code: 'EL03', name: 'ŹRÓDŁA ZASILANIA', category: 'EL', categoryName: 'Elektryka', sortOrder: 23 },
  { code: 'EL04', name: 'GNIAZDA I ŁĄCZNIKI ELEKTRYCZNE', category: 'EL', categoryName: 'Elektryka', sortOrder: 24 },
  { code: 'EL05', name: 'NAPĘDY', category: 'EL', categoryName: 'Elektryka', sortOrder: 25 },
  { code: 'EL06', name: 'PRZEWODY', category: 'EL', categoryName: 'Elektryka', sortOrder: 26 },
  { code: 'EL07', name: 'ŹRÓDŁA ŚWIATŁA', category: 'EL', categoryName: 'Elektryka', sortOrder: 27 },
  { code: 'EL08', name: 'FALOWNIKI', category: 'EL', categoryName: 'Elektryka', sortOrder: 28 },
  { code: 'EL09', name: 'WENTYLATORY', category: 'EL', categoryName: 'Elektryka', sortOrder: 29 },
  { code: 'EL10', name: 'BEZPIECZNIKI', category: 'EL', categoryName: 'Elektryka', sortOrder: 30 },
  { code: 'EL11', name: 'STYCZNIKI', category: 'EL', categoryName: 'Elektryka', sortOrder: 31 },
  { code: 'EL12', name: 'PRZEKAŹNIKI', category: 'EL', categoryName: 'Elektryka', sortOrder: 32 },
  { code: 'EL13', name: 'ELEMENTY GRZEWCZE', category: 'EL', categoryName: 'Elektryka', sortOrder: 33 },
  { code: 'EL14', name: 'ROZDZIELNICE I OBUDOWY', category: 'EL', categoryName: 'Elektryka', sortOrder: 34 },
  { code: 'EL15', name: 'WŁĄCZNIKI I PRZEŁĄCZNIKI', category: 'EL', categoryName: 'Elektryka', sortOrder: 35 },
  // PN — Pneumatyka (8 grup)
  { code: 'PN01', name: 'SIŁOWNIKI', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 36 },
  { code: 'PN02', name: 'ZAWORY I ELEKTROZAWORY', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 37 },
  { code: 'PN03', name: 'PRZEWODY', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 38 },
  { code: 'PN04', name: 'PRZYGOTOWANIE POWIETRZA', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 39 },
  { code: 'PN05', name: 'MANOMETRY', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 40 },
  { code: 'PN06', name: 'ZŁĄCZKI', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 41 },
  { code: 'PN07', name: 'WZMACNIACZE CIŚNIENIA', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 42 },
  { code: 'PN08', name: 'PRZYSSAWKI', category: 'PN', categoryName: 'Pneumatyka', sortOrder: 43 },
  // HO — Hydraulika olejowa (11 grup)
  { code: 'HO01', name: 'ZŁĄCZKI', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 44 },
  { code: 'HO02', name: 'ZAWORY I ELEKTROZAWORY', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 45 },
  { code: 'HO03', name: 'PRZEWODY', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 46 },
  { code: 'HO04', name: 'FILTRY', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 47 },
  { code: 'HO05', name: 'MANOMETRY', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 48 },
  { code: 'HO06', name: 'POMPY', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 49 },
  { code: 'HO07', name: 'SIŁOWNIKI', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 50 },
  { code: 'HO08', name: 'USZCZELNIENIA', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 51 },
  { code: 'HO09', name: 'NAPĘDY', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 52 },
  { code: 'HO10', name: 'ZBIORNIKI', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 53 },
  { code: 'HO11', name: 'CHŁODNICA OLEJU', category: 'HO', categoryName: 'Hydraulika olejowa', sortOrder: 54 },
  // HW — Hydraulika wodna (9 grup)
  { code: 'HW01', name: 'ZŁĄCZKI', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 55 },
  { code: 'HW02', name: 'ZAWORY I ELEKTROZAWORY', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 56 },
  { code: 'HW03', name: 'PRZEWODY', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 57 },
  { code: 'HW04', name: 'FILTRY', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 58 },
  { code: 'HW05', name: 'POMPY', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 59 },
  { code: 'HW06', name: 'ZBIORNIKI', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 60 },
  { code: 'HW07', name: 'USZCZELNIENIA', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 61 },
  { code: 'HW08', name: 'ROZDZIELACZ WODNY', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 62 },
  { code: 'HW09', name: 'ROTAMETRY', category: 'HW', categoryName: 'Hydraulika wodna', sortOrder: 63 },
  // OL — Oleje i smary (4 grupy)
  { code: 'OL01', name: 'OLEJ HYDRAULICZNY', category: 'OL', categoryName: 'Oleje i smary', sortOrder: 64 },
  { code: 'OL02', name: 'OLEJ SMARUJĄCY', category: 'OL', categoryName: 'Oleje i smary', sortOrder: 65 },
  { code: 'OL03', name: 'OLEJ WYSOKOTEMPERATUROWY (DO TERMOSTATÓW)', category: 'OL', categoryName: 'Oleje i smary', sortOrder: 66 },
  { code: 'OL04', name: 'SMARY', category: 'OL', categoryName: 'Oleje i smary', sortOrder: 67 },
  // WM — Wyposażenie i materiały eksploatacyjne (6 grup)
  { code: 'WM01', name: 'CHEMIA', category: 'WM', categoryName: 'Wyposażenie i materiały eksploatacyjne', sortOrder: 68 },
  { code: 'WM02', name: 'NARZĘDZIA', category: 'WM', categoryName: 'Wyposażenie i materiały eksploatacyjne', sortOrder: 69 },
  { code: 'WM03', name: 'OSPRZĘT DO NARZĘDZI', category: 'WM', categoryName: 'Wyposażenie i materiały eksploatacyjne', sortOrder: 70 },
  { code: 'WM04', name: 'FILTRY', category: 'WM', categoryName: 'Wyposażenie i materiały eksploatacyjne', sortOrder: 71 },
  { code: 'WM05', name: 'ABSORBERY WILGOCI', category: 'WM', categoryName: 'Wyposażenie i materiały eksploatacyjne', sortOrder: 72 },
  { code: 'WM06', name: 'ZAWIESIA', category: 'WM', categoryName: 'Wyposażenie i materiały eksploatacyjne', sortOrder: 73 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export async function seedCompanyDefaults(companyId: string, prisma: PrismaClient) {
  await seedDefaultCriteriaForCompany(companyId, prisma);
  await seedDefaultMaterialGroupTemplates(companyId, prisma);
}

async function seedDefaultCriteriaForCompany(companyId: string, prisma: PrismaClient) {
  const categories = Object.keys(DEFAULT_CRITERIA) as CriteriaCategory[];
  for (const category of categories) {
    for (const lvl of DEFAULT_CRITERIA[category]) {
      await prisma.criticalityCriteria.upsert({
        where: { companyId_category_level: { companyId, category, level: lvl.level } },
        update: {},
        create: { companyId, category, level: lvl.level, label: lvl.label, description: lvl.description },
      });
    }
  }
}

async function seedDefaultMaterialGroupTemplates(companyId: string, prisma: PrismaClient) {
  for (const tmpl of DEFAULT_MATERIAL_GROUP_TEMPLATES) {
    await prisma.materialGroupTemplate.upsert({
      where: { companyId_code: { companyId, code: tmpl.code } },
      update: {},
      create: { companyId, ...tmpl },
    });
  }
}

// ── Criticality Criteria ──────────────────────────────────────────────────────

export async function getCriteriaCriteria(companyId: string, prisma: PrismaClient) {
  const count = await prisma.criticalityCriteria.count({ where: { companyId } });
  if (count === 0) await seedDefaultCriteriaForCompany(companyId, prisma);
  return prisma.criticalityCriteria.findMany({
    where: { companyId },
    orderBy: [{ category: 'asc' }, { level: 'asc' }],
  });
}

export async function updateCriterion(
  companyId: string,
  criterionId: string,
  data: UpdateCriterionInput,
  userId: string | undefined,
  prisma: PrismaClient,
) {
  const criterion = await prisma.criticalityCriteria.findUnique({ where: { id: criterionId } });
  if (!criterion) throw new AppError(404, 'Kryterium nie istnieje');
  if (criterion.companyId !== companyId) throw new AppError(403, 'Brak dostępu');
  return prisma.criticalityCriteria.update({
    where: { id: criterionId },
    data: { ...data, updatedBy: userId },
  });
}

export async function resetCriteriaForCategory(
  companyId: string,
  category: CriteriaCategory | undefined,
  prisma: PrismaClient,
) {
  if (category) {
    for (const lvl of DEFAULT_CRITERIA[category]) {
      await prisma.criticalityCriteria.upsert({
        where: { companyId_category_level: { companyId, category, level: lvl.level } },
        update: { label: lvl.label, description: lvl.description },
        create: { companyId, category, level: lvl.level, label: lvl.label, description: lvl.description },
      });
    }
  } else {
    await prisma.criticalityCriteria.deleteMany({ where: { companyId } });
    await seedDefaultCriteriaForCompany(companyId, prisma);
  }
}

// ── Material Group Templates ──────────────────────────────────────────────────

export async function getMaterialGroupTemplates(companyId: string, prisma: PrismaClient) {
  const count = await prisma.materialGroupTemplate.count({ where: { companyId } });
  if (count === 0) await seedDefaultMaterialGroupTemplates(companyId, prisma);
  return prisma.materialGroupTemplate.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });
}

export async function createMaterialGroupTemplate(
  companyId: string,
  data: CreateMaterialGroupTemplateInput,
  prisma: PrismaClient,
) {
  const existing = await prisma.materialGroupTemplate.findUnique({
    where: { companyId_code: { companyId, code: data.code } },
  });
  if (existing) throw new AppError(409, `Szablon grupy materiałowej o kodzie ${data.code} już istnieje`);
  return prisma.materialGroupTemplate.create({ data: { companyId, ...data } });
}

export async function updateMaterialGroupTemplate(
  companyId: string,
  templateId: string,
  data: UpdateMaterialGroupTemplateInput,
  prisma: PrismaClient,
) {
  const tmpl = await prisma.materialGroupTemplate.findUnique({ where: { id: templateId } });
  if (!tmpl) throw new AppError(404, 'Szablon nie istnieje');
  if (tmpl.companyId !== companyId) throw new AppError(403, 'Brak dostępu');
  return prisma.materialGroupTemplate.update({ where: { id: templateId }, data });
}

export async function deleteMaterialGroupTemplate(
  companyId: string,
  templateId: string,
  prisma: PrismaClient,
) {
  const tmpl = await prisma.materialGroupTemplate.findUnique({ where: { id: templateId } });
  if (!tmpl) throw new AppError(404, 'Szablon nie istnieje');
  if (tmpl.companyId !== companyId) throw new AppError(403, 'Brak dostępu');
  return prisma.materialGroupTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  });
}
