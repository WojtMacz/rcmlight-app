import type { PMTaskType, RcmAnalysis, PMTask, FailureCause } from '@/types';
import { computeWkf } from '@/components/criticality/criticalityUtils';

// ── Task type metadata ─────────────────────────────────────────────────────

export const TASK_TYPE_META: Record<PMTaskType, { label: string; shortLabel: string; color: string; bgColor: string; borderColor: string }> = {
  RTF: {
    label: 'Obsługa uszkodzeniowa (RTF)',
    shortLabel: 'RTF',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  REDESIGN: {
    label: 'Przeprojektowanie',
    shortLabel: 'REDESIGN',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
  },
  PDM: {
    label: 'Obsługa diagnostyczna (PdM)',
    shortLabel: 'PdM',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  PM_INSPECTION: {
    label: 'PM Inspekcja',
    shortLabel: 'Inspekcja',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
  PM_OVERHAUL: {
    label: 'PM Remont',
    shortLabel: 'Remont',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
  },
};

// ── Flattened PM row ───────────────────────────────────────────────────────

export interface PmRow {
  causeId: string;
  causeCode: string;
  causeDescription: string;
  pfId: string;
  pfCode: string;
  pfDescription: string;
  pfMtbfMonths: number | null;
  ffCode: string;
  ffDescription: string;
  functionCode: string;
  functionDescription: string;
  systemName: string;
  assemblyName: string;
  mgCode: string;
  mgName: string;
  wkf: number | null;
  pmTask: PMTask | null;
  cause: FailureCause;
}

export function flattenPmRows(analysis: RcmAnalysis | undefined): PmRow[] {
  if (!analysis) return [];
  const rows: PmRow[] = [];
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
              pfMtbfMonths: pf.mtbfMonths,
              ffCode: ff.code,
              ffDescription: ff.description,
              functionCode: fn.code,
              functionDescription: fn.description,
              systemName: system.name,
              assemblyName: assembly.name,
              mgCode: mg.code,
              mgName: mg.name,
              wkf: cause.criticality ? computeWkf(cause.criticality) : null,
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

// ── Decision tree ──────────────────────────────────────────────────────────

export interface WizardStep {
  id: number;
  question: string;
  hint: string;
  yesOutcome: number | { recommend: PMTaskType };
  noOutcome: number | { recommend: PMTaskType };
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    question: 'Czy ryzyko uszkodzenia jest akceptowalne?',
    hint: 'Ryzyko jest akceptowalne gdy wskaźnik krytyczności WK_F < 1,0. Oznacza to, że skutki awarii są niskie i nie uzasadniają działań prewencyjnych.',
    yesOutcome: { recommend: 'RTF' },
    noOutcome: 2,
  },
  {
    id: 2,
    question: 'Czy przeprojektowanie umożliwi obniżenie ryzyka do akceptowalnego poziomu?',
    hint: 'Oceń, czy modyfikacja konstrukcji, materiałów lub procesu może wyeliminować lub istotnie zredukować przyczynę uszkodzenia i jego skutki.',
    yesOutcome: 3,
    noOutcome: 4,
  },
  {
    id: 3,
    question: 'Czy przeprojektowanie jest ekonomicznie uzasadnione?',
    hint: 'Porównaj koszt wdrożenia modyfikacji z oczekiwanymi oszczędnościami (redukcja kosztów awarii, strat jakościowych, przestojów) w horyzoncie 3–5 lat.',
    yesOutcome: { recommend: 'REDESIGN' },
    noOutcome: 4,
  },
  {
    id: 4,
    question: 'Czy czas życia elementu jest przewidywalny? (znana krzywa awaryjności)',
    hint: 'Element wykazuje charakterystykę "zużycia" — awarie następują po określonym czasie eksploatacji. Znany jest MTBF lub krzywa Weibulla. Można określić optymalny interwał remontu.',
    yesOutcome: { recommend: 'PM_OVERHAUL' },
    noOutcome: 5,
  },
  {
    id: 5,
    question: 'Czy obsługa diagnostyczna (PdM) jest możliwa do zastosowania?',
    hint: 'Czy można monitorować stan elementu metodami: pomiar drgań, termowizja, analiza olejów, endoskopia, pomiar prądu silnika, analiza ultradźwiękowa lub inne? Czy degradacja jest wykrywalna zanim nastąpi awaria?',
    yesOutcome: 6,
    noOutcome: 7,
  },
  {
    id: 6,
    question: 'Czy obsługa diagnostyczna jest ekonomicznie uzasadniona?',
    hint: 'Koszt wdrożenia i prowadzenia diagnostyki (sprzęt, szkolenia, czas technika) powinien być niższy od kosztów awarii, które pozwoli uniknąć. Uwzględnij możliwość planowania przestojów.',
    yesOutcome: { recommend: 'PDM' },
    noOutcome: 7,
  },
  {
    id: 7,
    question: 'Czy inspekcja pozwoli wykryć uszkodzenie z odpowiednim wyprzedzeniem?',
    hint: 'Regularna inspekcja wizualna, sensoryczna lub prosta pomiarowa może wykryć oznaki zbliżającej się awarii. Czas między wykryciem a awarią musi być wystarczający na zaplanowanie naprawy.',
    yesOutcome: { recommend: 'PM_INSPECTION' },
    noOutcome: { recommend: 'RTF' },
  },
];

export type WizardOutcome = PMTaskType;

export function resolveNextStep(
  step: WizardStep,
  answer: boolean,
): number | { recommend: WizardOutcome } {
  return answer ? step.yesOutcome : step.noOutcome;
}

export function getStepById(id: number): WizardStep | undefined {
  return WIZARD_STEPS.find((s) => s.id === id);
}

// ── Cause description parsing ──────────────────────────────────────────────

export function parseCauseDescription(description: string): { category: string | null; text: string } {
  const match = description.match(/^\[([^\]]+)\]\s*(.*)/s);
  if (match) return { category: match[1], text: match[2] };
  return { category: null, text: description };
}

// ── Cost preview ───────────────────────────────────────────────────────────

export function computePmTotalCost(
  plannedDowntimeH: number,
  sparepartCost: number,
  repairManHours: number,
  mdcph: number,
  thc: number,
): number {
  return plannedDowntimeH * mdcph + sparepartCost + repairManHours * thc;
}

export function computeCalcFrequency(mtbfMonths: number | null, allowedUnavailability: number): number | null {
  if (!mtbfMonths) return null;
  return Math.round(2 * mtbfMonths * allowedUnavailability * 100) / 100;
}
