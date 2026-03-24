import type { Criticality, RcmAnalysis, FailureCause, PMTask } from '@/types';

// ── Index computations ─────────────────────────────────────────────────────

export function computeWk(c: Criticality): number {
  return (c.safety + c.quality + c.production + c.frequency) / 4;
}

export function computeWp(c: Criticality): number {
  return (c.repairCost + c.laborTime + c.availability) / 3;
}

export function computeWkf(c: Criticality): number {
  return (computeWk(c) + computeWp(c)) / 2;
}

export function computeTotalCost(
  c: Criticality,
  machineDowntimeCostPerHour: number,
  technicianHourlyCost: number,
): number {
  return (
    (c.downtimeHours ?? 0) * machineDowntimeCostPerHour +
    (c.qualityLossCost ?? 0) +
    (c.secondaryDamageCost ?? 0) +
    (c.sparepartCost ?? 0) +
    (c.repairManHours ?? 0) * technicianHourlyCost
  );
}

// ── Flattened row for the table ────────────────────────────────────────────

export interface CritRow {
  // Cause
  causeId: string;
  causeCode: string;
  causeDescription: string;
  // Physical failure
  pfId: string;
  pfCode: string;
  pfDescription: string;
  // Functional failure
  ffCode: string;
  ffDescription: string;
  // Function
  functionCode: string;
  functionDescription: string;
  // Location
  systemName: string;
  assemblyName: string;
  mgCode: string;
  mgName: string;
  // Criticality data (null if not yet assessed)
  criticality: Criticality | null;
  // PM task (null if not yet defined)
  pmTask: PMTask | null;
  // Full cause ref for mutations
  cause: FailureCause;
}

export function flattenCauses(analysis: RcmAnalysis | undefined): CritRow[] {
  if (!analysis) return [];
  const rows: CritRow[] = [];

  for (const system of analysis.systems) {
    for (const assembly of system.assemblies) {
      for (const mg of assembly.materialGroups) {
        for (const pf of mg.physicalFailures) {
          const ff = pf.functionalFailure;
          const fn = ff.function;
          for (const cause of pf.causes) {
            rows.push({
              causeId: cause.id,
              causeCode: cause.code,
              causeDescription: cause.description,
              pfId: pf.id,
              pfCode: pf.code,
              pfDescription: pf.description,
              ffCode: ff.code,
              ffDescription: ff.description,
              functionCode: fn.code,
              functionDescription: fn.description,
              systemName: system.name,
              assemblyName: assembly.name,
              mgCode: mg.code,
              mgName: mg.name,
              criticality: cause.criticality,
              pmTask: cause.pmTask,
              cause,
            });
          }
        }
      }
    }
  }

  return rows;
}

// ── Criterion definitions ──────────────────────────────────────────────────

export interface CriterionDef {
  key: 'safety' | 'quality' | 'production' | 'frequency' | 'availability' | 'repairCost' | 'laborTime';
  label: string;
  shortLabel: string;
  group: 'consequence' | 'workload';
  descriptions: [string, string, string, string];
}

export const CRITERIA: CriterionDef[] = [
  {
    key: 'safety',
    label: 'Bezpieczeństwo',
    shortLabel: 'S',
    group: 'consequence',
    descriptions: [
      'Brak — uszkodzenie nie wpływa na bezpieczeństwo',
      'Niski — może spowodować drobne obrażenia bez wpływu na absencję w pracy',
      'Średni — może spowodować obrażenia powodujące tymczasową absencję w pracy',
      'Wysoki — może spowodować śmierć lub poważne obrażenia powodujące stałą absencję',
    ],
  },
  {
    key: 'quality',
    label: 'Jakość',
    shortLabel: 'Q',
    group: 'consequence',
    descriptions: [
      'Brak — brak wpływu na jakość',
      'Niski — braki poddane poprawkom lub ponownemu przetworzeniu',
      'Średni — może zablokować całą partię, wysoki poziom poprawek',
      'Wysoki — złomowanie partii lub reklamacja klienta',
    ],
  },
  {
    key: 'production',
    label: 'Produkcja',
    shortLabel: 'P',
    group: 'consequence',
    descriptions: [
      'Brak — brak wpływu na produkcję',
      'Niski — zatrzymanie procesu < 0,5h',
      'Średni — zatrzymanie procesu 0,5h – 5h',
      'Wysoki — zatrzymanie procesu > 5h',
    ],
  },
  {
    key: 'frequency',
    label: 'Częstotliwość (MTBF)',
    shortLabel: 'F',
    group: 'consequence',
    descriptions: [
      'Brak — MTBF = 0 (nie występuje)',
      'Niski — raz w roku lub rzadziej',
      'Średni — raz na dwa miesiące',
      'Wysoki — raz na miesiąc lub częściej',
    ],
  },
  {
    key: 'availability',
    label: 'Dostępność części',
    shortLabel: 'D',
    group: 'workload',
    descriptions: [
      'Brak — część łatwo dostępna, od ręki',
      'Niski — część dostępna z terminem do 4 tygodni',
      'Średni — część dostępna z terminem od 4 do 8 tygodni',
      'Wysoki — część trudnodostępna, powyżej 8 tygodni',
    ],
  },
  {
    key: 'repairCost',
    label: 'Koszty naprawy',
    shortLabel: 'C',
    group: 'workload',
    descriptions: [
      '< 1 000 PLN',
      '1 000 – 3 000 PLN',
      '3 000 – 5 000 PLN',
      '> 5 000 PLN',
    ],
  },
  {
    key: 'laborTime',
    label: 'Czas naprawy / Pracochłonność',
    shortLabel: 'L',
    group: 'workload',
    descriptions: [
      'Regulacja, 1 osoba, < 0,5 rbh',
      'Wymiana 1 komponentu, 1 osoba, 0,5 – 1,5 rbh',
      'Wymiana kilku komponentów, 1–2 osoby, 1,5 – 5 rbh',
      'Skomplikowana wymiana, > 5 rbh, min. 2 techników lub serwis',
    ],
  },
];
