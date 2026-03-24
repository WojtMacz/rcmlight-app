import { PrismaClient, Role, CriteriaCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// Definicje grup materiałowych (globalne, gotowe do przypisania)
// Format: { code, name, category }
// ============================================================

const MATERIAL_GROUP_DEFINITIONS = [
  // Mechanika (ME)
  { code: 'ME01', name: 'ŁOŻYSKA', category: 'ME' },
  { code: 'ME02', name: 'ELEMENTY ŁĄCZENIOWE', category: 'ME' },
  { code: 'ME03', name: 'USZCZELNIENIA', category: 'ME' },
  { code: 'ME04', name: 'NAPĘDY PASOWE / ŁAŃCUCHOWE', category: 'ME' },
  { code: 'ME05', name: 'SPRZĘGŁA', category: 'ME' },
  { code: 'ME06', name: 'PRZEKŁADNIE', category: 'ME' },
  { code: 'ME07', name: 'ELEMENTY PROWADZĄCE (SZYNY, PROWADNICE)', category: 'ME' },
  { code: 'ME08', name: 'SILNIKI ELEKTRYCZNE', category: 'ME' },
  { code: 'ME09', name: 'POMPY', category: 'ME' },
  { code: 'ME10', name: 'INNE ELEMENTY MECHANICZNE', category: 'ME' },
  // Elektryka (EL)
  { code: 'EL01', name: 'CZUJNIKI / SENSORY', category: 'EL' },
  { code: 'EL02', name: 'STEROWNIKI PLC / MODUŁY I/O', category: 'EL' },
  { code: 'EL03', name: 'NAPĘDY / FALOWNIKI / SERWONAPĘDY', category: 'EL' },
  { code: 'EL04', name: 'ELEMENTY ŁĄCZNIKOWE (KONTAKTORY, PRZEKAŹNIKI)', category: 'EL' },
  { code: 'EL05', name: 'OKABLOWANIE I ZŁĄCZA', category: 'EL' },
  // Pneumatyka / Hydraulika (PH)
  { code: 'PH01', name: 'ZAWORY PNEUMATYCZNE', category: 'PH' },
  { code: 'PH02', name: 'SIŁOWNIKI PNEUMATYCZNE', category: 'PH' },
  { code: 'PH03', name: 'ZAWORY HYDRAULICZNE', category: 'PH' },
  { code: 'PH04', name: 'SIŁOWNIKI HYDRAULICZNE', category: 'PH' },
  { code: 'PH05', name: 'FILTRY / SEPARATORY', category: 'PH' },
] as const;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

async function main(): Promise<void> {
  console.warn('Seeding database...');

  // ============================================================
  // 1. Firma Demo
  // ============================================================
  const company = await prisma.company.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo',
      isActive: true,
    },
  });
  console.warn(`Company: ${company.name} (${company.id})`);

  // ============================================================
  // 2. Użytkownicy
  // ============================================================
  const users: Array<{ email: string; firstName: string; lastName: string; role: Role; password: string }> = [
    { email: 'wojtek.maczynski@somasolution24.com', firstName: 'Wojciech', lastName: 'Maczyński', role: 'ADMIN', password: 'Admin123!' },
    { email: 'analyst@demo.com', firstName: 'Jan', lastName: 'Analityk', role: 'ANALYST', password: 'Analyst123!' },
    { email: 'viewer@demo.com', firstName: 'Anna', lastName: 'Viewer', role: 'VIEWER', password: 'Viewer123!' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        passwordHash: await hashPassword(u.password),
        companyId: company.id,
        isActive: true,
      },
    });
    console.warn(`User: ${user.email} [${user.role}]`);
  }

  // Super Admin
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@rcmlight.app' },
    update: {},
    create: {
      email: 'superadmin@rcmlight.app',
      passwordHash: await hashPassword('SuperAdmin123!'),
    },
  });
  console.warn('SuperAdmin: superadmin@rcmlight.app');

  // ============================================================
  // 3. Przykładowa maszyna z kompletną strukturą BOM
  // ============================================================
  const machine = await prisma.machine.upsert({
    where: {
      // Brak unikalnego constraintu na (number, companyId) — sprawdzamy przez findFirst
      // Używamy create + skip jeśli już istnieje
      id: 'seed-machine-001',
    },
    update: {},
    create: {
      id: 'seed-machine-001',
      number: 'M-001',
      name: 'Linia pakowania — maszyna główna',
      description: 'Przykładowa maszyna produkcyjna do demonstracji analizy RCM',
      machineDowntimeCostPerHour: 1500,
      technicianHourlyCost: 85,
      allowedUnavailability: 0.03,
      companyId: company.id,
    },
  });
  console.warn(`Machine: ${machine.name}`);

  // ============================================================
  // System 1 — Układ napędowy
  // ============================================================
  const system1 = await prisma.system.upsert({
    where: { id: 'seed-system-001' },
    update: {},
    create: {
      id: 'seed-system-001',
      number: 1,
      name: 'Układ napędowy',
      machineId: machine.id,
    },
  });

  // Assembly 1.1 — Przekładnia główna
  const assembly11 = await prisma.assembly.upsert({
    where: { id: 'seed-assembly-0101' },
    update: {},
    create: {
      id: 'seed-assembly-0101',
      number: '1.1',
      name: 'Przekładnia główna',
      systemId: system1.id,
    },
  });

  // Grupy materiałowe dla assembly 1.1
  const mgMe01 = await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0101-ME01' },
    update: {},
    create: {
      id: 'seed-mg-0101-ME01',
      ...MATERIAL_GROUP_DEFINITIONS[0], // ME01 ŁOŻYSKA
      assemblyId: assembly11.id,
    },
  });

  const mgMe06 = await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0101-ME06' },
    update: {},
    create: {
      id: 'seed-mg-0101-ME06',
      ...MATERIAL_GROUP_DEFINITIONS[5], // ME06 PRZEKŁADNIE
      assemblyId: assembly11.id,
    },
  });

  const mgMe03 = await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0101-ME03' },
    update: {},
    create: {
      id: 'seed-mg-0101-ME03',
      ...MATERIAL_GROUP_DEFINITIONS[2], // ME03 USZCZELNIENIA
      assemblyId: assembly11.id,
    },
  });

  // Assembly 1.2 — Silnik główny
  const assembly12 = await prisma.assembly.upsert({
    where: { id: 'seed-assembly-0102' },
    update: {},
    create: {
      id: 'seed-assembly-0102',
      number: '1.2',
      name: 'Silnik główny',
      systemId: system1.id,
    },
  });

  await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0102-ME08' },
    update: {},
    create: {
      id: 'seed-mg-0102-ME08',
      ...MATERIAL_GROUP_DEFINITIONS[7], // ME08 SILNIKI ELEKTRYCZNE
      assemblyId: assembly12.id,
    },
  });

  await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0102-EL03' },
    update: {},
    create: {
      id: 'seed-mg-0102-EL03',
      ...MATERIAL_GROUP_DEFINITIONS[12], // EL03 NAPĘDY/FALOWNIKI
      assemblyId: assembly12.id,
    },
  });

  // ============================================================
  // System 2 — Układ sterowania
  // ============================================================
  const system2 = await prisma.system.upsert({
    where: { id: 'seed-system-002' },
    update: {},
    create: {
      id: 'seed-system-002',
      number: 2,
      name: 'Układ sterowania',
      machineId: machine.id,
    },
  });

  const assembly21 = await prisma.assembly.upsert({
    where: { id: 'seed-assembly-0201' },
    update: {},
    create: {
      id: 'seed-assembly-0201',
      number: '2.1',
      name: 'Szafa sterownicza',
      systemId: system2.id,
    },
  });

  await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0201-EL01' },
    update: {},
    create: {
      id: 'seed-mg-0201-EL01',
      ...MATERIAL_GROUP_DEFINITIONS[10], // EL01 CZUJNIKI
      assemblyId: assembly21.id,
    },
  });

  await prisma.materialGroup.upsert({
    where: { id: 'seed-mg-0201-EL02' },
    update: {},
    create: {
      id: 'seed-mg-0201-EL02',
      ...MATERIAL_GROUP_DEFINITIONS[11], // EL02 STEROWNIKI PLC
      assemblyId: assembly21.id,
    },
  });

  // ============================================================
  // 4. Przykładowa analiza RCM dla assembly 1.1
  // ============================================================

  // Funkcja na poziomie SYSTEM
  const sysFunction = await prisma.functionDef.upsert({
    where: { id: 'seed-func-sys-001' },
    update: {},
    create: {
      id: 'seed-func-sys-001',
      code: '1.F1',
      description: 'Przenosić moment obrotowy z silnika na wał wyjściowy',
      standard: 'Moment wyjściowy ≥ 500 Nm przy prędkości 1450 rpm',
      level: 'SYSTEM',
      systemId: system1.id,
    },
  });

  // Funkcja na poziomie ASSEMBLY
  const asmFunction = await prisma.functionDef.upsert({
    where: { id: 'seed-func-asm-001' },
    update: {},
    create: {
      id: 'seed-func-asm-001',
      code: '1.1.F1',
      description: 'Redukować prędkość obrotową z przełożeniem 1:20',
      standard: 'Przełożenie 1:20 ±2%, moment max 1200 Nm, temp. oleju < 80°C',
      level: 'ASSEMBLY',
      assemblyId: assembly11.id,
    },
  });

  // Uszkodzenie funkcjonalne
  const ff1 = await prisma.functionalFailure.upsert({
    where: { id: 'seed-ff-001' },
    update: {},
    create: {
      id: 'seed-ff-001',
      code: 'FF1',
      description: 'Całkowita utrata zdolności przekazywania momentu',
      functionId: asmFunction.id,
    },
  });

  const ff2 = await prisma.functionalFailure.upsert({
    where: { id: 'seed-ff-002' },
    update: {},
    create: {
      id: 'seed-ff-002',
      code: 'FF2',
      description: 'Redukcja momentu poniżej wartości nominalnej (> 20% spadku)',
      functionId: asmFunction.id,
    },
  });

  // Uszkodzenia fizyczne
  const pf1 = await prisma.physicalFailure.upsert({
    where: { id: 'seed-pf-001' },
    update: {},
    create: {
      id: 'seed-pf-001',
      code: 'PF1',
      description: 'Zniszczenie łożyska wejściowego (zatarcie/pęknięcie pierścienia)',
      mtbfMonths: 36,
      functionalFailureId: ff1.id,
      materialGroupId: mgMe01.id,
    },
  });

  const pf2 = await prisma.physicalFailure.upsert({
    where: { id: 'seed-pf-002' },
    update: {},
    create: {
      id: 'seed-pf-002',
      code: 'PF2',
      description: 'Wycieki oleju przez uszczelnienie wału wejściowego',
      mtbfMonths: 18,
      functionalFailureId: ff2.id,
      materialGroupId: mgMe03.id,
    },
  });

  const pf3 = await prisma.physicalFailure.upsert({
    where: { id: 'seed-pf-003' },
    update: {},
    create: {
      id: 'seed-pf-003',
      code: 'PF3',
      description: 'Zużycie kół zębatych (pitching powierzchni styku)',
      mtbfMonths: 60,
      functionalFailureId: ff2.id,
      materialGroupId: mgMe06.id,
    },
  });

  // Przyczyny i krytyczność
  const cause1 = await prisma.failureCause.upsert({
    where: { id: 'seed-cause-001' },
    update: {},
    create: {
      id: 'seed-cause-001',
      code: 'CF1',
      description: 'Brak smarowania — niewystarczająca ilość smaru / smar zanieczyszczony',
      physicalFailureId: pf1.id,
    },
  });

  await prisma.criticality.upsert({
    where: { causeId: cause1.id },
    update: {},
    create: {
      causeId: cause1.id,
      // Wskaźnik Konsekwencji
      safety: 2,     // może spowodować wypadek (urwanie wału)
      impact: 3,     // zatrzymuje całą linię
      quality: 2,    // straty jakościowe
      production: 3, // pełne zatrzymanie produkcji
      frequency: 2,  // MTBF 36 mies. → umiarkowanie częste
      // Wskaźnik Pracochłonności
      repairCost: 3, // wymiana łożyska + demontaż przekładni
      laborTime: 3,  // > 8 rbh
      // Koszty
      downtimeHours: 16,
      qualityLossCost: 5000,
      secondaryDamageCost: 8000,
      sparepartCost: 1200,
      repairManHours: 12,
    },
  });

  await prisma.pMTask.upsert({
    where: { causeId: cause1.id },
    update: {},
    create: {
      causeId: cause1.id,
      taskType: 'PM_INSPECTION',
      description:
        'Pomiar temperatury i drgań łożyska wejściowego. Kontrola poziomu i czystości smaru.',
      assignedTo: 'UR — Mechanik',
      isActive: true,
      plannedDowntimeH: 0.5,
      sparepartCost: 0,
      repairManHours: 1,
      calculatedFrequencyMonths: 3,
      finalFrequencyMonths: 3,
    },
  });

  const cause2 = await prisma.failureCause.upsert({
    where: { id: 'seed-cause-002' },
    update: {},
    create: {
      id: 'seed-cause-002',
      code: 'CF2',
      description: 'Starzenie uszczelnienia — eksploatacja powyżej nominalnego okresu trwałości',
      physicalFailureId: pf2.id,
    },
  });

  await prisma.criticality.upsert({
    where: { causeId: cause2.id },
    update: {},
    create: {
      causeId: cause2.id,
      safety: 1,
      impact: 2,
      quality: 1,
      production: 2,
      frequency: 3,  // MTBF 18 mies. → częste
      repairCost: 1,
      laborTime: 2,
      downtimeHours: 4,
      qualityLossCost: 500,
      secondaryDamageCost: 200,
      sparepartCost: 80,
      repairManHours: 3,
    },
  });

  await prisma.pMTask.upsert({
    where: { causeId: cause2.id },
    update: {},
    create: {
      causeId: cause2.id,
      taskType: 'PM_OVERHAUL',
      description: 'Wymiana uszczelnienia wału wejściowego wraz z kontrolą luzu osiowego.',
      assignedTo: 'UR — Mechanik',
      isActive: true,
      plannedDowntimeH: 4,
      sparepartCost: 80,
      repairManHours: 3,
      calculatedFrequencyMonths: 12,
      finalFrequencyMonths: 12,
    },
  });

  const cause3 = await prisma.failureCause.upsert({
    where: { id: 'seed-cause-003' },
    update: {},
    create: {
      id: 'seed-cause-003',
      code: 'CF3',
      description: 'Przeciążenie — wielokrotne przekraczanie nominalnego momentu obrotowego',
      physicalFailureId: pf3.id,
    },
  });

  await prisma.criticality.upsert({
    where: { causeId: cause3.id },
    update: {},
    create: {
      causeId: cause3.id,
      safety: 1,
      impact: 3,
      quality: 2,
      production: 3,
      frequency: 1,  // MTBF 60 mies. → rzadkie
      repairCost: 3,
      laborTime: 3,
      downtimeHours: 48,
      qualityLossCost: 15000,
      secondaryDamageCost: 25000,
      sparepartCost: 8500,
      repairManHours: 24,
    },
  });

  await prisma.pMTask.upsert({
    where: { causeId: cause3.id },
    update: {},
    create: {
      causeId: cause3.id,
      taskType: 'PDM',
      description:
        'Monitoring drgań przekładni metodą analizy widma FFT. Pomiar raz na miesiąc + analiza trendu.',
      assignedTo: 'UR — Specjalista diagnostyki',
      isActive: true,
      plannedDowntimeH: 0,
      sparepartCost: 0,
      repairManHours: 2,
      calculatedFrequencyMonths: 1,
      finalFrequencyMonths: 1,
    },
  });

  // Spare parts — przykłady
  await prisma.sparePart.upsert({
    where: { id: 'seed-sp-001' },
    update: {},
    create: {
      id: 'seed-sp-001',
      name: 'Łożysko kulkowe jednorzędowe 6308-2Z/C3',
      catalogNumber: '6308-2Z/C3',
      materialGroupId: mgMe01.id,
    },
  });

  await prisma.sparePart.upsert({
    where: { id: 'seed-sp-002' },
    update: {},
    create: {
      id: 'seed-sp-002',
      name: 'Uszczelnienie wargowe 40x62x10 HMSA10',
      catalogNumber: 'HMSA10-40x62x10',
      materialGroupId: mgMe03.id,
    },
  });

  // Powiąż też sys-level function (bez uszkodzeń — placeholder)
  console.warn(`SysFunction: ${sysFunction.code}`);
  console.warn(`AsmFunction: ${asmFunction.code}`);
  console.warn(`MaterialGroups seeded: ME01, ME03, ME06, ME08, EL01-EL03, EL03`);
  console.warn(`PhysicalFailures: PF1(${mgMe01.code}), PF2(${mgMe03.code}), PF3(${mgMe06.code})`);
  console.warn(`Causes + Criticality + PMTasks: CF1(PM_INSPECTION), CF2(PM_OVERHAUL), CF3(PDM)`);
  // ============================================================
  // Seed CriticalityCriteria dla Demo Company
  // ============================================================
  console.warn('Seeding CriticalityCriteria...');
  // Usuń stare kryteria i wstaw nowe (import z settingsService)
  await prisma.criticalityCriteria.deleteMany({ where: { companyId: company.id } });
  const { DEFAULT_CRITERIA } = await import('../src/services/settingsService');
  for (const [cat, levels] of Object.entries(DEFAULT_CRITERIA)) {
    for (const lvl of levels) {
      await prisma.criticalityCriteria.create({
        data: { companyId: company.id, category: cat as CriteriaCategory, level: lvl.level, label: lvl.label, description: lvl.description },
      });
    }
  }

  // ============================================================
  // Seed MaterialGroupTemplate dla Demo Company
  // ============================================================
  console.warn('Seeding MaterialGroupTemplate...');
  // Usuń stare szablony i wstaw nowe
  await prisma.materialGroupTemplate.deleteMany({ where: { companyId: company.id } });
  const { DEFAULT_MATERIAL_GROUP_TEMPLATES } = await import('../src/services/settingsService');
  for (const tmpl of DEFAULT_MATERIAL_GROUP_TEMPLATES) {
    await prisma.materialGroupTemplate.create({
      data: { companyId: company.id, ...tmpl },
    });
  }

  console.warn('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
