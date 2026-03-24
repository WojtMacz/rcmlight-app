import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, CheckCircle2, Circle, AlertCircle, Pencil, Trash2, Download, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DecisionWizard } from '@/components/pm/DecisionWizard';
import { PmTaskForm } from '@/components/pm/PmTaskForm';
import { PMDecisionModal } from '@/components/pm/PMDecisionModal';
import {
  flattenPmRows, parseCauseDescription, TASK_TYPE_META, type PmRow,
} from '@/components/pm/pmUtils';
import { useRcmAnalysis, useUpsertPMTask, useUpdatePMTask, useDeletePMTask } from '@/hooks/useRcm';
import type { PMTaskType } from '@/types';
import type { PMTaskPayload } from '@/hooks/useRcm';

// ── Tabs ───────────────────────────────────────────────────────────────────

type Tab = 'define' | 'list';

// ── Cause list item ────────────────────────────────────────────────────────

function CauseListItem({
  row,
  isSelected,
  onClick,
}: {
  row: PmRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { text, category } = parseCauseDescription(row.causeDescription);
  const hasPm = Boolean(row.pmTask);
  const meta = row.pmTask ? TASK_TYPE_META[row.pmTask.taskType] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors group ${
        isSelected
          ? 'bg-brand-navy text-white'
          : 'hover:bg-secondary'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          {hasPm ? (
            <CheckCircle2 className={`h-3.5 w-3.5 ${isSelected ? 'text-green-300' : 'text-green-500'}`} />
          ) : (
            <Circle className={`h-3.5 w-3.5 ${isSelected ? 'text-white/40' : 'text-muted-foreground/40'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-mono text-[10px] ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
              {row.causeCode}
            </span>
            {meta && (
              <span className={`text-[9px] font-bold px-1 rounded ${isSelected ? 'bg-white/20 text-white' : `${meta.bgColor} ${meta.color}`}`}>
                {meta.shortLabel}
              </span>
            )}
            {!row.pmTask && row.wkf !== null && row.wkf >= 2 && (
              <AlertCircle className={`h-3 w-3 ${isSelected ? 'text-red-300' : 'text-red-500'}`} />
            )}
          </div>
          {category && (
            <p className={`text-[10px] ${isSelected ? 'text-white/50' : 'text-muted-foreground/60'}`}>{category}</p>
          )}
          <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/90' : 'text-foreground'}`}>
            {text}
          </p>
          <p className={`text-[10px] truncate ${isSelected ? 'text-white/50' : 'text-muted-foreground'}`}>
            {row.pfCode} · {row.mgCode}
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Right panel — define mode ──────────────────────────────────────────────

type RightPanelMode = 'wizard' | 'form' | 'edit';

function DefinePanel({
  row,
  mdcph,
  thc,
  allowedUnavailability,
  onSave,
  onDelete,
  isPending,
}: {
  row: PmRow;
  mdcph: number;
  thc: number;
  allowedUnavailability: number;
  onSave: (causeId: string, data: PMTaskPayload) => void;
  onDelete: (pmTaskId: string) => void;
  isPending: boolean;
}) {
  const [mode, setMode] = useState<RightPanelMode>(row.pmTask ? 'edit' : 'wizard');
  const [selectedType, setSelectedType] = useState<PMTaskType | null>(
    row.pmTask?.taskType ?? null,
  );

  // Reset mode when row changes
  useMemo(() => {
    setMode(row.pmTask ? 'edit' : 'wizard');
    setSelectedType(row.pmTask?.taskType ?? null);
  }, [row.causeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto step 1: if WK_F is known, pre-answer
  const autoAnswerStep1 = row.wkf !== null ? row.wkf < 1 : null;

  function handleRecommendation(type: PMTaskType) {
    setSelectedType(type);
    setMode('form');
  }

  const { text: causeText, category } = parseCauseDescription(row.causeDescription);

  return (
    <div className="flex flex-col h-full">
      {/* Cause context bar */}
      <div className="px-4 py-2.5 border-b bg-secondary/20 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="font-mono text-brand-orange">{row.functionCode}</span>
          <span>·</span>
          <span className="font-mono">{row.ffCode}</span>
          <span>·</span>
          <span className="font-mono">{row.pfCode}</span>
          {row.wkf !== null && (
            <span className={`ml-auto font-semibold text-xs px-1.5 py-0.5 rounded ${
              row.wkf < 1 ? 'bg-green-100 text-green-700' :
              row.wkf < 2 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              WK_F {row.wkf.toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-sm font-medium mt-0.5 text-foreground">{row.pfDescription}</p>
        <p className="text-xs text-muted-foreground">
          {category && <span className="font-medium">[{category}]</span>}{' '}
          <span className="font-mono">{row.causeCode}</span> — {causeText}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'edit' && row.pmTask ? (
          <div className="space-y-4">
            {/* Current task summary */}
            <div className={`rounded-lg border p-4 ${TASK_TYPE_META[row.pmTask.taskType].bgColor} ${TASK_TYPE_META[row.pmTask.taskType].borderColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${TASK_TYPE_META[row.pmTask.taskType].color}`}>
                  {TASK_TYPE_META[row.pmTask.taskType].label}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={row.pmTask.isActive ? 'default' : 'secondary'} className="text-xs">
                    {row.pmTask.isActive ? 'Aktywne' : 'Nieaktywne'}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                    onClick={() => setMode('form')}>
                    <Pencil className="h-3 w-3" /> Edytuj
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs text-destructive hover:text-destructive gap-1"
                    onClick={() => row.pmTask && onDelete(row.pmTask.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-foreground">{row.pmTask.description}</p>
              {row.pmTask.assignedTo && (
                <p className="text-xs text-muted-foreground mt-1">Wykonuje: {row.pmTask.assignedTo}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                {row.pmTask.finalFrequencyMonths && (
                  <span>Częstotliwość: <strong>{row.pmTask.finalFrequencyMonths} mies.</strong></span>
                )}
                {row.pmTask.totalCostPM !== null && (
                  <span>Koszt PM: <strong>{row.pmTask.totalCostPM.toLocaleString('pl-PL')} PLN</strong></span>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => { setMode('wizard'); setSelectedType(null); }}>
              Wróć do kreatora
            </Button>
          </div>
        ) : mode === 'wizard' ? (
          <DecisionWizard
            autoAnswerStep1={autoAnswerStep1}
            onRecommendation={handleRecommendation}
            existingTaskType={row.pmTask?.taskType}
          />
        ) : selectedType ? (
          <PmTaskForm
            taskType={selectedType}
            defaultValues={mode === 'form' && row.pmTask ? row.pmTask : null}
            pfMtbfMonths={row.pfMtbfMonths}
            allowedUnavailability={allowedUnavailability}
            machineDowntimeCostPerHour={mdcph}
            technicianHourlyCost={thc}
            isPending={isPending}
            onSubmit={(data) => onSave(row.causeId, data)}
            onCancel={() => setMode(row.pmTask ? 'edit' : 'wizard')}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Table view ─────────────────────────────────────────────────────────────

function TasksTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: PmRow[];
  onEdit: (row: PmRow) => void;
  onDelete: (pmTaskId: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<PMTaskType | 'ALL'>('ALL');
  const [assignedFilter, setAssignedFilter] = useState('');

  const tasksOnly = rows.filter((r) => r.pmTask);

  const filtered = tasksOnly.filter((r) => {
    if (typeFilter !== 'ALL' && r.pmTask?.taskType !== typeFilter) return false;
    if (assignedFilter && !r.pmTask?.assignedTo?.toLowerCase().includes(assignedFilter.toLowerCase())) return false;
    return true;
  });

  function handleExport() {
    const headers = ['Lokalizacja', 'Kod przyczyny', 'Przyczyna', 'Typ', 'Opis', 'Branża', 'Częstotliwość [mies.]', 'Koszt PM [PLN]', 'Aktywne'];
    const csvRows = filtered.map((r) => {
      const t = r.pmTask!;
      return [
        `${r.systemName} / ${r.assemblyName} / ${r.mgCode}`,
        r.causeCode,
        `"${r.causeDescription.replace(/"/g, '""')}"`,
        t.taskType,
        `"${t.description.replace(/"/g, '""')}"`,
        t.assignedTo ?? '',
        t.finalFrequencyMonths ?? '',
        t.totalCostPM ?? '',
        t.isActive ? 'TAK' : 'NIE',
      ].join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zadania_pm.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-md border overflow-hidden text-xs">
          {(['ALL', 'RTF', 'REDESIGN', 'PDM', 'PM_INSPECTION', 'PM_OVERHAUL'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                typeFilter === t ? 'bg-brand-orange text-white' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t === 'ALL' ? 'Wszystkie' : TASK_TYPE_META[t].shortLabel}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Szukaj branży..."
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="border rounded px-2.5 py-1.5 text-xs w-40 bg-background focus:outline-none focus:ring-1 focus:ring-brand-orange"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} zadań z {tasksOnly.length}
        </span>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          {tasksOnly.length === 0
            ? 'Brak zdefiniowanych zadań PM. Przejdź do zakładki "Definicja zadań".'
            : 'Brak wyników spełniających wybrane filtry.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-secondary/40 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Lokalizacja</th>
                <th className="px-3 py-2 text-left font-semibold">Typ</th>
                <th className="px-3 py-2 text-left font-semibold">Opis</th>
                <th className="px-3 py-2 text-left font-semibold">Branża</th>
                <th className="px-3 py-2 text-center font-semibold">Częst. [mies.]</th>
                <th className="px-3 py-2 text-right font-semibold">Koszt PM</th>
                <th className="px-3 py-2 text-center font-semibold">Aktywne</th>
                <th className="px-3 py-2 text-center font-semibold">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const t = row.pmTask!;
                const meta = TASK_TYPE_META[t.taskType];
                return (
                  <tr key={row.causeId} className="border-b hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-xs">
                        <div className="font-medium">{row.systemName}</div>
                        <div className="text-muted-foreground">{row.assemblyName}</div>
                        <div className="font-mono text-[10px] text-brand-orange">{row.mgCode}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}>
                        {meta.shortLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top max-w-[200px]">
                      <p className="text-xs text-foreground line-clamp-2">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{row.causeCode}</p>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-muted-foreground">{t.assignedTo ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      <span className="text-xs tabular-nums">
                        {t.finalFrequencyMonths ? `${t.finalFrequencyMonths}` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      <span className="text-xs tabular-nums">
                        {t.totalCostPM !== null ? `${t.totalCostPM.toLocaleString('pl-PL')} PLN` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      <div className={`inline-block h-2 w-2 rounded-full ${t.isActive ? 'bg-green-500' : 'bg-secondary-foreground/30'}`} />
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                          onClick={() => onEdit(row)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs text-destructive hover:text-destructive gap-1"
                          onClick={() => onDelete(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PmTasksPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const id = machineId ?? '';

  const { data: analysis, isLoading } = useRcmAnalysis(id);
  const upsert = useUpsertPMTask(id);
  const update = useUpdatePMTask(id);
  const deletePm = useDeletePMTask(id);

  const [tab, setTab] = useState<Tab>('define');
  const [selectedCauseId, setSelectedCauseId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [listEditRow, setListEditRow] = useState<PmRow | null>(null);
  const [addPmOpen, setAddPmOpen] = useState(false);

  const rows = useMemo(() => flattenPmRows(analysis), [analysis]);
  const mdcph = analysis?.machineDowntimeCostPerHour ?? 0;
  const thc = analysis?.technicianHourlyCost ?? 0;
  const allowedUnavailability = analysis?.allowedUnavailability ?? 0;

  const selectedRow = rows.find((r) => r.causeId === selectedCauseId) ?? null;

  // Stats
  const total = rows.length;
  const defined = rows.filter((r) => r.pmTask).length;
  const highWkfNoPm = rows.filter((r) => !r.pmTask && r.wkf !== null && r.wkf >= 2).length;

  function handleSave(causeId: string, data: PMTaskPayload) {
    upsert.mutate({ causeId, data });
  }

  function handleDelete(pmTaskId: string) {
    setDeleteTarget(pmTaskId);
  }

  function handleEditFromList(row: PmRow) {
    setSelectedCauseId(row.causeId);
    setTab('define');
    setListEditRow(null);
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Przyczyn: <strong className="text-foreground">{total}</strong></span>
          <span>Zadań PM: <strong className="text-foreground">{defined}</strong></span>
          {highWkfNoPm > 0 && (
            <Badge className="text-xs bg-red-100 text-red-800 border border-red-300 hover:bg-red-100">
              {highWkfNoPm} pilnych
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
          onClick={() => setAddPmOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Dodaj zadanie PM
        </Button>

        {/* Tabs */}
        <div className="ml-auto flex rounded-md border overflow-hidden text-xs">
          {([
            { id: 'define', label: 'Definicja zadań' },
            { id: 'list', label: `Lista zadań PM (${defined})` },
          ] as { id: Tab; label: string }[]).map(({ id: tid, label }) => (
            <button
              key={tid}
              type="button"
              onClick={() => setTab(tid)}
              className={`px-4 py-2 transition-colors font-medium ${
                tab === tid ? 'bg-brand-orange text-white' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'define' ? (
        <div className="flex gap-0 border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
          {/* Left: Cause list */}
          <div className="w-64 shrink-0 border-r overflow-y-auto bg-background">
            <div className="px-3 py-2 border-b bg-secondary/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Przyczyny uszkodzeń
              </p>
            </div>
            <div className="p-2 space-y-0.5">
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 px-2">
                  Brak przyczyn. Dodaj przyczyny w kroku 3.
                </p>
              ) : (
                rows.map((row) => (
                  <CauseListItem
                    key={row.causeId}
                    row={row}
                    isSelected={row.causeId === selectedCauseId}
                    onClick={() => setSelectedCauseId(row.causeId)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Wizard / Form */}
          <div className="flex-1 overflow-hidden">
            {!selectedRow ? (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Wybierz przyczynę uszkodzenia z listy po lewej,</p>
                  <p className="text-sm">aby zdefiniować zadanie PM.</p>
                </div>
              </div>
            ) : (
              <DefinePanel
                key={selectedRow.causeId}
                row={selectedRow}
                mdcph={mdcph}
                thc={thc}
                allowedUnavailability={allowedUnavailability}
                onSave={handleSave}
                onDelete={handleDelete}
                isPending={upsert.isPending || update.isPending}
              />
            )}
          </div>
        </div>
      ) : (
        <TasksTable
          rows={rows}
          onEdit={handleEditFromList}
          onDelete={handleDelete}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń zadanie PM</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć to zadanie PM? Operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deletePm.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suppress unused var warning */}
      {listEditRow && null}

      {/* Add PM modal — cause selector + decision wizard */}
      <PMDecisionModal
        open={addPmOpen}
        onOpenChange={setAddPmOpen}
        rows={rows}
        mdcph={mdcph}
        thc={thc}
        allowedUnavailability={allowedUnavailability}
        isPending={upsert.isPending}
        onSave={(causeId, data) => {
          upsert.mutate({ causeId, data }, { onSuccess: () => setAddPmOpen(false) });
        }}
        onDelete={(pmTaskId) => deletePm.mutate(pmTaskId)}
      />
    </div>
  );
}
