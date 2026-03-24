import type { PMTaskType } from '@/types';
import { flattenPmRows, TASK_TYPE_META, computeCalcFrequency, type PmRow } from '@/components/pm/pmUtils';

// Re-export PmRow so consumers can import from summaryUtils
export type { PmRow };
import { computeWk, computeWp } from '@/components/criticality/criticalityUtils';

// ── Re-export ──────────────────────────────────────────────────────────────
export { flattenPmRows };

// ── Annual cost ────────────────────────────────────────────────────────────

export function annualCost(row: PmRow): number {
  const t = row.pmTask;
  if (!t || !t.isActive) return 0;
  const cost = t.totalCostPM ?? 0;
  const freq = t.finalFrequencyMonths;
  if (!freq) return 0;
  return cost * (12 / freq);
}

// ── KPI data ───────────────────────────────────────────────────────────────

export interface SummaryKpi {
  totalCauses: number;
  highCriticality: number;
  activePmTasks: number;
  totalAnnualCost: number;
  totalPmTasks: number;
  noCritAssessed: number;
  noPmDefined: number;
}

export function computeKpi(rows: PmRow[]): SummaryKpi {
  const totalCauses = rows.length;
  const highCriticality = rows.filter((r) => r.wkf !== null && r.wkf >= 2).length;
  const activePmTasks = rows.filter((r) => r.pmTask?.isActive).length;
  const totalAnnualCost = rows.reduce((s, r) => s + annualCost(r), 0);
  const totalPmTasks = rows.filter((r) => r.pmTask).length;
  const noCritAssessed = rows.filter((r) => !r.cause.criticality).length;
  const noPmDefined = rows.filter((r) => !r.pmTask).length;
  return { totalCauses, highCriticality, activePmTasks, totalAnnualCost, totalPmTasks, noCritAssessed, noPmDefined };
}

// ── Pie chart: task type distribution ─────────────────────────────────────

const PIE_COLORS: Record<PMTaskType, string> = {
  RTF: '#94a3b8',
  REDESIGN: '#a855f7',
  PDM: '#3b82f6',
  PM_INSPECTION: '#22c55e',
  PM_OVERHAUL: '#f97316',
};

export interface PieSlice {
  label: string;
  shortLabel: string;
  value: number;
  color: string;
}

export function computeTaskTypeDistribution(rows: PmRow[]): PieSlice[] {
  const counts: Record<PMTaskType, number> = {
    RTF: 0, REDESIGN: 0, PDM: 0, PM_INSPECTION: 0, PM_OVERHAUL: 0,
  };
  for (const row of rows) {
    if (row.pmTask) counts[row.pmTask.taskType]++;
  }
  return (Object.entries(counts) as [PMTaskType, number][])
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      label: TASK_TYPE_META[type].label,
      shortLabel: TASK_TYPE_META[type].shortLabel,
      value,
      color: PIE_COLORS[type],
    }));
}

// ── Bar chart: WK_F distribution ──────────────────────────────────────────

export interface BarSlice {
  label: string;
  value: number;
  color: string;
}

export function computeWkfDistribution(rows: PmRow[]): BarSlice[] {
  let low = 0, mid = 0, high = 0, none = 0;
  for (const row of rows) {
    if (row.wkf === null) { none++; continue; }
    if (row.wkf < 1) low++;
    else if (row.wkf < 2) mid++;
    else high++;
  }
  return [
    { label: 'Nieocenione', value: none, color: '#e2e8f0' },
    { label: 'Niskie\n(< 1)', value: low, color: '#86efac' },
    { label: 'Średnie\n(1–2)', value: mid, color: '#fbbf24' },
    { label: 'Wysokie\n(≥ 2)', value: high, color: '#f87171' },
  ].filter((b) => b.value > 0);
}

// ── Frequency grouping ─────────────────────────────────────────────────────

export type FreqBucket = '1' | '3' | '6' | '12' | '24+' | 'none';

export interface FreqGroup {
  bucket: FreqBucket;
  label: string;
  rows: PmRow[];
  totalCost: number;
  annualCost: number;
}

function freqBucket(months: number | null): FreqBucket {
  if (!months) return 'none';
  if (months <= 1) return '1';
  if (months <= 3) return '3';
  if (months <= 7) return '6';
  if (months <= 14) return '12';
  return '24+';
}

const FREQ_LABELS: Record<FreqBucket, string> = {
  '1': 'Miesięczne',
  '3': 'Co 3M',
  '6': 'Co 6M',
  '12': 'Co 12M',
  '24+': 'Co 24M+',
  'none': 'RTF / Redesign',
};

const FREQ_ORDER: FreqBucket[] = ['1', '3', '6', '12', '24+', 'none'];

export function computeFrequencyGroups(rows: PmRow[]): FreqGroup[] {
  const map = new Map<FreqBucket, PmRow[]>();
  for (const bucket of FREQ_ORDER) map.set(bucket, []);
  for (const row of rows) {
    if (!row.pmTask) continue;
    const bucket = freqBucket(row.pmTask.finalFrequencyMonths);
    map.get(bucket)!.push(row);
  }
  return FREQ_ORDER.filter((b) => (map.get(b)?.length ?? 0) > 0).map((bucket) => {
    const bRows = map.get(bucket)!;
    return {
      bucket,
      label: FREQ_LABELS[bucket],
      rows: bRows,
      totalCost: bRows.reduce((s, r) => s + (r.pmTask?.totalCostPM ?? 0), 0),
      annualCost: bRows.reduce((s, r) => s + annualCost(r), 0),
    };
  });
}

// ── Branch grouping ────────────────────────────────────────────────────────

export interface BranchGroup {
  branch: string;
  rows: PmRow[];
  totalAnnualCost: number;
  totalRepairManHours: number; // annual
}

export function computeBranchGroups(rows: PmRow[]): BranchGroup[] {
  const map = new Map<string, PmRow[]>();
  for (const row of rows) {
    if (!row.pmTask) continue;
    const branch = row.pmTask.assignedTo ?? 'Nieprzypisano';
    if (!map.has(branch)) map.set(branch, []);
    map.get(branch)!.push(row);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pl'))
    .map(([branch, bRows]) => ({
      branch,
      rows: bRows,
      totalAnnualCost: bRows.reduce((s, r) => s + annualCost(r), 0),
      totalRepairManHours: bRows.reduce((s, r) => {
        const rmh = r.pmTask?.repairManHours ?? 0;
        const freq = r.pmTask?.finalFrequencyMonths ?? 0;
        return s + (freq > 0 ? rmh * (12 / freq) : 0);
      }, 0),
    }));
}

// ── Heat map data ──────────────────────────────────────────────────────────

export interface HeatCell {
  wk: number; // 0-3 (rounded)
  wp: number; // 0-3 (rounded)
  count: number;
  rows: PmRow[];
}

export function computeHeatMap(rows: PmRow[]): HeatCell[][] {
  // 4×4 grid: wk 0-3, wp 0-3
  const grid: HeatCell[][] = Array.from({ length: 4 }, (_, wp) =>
    Array.from({ length: 4 }, (_, wk) => ({ wk, wp, count: 0, rows: [] })),
  );
  for (const row of rows) {
    const c = row.cause.criticality;
    if (!c) continue;
    const wk = Math.min(3, Math.round(computeWk(c)));
    const wp = Math.min(3, Math.round(computeWp(c)));
    grid[wp][wk].count++;
    grid[wp][wk].rows.push(row);
  }
  return grid;
}

// ── Calendar data ──────────────────────────────────────────────────────────

export interface CalendarTask {
  label: string;
  typeShort: string;
  typeColor: string;
  months: boolean[]; // 12 months
  costPerOccurrence: number;
}

export interface MonthSummary {
  monthIdx: number; // 0-11
  taskCount: number;
  totalCost: number;
}

export interface CalendarData {
  tasks: CalendarTask[];
  monthSummaries: MonthSummary[];
}

export function computeCalendar(rows: PmRow[], allowedUnavailability: number): CalendarData {
  const tasks: CalendarTask[] = [];

  for (const row of rows) {
    const t = row.pmTask;
    if (!t || !t.isActive) continue;
    const freq = t.finalFrequencyMonths ?? computeCalcFrequency(row.pfMtbfMonths, allowedUnavailability);
    if (!freq) continue;

    const months = Array(12).fill(false) as boolean[];
    for (let m = 0; m < 12; m++) {
      if (m % Math.round(freq) === 0) months[m] = true;
    }

    const meta = TASK_TYPE_META[t.taskType];
    tasks.push({
      label: `${row.causeCode} — ${t.description.substring(0, 40)}${t.description.length > 40 ? '…' : ''}`,
      typeShort: meta.shortLabel,
      typeColor: PIE_COLORS[t.taskType],
      months,
      costPerOccurrence: t.totalCostPM ?? 0,
    });
  }

  const monthSummaries: MonthSummary[] = Array.from({ length: 12 }, (_, m) => ({
    monthIdx: m,
    taskCount: tasks.filter((t) => t.months[m]).length,
    totalCost: tasks.reduce((s, t) => s + (t.months[m] ? t.costPerOccurrence : 0), 0),
  }));

  return { tasks, monthSummaries };
}

