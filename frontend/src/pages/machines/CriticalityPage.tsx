import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, Pencil, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WkChip } from '@/components/criticality/WkChip';
import { CriticalityWizard } from '@/components/criticality/CriticalityWizard';
import { PMDecisionModal } from '@/components/pm/PMDecisionModal';
import {
  flattenCauses,
  computeWk,
  computeWp,
  computeWkf,
  computeTotalCost,
  type CritRow,
} from '@/components/criticality/criticalityUtils';
import { flattenPmRows, TASK_TYPE_META } from '@/components/pm/pmUtils';
import { useRcmAnalysis, useUpsertCriticality, useUpsertPMTask, useDeletePMTask, type CriticalityPayload, type PMTaskPayload } from '@/hooks/useRcm';

// ── Filter type ────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'unrated' | 'low' | 'medium' | 'high';

// ── Helpers ────────────────────────────────────────────────────────────────

function parseCauseCategory(description: string) {
  const match = description.match(/^\[([^\]]+)\]\s*(.*)/s);
  if (match) return { category: match[1], text: match[2] };
  return { category: null, text: description };
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
}

function sortRows(rows: CritRow[]): CritRow[] {
  return [...rows].sort((a, b) => {
    const priority = (r: CritRow) => {
      if (!r.criticality) return 1; // unrated = middle priority
      const wkf = computeWkf(r.criticality);
      if (wkf >= 2) return 0; // high = first
      if (wkf >= 1) return 2; // medium = after unrated
      return 3; // low = last
    };
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    // Within same group: sort by WK_F descending (unrated → keep original order)
    if (a.criticality && b.criticality) {
      return computeWkf(b.criticality) - computeWkf(a.criticality);
    }
    return 0;
  });
}

// ── Row component ──────────────────────────────────────────────────────────

function CritTableRow({
  row,
  onOpenWizard,
  onOpenPmModal,
  mdcph,
  thc,
}: {
  row: CritRow;
  onOpenWizard: () => void;
  onOpenPmModal: () => void;
  mdcph: number;
  thc: number;
}) {
  const c = row.criticality;
  const wk = c ? computeWk(c) : null;
  const wp = c ? computeWp(c) : null;
  const wkf = c ? computeWkf(c) : null;
  const totalCost = c ? computeTotalCost(c, mdcph, thc) : null;
  const { category, text } = parseCauseCategory(row.causeDescription);

  const numCell = (v: number | undefined | null) =>
    v != null ? (
      <span className="tabular-nums font-mono text-xs font-semibold">{v}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  return (
    <tr className="border-b hover:bg-secondary/20 transition-colors">
      {/* Location */}
      <td className="px-3 py-2.5 align-top">
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground">{row.systemName}</div>
          <div className="text-muted-foreground">{row.assemblyName}</div>
          <div className="font-mono text-[10px] text-brand-orange">{row.mgCode}</div>
        </div>
      </td>

      {/* Cause */}
      <td className="px-3 py-2.5 align-top max-w-[160px]">
        <div className="text-xs space-y-0.5">
          <div className="font-mono text-muted-foreground">{row.causeCode}</div>
          <div className="text-foreground line-clamp-2">{text}</div>
          <div className="text-[10px] text-muted-foreground">
            {row.pfCode} — {row.pfDescription.length > 35
              ? row.pfDescription.slice(0, 35) + '…'
              : row.pfDescription}
          </div>
        </div>
      </td>

      {/* Kategoria */}
      <td className="px-2 py-2.5 align-middle">
        {category ? (
          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 whitespace-nowrap">
            {category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>

      {/* S Q P F */}
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.safety)}</td>
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.quality)}</td>
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.production)}</td>
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.frequency)}</td>

      {/* WK */}
      <td className="px-2 py-2.5 align-middle text-center">
        <WkChip value={wk} />
      </td>

      {/* C L D */}
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.repairCost)}</td>
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.laborTime)}</td>
      <td className="px-2 py-2.5 align-middle text-center">{numCell(c?.availability)}</td>

      {/* WP */}
      <td className="px-2 py-2.5 align-middle text-center">
        <WkChip value={wp} />
      </td>

      {/* WK_F */}
      <td className="px-2 py-2.5 align-middle text-center">
        {wkf !== null ? (
          <WkChip value={wkf} size="md" />
        ) : (
          <span className="text-muted-foreground text-xs font-medium">❓ Brak</span>
        )}
      </td>

      {/* Cost */}
      <td className="px-2 py-2.5 align-middle text-right">
        {totalCost !== null && totalCost > 0 ? (
          <span className="text-xs tabular-nums">{fmtCurrency(totalCost)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-2 py-2.5 align-middle text-center">
        {c ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 gap-1"
            onClick={onOpenWizard}
          >
            <Pencil className="h-3 w-3" />
            Edytuj
          </Button>
        ) : (
          <Button
            size="sm"
            variant="default"
            className="h-6 text-xs px-2 gap-1 bg-brand-navy hover:bg-brand-navy/90"
            onClick={onOpenWizard}
          >
            <Plus className="h-3 w-3" />
            Oceń
          </Button>
        )}
      </td>

      {/* PM Task */}
      <td className="px-2 py-2.5 align-middle text-center">
        {row.pmTask ? (
          <button
            type="button"
            onClick={onOpenPmModal}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${TASK_TYPE_META[row.pmTask.taskType].bgColor} ${TASK_TYPE_META[row.pmTask.taskType].color} ${TASK_TYPE_META[row.pmTask.taskType].borderColor} hover:opacity-80 transition-opacity`}
          >
            {TASK_TYPE_META[row.pmTask.taskType].shortLabel}
          </button>
        ) : wkf !== null && wkf >= 2 ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 gap-0.5 border-red-400 text-red-600 hover:bg-red-50 animate-pulse"
            onClick={onOpenPmModal}
          >
            <AlertTriangle className="h-3 w-3" />
            Stwórz PM
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2 gap-0.5 text-muted-foreground"
            onClick={onOpenPmModal}
          >
            <Plus className="h-3 w-3" />
            Stwórz PM
          </Button>
        )}
      </td>
    </tr>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────

function StatsBar({ rows }: { rows: CritRow[] }) {
  const total = rows.length;
  const rated = rows.filter((r) => r.criticality).length;
  const high = rows.filter((r) => r.criticality && computeWkf(r.criticality) >= 2).length;
  const medium = rows.filter(
    (r) => r.criticality && computeWkf(r.criticality) >= 1 && computeWkf(r.criticality) < 2,
  ).length;
  const low = rows.filter((r) => r.criticality && computeWkf(r.criticality) < 1).length;
  const unrated = total - rated;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
      <span>
        Łącznie: <strong className="text-foreground">{total}</strong>
      </span>
      <span>
        Ocenionych: <strong className="text-foreground">{rated}</strong>
      </span>
      {unrated > 0 && (
        <Badge variant="secondary" className="text-xs">
          {unrated} bez oceny
        </Badge>
      )}
      {high > 0 && (
        <Badge className="text-xs bg-red-100 text-red-800 border border-red-300 hover:bg-red-100">
          🔴 {high} wysokich
        </Badge>
      )}
      {medium > 0 && (
        <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
          🟡 {medium} średnich
        </Badge>
      )}
      {low > 0 && (
        <Badge className="text-xs bg-green-100 text-green-800 border border-green-300 hover:bg-green-100">
          🟢 {low} niskich
        </Badge>
      )}
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  filter,
  onChange,
  rows,
}: {
  filter: FilterMode;
  onChange: (f: FilterMode) => void;
  rows: CritRow[];
}) {
  const unratedCount = rows.filter((r) => !r.criticality).length;

  const options: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'unrated', label: unratedCount > 0 ? `Bez oceny (${unratedCount})` : 'Bez oceny' },
    { id: 'low', label: '🟢 Niskie WK_F' },
    { id: 'medium', label: '🟡 Średnie WK_F' },
    { id: 'high', label: '🔴 Wysokie WK_F' },
  ];

  return (
    <div className="flex rounded-md border overflow-hidden text-xs">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
            filter === id
              ? 'bg-brand-navy text-white'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CriticalityPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const id = machineId ?? '';

  const { data: analysis, isLoading } = useRcmAnalysis(id);
  const upsert = useUpsertCriticality(id);
  const upsertPm = useUpsertPMTask(id);
  const deletePm = useDeletePMTask(id);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [wizardRow, setWizardRow] = useState<CritRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pmModalCauseId, setPmModalCauseId] = useState<string | null>(null);
  const [pmModalOpen, setPmModalOpen] = useState(false);

  const allRows = useMemo(() => flattenCauses(analysis), [analysis]);
  const pmRows = useMemo(() => flattenPmRows(analysis), [analysis]);

  const rows = useMemo(() => {
    let filtered = allRows;
    if (filter === 'unrated') filtered = allRows.filter((r) => !r.criticality);
    else if (filter === 'low')
      filtered = allRows.filter((r) => r.criticality && computeWkf(r.criticality) < 1);
    else if (filter === 'medium')
      filtered = allRows.filter(
        (r) => r.criticality && computeWkf(r.criticality) >= 1 && computeWkf(r.criticality) < 2,
      );
    else if (filter === 'high')
      filtered = allRows.filter((r) => r.criticality && computeWkf(r.criticality) >= 2);

    return sortRows(filtered);
  }, [allRows, filter]);

  const mdcph = analysis?.machineDowntimeCostPerHour ?? 0;
  const thc = analysis?.technicianHourlyCost ?? 0;

  function handleWizardSave(causeId: string, data: CriticalityPayload) {
    upsert.mutate({ causeId, data }, { onSuccess: () => setWizardOpen(false) });
  }

  function handlePmSave(causeId: string, data: PMTaskPayload) {
    upsertPm.mutate({ causeId, data }, { onSuccess: () => setPmModalOpen(false) });
  }

  function handlePmDelete(pmTaskId: string) {
    deletePm.mutate(pmTaskId);
  }

  const highRiskNoPm = allRows.filter(
    (r) => r.criticality && computeWkf(r.criticality) >= 2 && !r.pmTask,
  ).length;

  function handleExport() {
    if (!analysis) return;
    const headers = [
      'System', 'Zespół', 'Grupa', 'Kod przyczyny', 'Opis', 'Kategoria',
      'S', 'Q', 'P', 'F', 'WK', 'C', 'L', 'D', 'WP', 'WK_F', 'Koszt',
    ];
    const csvRows = allRows.map((r) => {
      const c = r.criticality;
      const { category } = parseCauseCategory(r.causeDescription);
      const wk = c ? computeWk(c).toFixed(2) : '';
      const wp = c ? computeWp(c).toFixed(2) : '';
      const wkf = c ? computeWkf(c).toFixed(2) : '';
      const cost = c ? computeTotalCost(c, mdcph, thc).toFixed(0) : '';
      return [
        r.systemName, r.assemblyName, `${r.mgCode} ${r.mgName}`,
        r.causeCode, `"${r.causeDescription.replace(/"/g, '""')}"`, category ?? '',
        c?.safety ?? '', c?.quality ?? '', c?.production ?? '', c?.frequency ?? '',
        wk, c?.repairCost ?? '', c?.laborTime ?? '', c?.availability ?? '', wp, wkf, cost,
      ].join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krytycznosc_${analysis.number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <StatsBar rows={allRows} />
        <div className="flex items-center gap-2 flex-wrap">
          <FilterBar filter={filter} onChange={setFilter} rows={allRows} />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* High-risk banner */}
      {highRiskNoPm > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{highRiskNoPm}</strong>{' '}
            {highRiskNoPm === 1
              ? 'przyczyna z wysokim ryzykiem (WK_F ≥ 2) wymaga określenia zadania PM.'
              : 'przyczyny z wysokim ryzykiem (WK_F ≥ 2) wymagają określenia zadania PM.'}
          </span>
        </div>
      )}

      {/* Sort label */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Sortuj:</span>
        <span className="font-medium text-foreground">WK_F ↓ (Wysokie → Bez oceny → Średnie → Niskie)</span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-sm">
            {filter === 'unrated'
              ? 'Wszystkie przyczyny mają już ocenę krytyczności.'
              : filter === 'high'
              ? 'Brak przyczyn z wysokim wskaźnikiem WK_F (≥ 2).'
              : filter === 'medium'
              ? 'Brak przyczyn ze średnim wskaźnikiem WK_F (1–2).'
              : filter === 'low'
              ? 'Brak przyczyn z niskim wskaźnikiem WK_F (< 1).'
              : 'Brak przyczyn uszkodzeń do oceny. Wróć do kroku 3 i dodaj przyczyny.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-secondary/40 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold w-28">Lokalizacja</th>
                <th className="px-3 py-2 text-left font-semibold w-40">Przyczyna</th>
                <th className="px-2 py-2 text-left font-semibold">Kategoria</th>
                <th className="px-2 py-2 text-center font-semibold">S</th>
                <th className="px-2 py-2 text-center font-semibold">Q</th>
                <th className="px-2 py-2 text-center font-semibold">P</th>
                <th className="px-2 py-2 text-center font-semibold">F</th>
                <th className="px-2 py-2 text-center font-semibold text-amber-700">WK</th>
                <th className="px-2 py-2 text-center font-semibold">C</th>
                <th className="px-2 py-2 text-center font-semibold">L</th>
                <th className="px-2 py-2 text-center font-semibold">D</th>
                <th className="px-2 py-2 text-center font-semibold text-amber-700">WP</th>
                <th className="px-2 py-2 text-center font-semibold text-brand-orange">WK_F</th>
                <th className="px-2 py-2 text-right font-semibold">Koszty</th>
                <th className="px-2 py-2 text-center font-semibold">Ocena</th>
                <th className="px-2 py-2 text-center font-semibold">Zadanie PM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CritTableRow
                  key={row.causeId}
                  row={row}
                  mdcph={mdcph}
                  thc={thc}
                  onOpenWizard={() => {
                    setWizardRow(row);
                    setWizardOpen(true);
                  }}
                  onOpenPmModal={() => {
                    setPmModalCauseId(row.causeId);
                    setPmModalOpen(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Criticality wizard */}
      <CriticalityWizard
        row={wizardRow}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSave={handleWizardSave}
        isPending={upsert.isPending}
      />

      {/* PM decision modal */}
      <PMDecisionModal
        open={pmModalOpen}
        onOpenChange={setPmModalOpen}
        rows={pmRows}
        initialCauseId={pmModalCauseId}
        mdcph={mdcph}
        thc={thc}
        allowedUnavailability={analysis.allowedUnavailability}
        isPending={upsertPm.isPending}
        onSave={handlePmSave}
        onDelete={handlePmDelete}
      />
    </div>
  );
}
