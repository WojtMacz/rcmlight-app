import { useState, useMemo, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DecisionWizard } from './DecisionWizard';
import { PmTaskForm } from './PmTaskForm';
import { TASK_TYPE_META, parseCauseDescription, type PmRow } from './pmUtils';
import type { PMTaskType } from '@/types';
import type { PMTaskPayload } from '@/hooks/useRcm';

// ── Types ──────────────────────────────────────────────────────────────────

type Mode = 'select-cause' | 'wizard' | 'form' | 'edit';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: PmRow[];
  /** When provided the cause selector step is skipped */
  initialCauseId?: string | null;
  mdcph: number;
  thc: number;
  allowedUnavailability: number;
  isPending: boolean;
  onSave: (causeId: string, data: PMTaskPayload) => void;
  onDelete?: (pmTaskId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function PMDecisionModal({
  open,
  onOpenChange,
  rows,
  initialCauseId,
  mdcph,
  thc,
  allowedUnavailability,
  isPending,
  onSave,
  onDelete,
}: Props) {
  const [causeId, setCauseId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('select-cause');
  const [selectedType, setSelectedType] = useState<PMTaskType | null>(null);

  // Reset state when modal opens/initialCauseId changes
  useEffect(() => {
    if (open) {
      if (initialCauseId) {
        setCauseId(initialCauseId);
        const r = rows.find((r) => r.causeId === initialCauseId);
        setMode(r?.pmTask ? 'edit' : 'wizard');
        setSelectedType(r?.pmTask?.taskType ?? null);
      } else {
        setCauseId(null);
        setMode('select-cause');
        setSelectedType(null);
      }
    }
  }, [open, initialCauseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const row = useMemo(() => rows.find((r) => r.causeId === causeId) ?? null, [rows, causeId]);

  function handleCauseSelect(id: string) {
    setCauseId(id);
    const r = rows.find((r) => r.causeId === id);
    if (r?.pmTask) {
      setMode('edit');
      setSelectedType(r.pmTask.taskType);
    } else {
      setMode('wizard');
      setSelectedType(null);
    }
  }

  function handleRecommendation(type: PMTaskType) {
    setSelectedType(type);
    setMode('form');
  }

  function handleDelete(pmTaskId: string) {
    onDelete?.(pmTaskId);
    onOpenChange(false);
  }

  const { text: causeText, category } = row
    ? parseCauseDescription(row.causeDescription)
    : { text: '', category: null };

  const title =
    mode === 'select-cause'
      ? 'Dodaj zadanie PM — wybierz przyczynę'
      : row
      ? `Zadanie PM — ${row.causeCode}`
      : 'Zadanie PM';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col p-0 gap-0" style={{ maxHeight: '88vh' }}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ── Step 0: Cause selector ── */}
          {mode === 'select-cause' && (
            <div className="p-6">
              <div className="space-y-2 max-w-md">
                <Label>Wybierz przyczynę uszkodzenia</Label>
                <Select onValueChange={handleCauseSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz przyczynę..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {rows.map((r) => {
                      const { text } = parseCauseDescription(r.causeDescription);
                      return (
                        <SelectItem key={r.causeId} value={r.causeId}>
                          <span className="font-mono text-xs text-muted-foreground mr-1.5">{r.causeCode}</span>
                          {text.length > 55 ? text.slice(0, 55) + '…' : text}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Context bar + content when cause is selected ── */}
          {row && (
            <>
              {/* Context bar */}
              <div className="px-6 py-2.5 border-b bg-secondary/20 shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="font-mono text-brand-orange">{row.functionCode}</span>
                  <span>·</span>
                  <span className="font-mono">{row.ffCode}</span>
                  <span>·</span>
                  <span className="font-mono">{row.pfCode}</span>
                  {row.wkf !== null && (
                    <span
                      className={`ml-auto font-semibold text-xs px-1.5 py-0.5 rounded ${
                        row.wkf < 1
                          ? 'bg-green-100 text-green-700'
                          : row.wkf < 2
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
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

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-6">
                {mode === 'edit' && row.pmTask ? (
                  <div className="space-y-4">
                    <div
                      className={`rounded-lg border p-4 ${TASK_TYPE_META[row.pmTask.taskType].bgColor} ${TASK_TYPE_META[row.pmTask.taskType].borderColor}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${TASK_TYPE_META[row.pmTask.taskType].color}`}>
                          {TASK_TYPE_META[row.pmTask.taskType].label}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={row.pmTask.isActive ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {row.pmTask.isActive ? 'Aktywne' : 'Nieaktywne'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={() => setMode('form')}
                          >
                            <Pencil className="h-3 w-3" /> Edytuj
                          </Button>
                          {onDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive gap-1"
                              onClick={() => handleDelete(row.pmTask!.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{row.pmTask.description}</p>
                      {row.pmTask.assignedTo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Wykonuje: {row.pmTask.assignedTo}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {row.pmTask.finalFrequencyMonths && (
                          <span>
                            Częstotliwość:{' '}
                            <strong>{row.pmTask.finalFrequencyMonths} mies.</strong>
                          </span>
                        )}
                        {row.pmTask.totalCostPM !== null && (
                          <span>
                            Koszt PM:{' '}
                            <strong>
                              {row.pmTask.totalCostPM.toLocaleString('pl-PL')} PLN
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMode('wizard');
                        setSelectedType(null);
                      }}
                    >
                      Wróć do kreatora
                    </Button>
                  </div>
                ) : mode === 'wizard' ? (
                  <DecisionWizard
                    autoAnswerStep1={row.wkf !== null ? row.wkf < 1 : null}
                    onRecommendation={handleRecommendation}
                    existingTaskType={row.pmTask?.taskType}
                  />
                ) : selectedType ? (
                  <PmTaskForm
                    taskType={selectedType}
                    defaultValues={row.pmTask ?? null}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
