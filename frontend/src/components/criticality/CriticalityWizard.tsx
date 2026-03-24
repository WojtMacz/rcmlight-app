import { useState, useEffect, Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CriterionCard } from './CriterionCard';
import { WkChip } from './WkChip';
import { CRITERIA, computeWk, computeWp, computeWkf, type CritRow } from './criticalityUtils';
import type { CriticalityPayload } from '@/hooks/useRcm';

// ── Types ──────────────────────────────────────────────────────────────────

interface WizardValues {
  safety: number;
  quality: number;
  production: number;
  frequency: number;
  availability: number;
  repairCost: number;
  laborTime: number;
}

function defaultValues(): WizardValues {
  return { safety: 0, quality: 0, production: 0, frequency: 0, availability: 0, repairCost: 0, laborTime: 0 };
}

// ── Step definitions ───────────────────────────────────────────────────────

const CRITERION_STEPS: Array<{
  icon: string;
  fields: Array<keyof WizardValues>;
}> = [
  { icon: '🔴', fields: ['safety'] },
  { icon: '🏭', fields: ['quality'] },
  { icon: '⚙️', fields: ['production'] },
  { icon: '📊', fields: ['frequency'] },
  { icon: '💰', fields: ['repairCost', 'laborTime', 'availability'] },
];

const TOTAL_STEPS = 6; // 5 criterion steps + 1 summary

// ── WK_F label ─────────────────────────────────────────────────────────────

function wkfBadge(v: number): { emoji: string; label: string; cls: string } {
  if (v < 1) return { emoji: '🟢', label: 'NISKI', cls: 'text-green-700 bg-green-50 border-green-200' };
  if (v < 2) return { emoji: '🟡', label: 'ŚREDNI', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { emoji: '🔴', label: 'WYSOKI', cls: 'text-red-700 bg-red-50 border-red-200' };
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  row: CritRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (causeId: string, data: CriticalityPayload) => void;
  isPending: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CriticalityWizard({ row, open, onOpenChange, onSave, isPending }: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(defaultValues());
  const [initialValues, setInitialValues] = useState<WizardValues>(defaultValues());
  const [justifications, setJustifications] = useState<string[]>(Array(6).fill(''));
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (open && row) {
      const init: WizardValues = row.criticality
        ? {
            safety: row.criticality.safety,
            quality: row.criticality.quality,
            production: row.criticality.production,
            frequency: row.criticality.frequency,
            availability: row.criticality.availability,
            repairCost: row.criticality.repairCost,
            laborTime: row.criticality.laborTime,
          }
        : defaultValues();
      setValues(init);
      setInitialValues(init);
      setJustifications(Array(6).fill(''));
      setStep(0);
    }
  }, [open, row]);

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValues) ||
    justifications.some((j) => j.trim());

  function handleTryClose() {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(false);
    }
  }

  function handleConfirmClose() {
    setShowExitConfirm(false);
    onOpenChange(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) handleTryClose();
    else onOpenChange(v);
  }

  function setField(field: keyof WizardValues, value: number) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function setJustification(stepIdx: number, text: string) {
    setJustifications((prev) => {
      const next = [...prev];
      next[stepIdx] = text;
      return next;
    });
  }

  function handleSave() {
    if (!row) return;
    onSave(row.causeId, {
      ...values,
      // Preserve existing cost fields
      downtimeHours: row.criticality?.downtimeHours ?? undefined,
      qualityLossCost: row.criticality?.qualityLossCost ?? undefined,
      secondaryDamageCost: row.criticality?.secondaryDamageCost ?? undefined,
      sparepartCost: row.criticality?.sparepartCost ?? undefined,
      repairManHours: row.criticality?.repairManHours ?? undefined,
    });
  }

  if (!row) return null;

  // Compute live indices
  const fakeCrit = {
    ...values,
    id: '',
    causeId: '',
    downtimeHours: null,
    qualityLossCost: null,
    secondaryDamageCost: null,
    sparepartCost: null,
    repairManHours: null,
  };
  const wk = computeWk(fakeCrit);
  const wp = computeWp(fakeCrit);
  const wkf = computeWkf(fakeCrit);
  const badge = wkfBadge(wkf);

  // Parse cause category
  const catMatch = row.causeDescription.match(/^\[([^\]]+)\]\s*(.*)/s);
  const causeText = catMatch ? catMatch[2] : row.causeDescription;
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;

  const isSummary = step === TOTAL_STEPS - 1;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0"
          onInteractOutside={(e) => { e.preventDefault(); handleTryClose(); }}
          onEscapeKeyDown={(e) => { e.preventDefault(); handleTryClose(); }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-base">Ocena krytyczności</DialogTitle>

            {/* Context */}
            <div className="space-y-0.5 text-xs mt-1">
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Przyczyna:</span>{' '}
                <span className="font-mono">{row.causeCode}</span> — {truncate(causeText, 70)}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Uszkodzenie:</span>{' '}
                {truncate(row.pfDescription, 40)} → {truncate(row.ffDescription, 40)}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Lokalizacja:</span>{' '}
                {row.systemName} › {row.assemblyName} › {row.mgCode}
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground shrink-0">
                Krok {step + 1} z {TOTAL_STEPS}
              </span>
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === step
                        ? 'w-4 bg-brand-navy'
                        : i < step
                        ? 'w-2 bg-brand-navy/50'
                        : 'w-2 bg-border'
                    }`}
                    aria-label={`Przejdź do kroku ${i + 1}`}
                  />
                ))}
              </div>
              {/* Live indices chip */}
              <div className="ml-auto flex items-center gap-2">
                <WkChip value={wk} label="WK" />
                <WkChip value={wp} label="WP" />
                <WkChip value={wkf} label="WK_F" size="md" />
              </div>
            </div>
          </DialogHeader>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
            {!isSummary ? (
              <>
                {/* Step icon + title */}
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CRITERION_STEPS[step].icon}</span>
                  <h3 className="text-sm font-semibold">
                    {CRITERIA.filter((c) =>
                      (CRITERION_STEPS[step].fields as string[]).includes(c.key),
                    ).map((c) => `${c.label} (${c.shortLabel})`).join(' + ')}
                  </h3>
                </div>

                {/* Criterion cards for this step (with separator between multiple) */}
                {(CRITERION_STEPS[step].fields as Array<keyof WizardValues>).map((field, idx) => {
                  const criterion = CRITERIA.find((c) => c.key === field)!;
                  return (
                    <Fragment key={field}>
                      {idx > 0 && <div className="border-t" />}
                      <CriterionCard
                        criterion={criterion}
                        value={values[field]}
                        onChange={(v) => setField(field, v)}
                      />
                    </Fragment>
                  );
                })}

                {/* Justification */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Uzasadnienie (opcjonalne)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Opisz dlaczego wybrałeś tę ocenę..."
                    value={justifications[step]}
                    onChange={(e) => setJustification(step, e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>
              </>
            ) : (
              /* ── Summary step ────────────────────────────────── */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <h3 className="text-sm font-semibold">Podsumowanie oceny krytyczności</h3>
                </div>

                {/* Indices table */}
                <div className="rounded-lg border overflow-hidden text-sm">
                  {/* Consequence */}
                  <div className="px-4 py-3 border-b">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Wskaźnik Konsekwencji
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['safety', 'quality', 'production', 'frequency'] as const).map((f) => {
                        const cr = CRITERIA.find((c) => c.key === f)!;
                        return (
                          <span key={f} className="text-sm">
                            <span className="font-mono text-muted-foreground text-xs">{cr.shortLabel}=</span>
                            <span className="font-bold">{values[f]}</span>
                          </span>
                        );
                      })}
                      <span className="text-muted-foreground ml-1">→</span>
                      <WkChip value={wk} label="WK" />
                    </div>
                  </div>

                  {/* Workload */}
                  <div className="px-4 py-3 border-b">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Wskaźnik Pracochłonności
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['repairCost', 'laborTime', 'availability'] as const).map((f) => {
                        const cr = CRITERIA.find((c) => c.key === f)!;
                        return (
                          <span key={f} className="text-sm">
                            <span className="font-mono text-muted-foreground text-xs">{cr.shortLabel}=</span>
                            <span className="font-bold">{values[f]}</span>
                          </span>
                        );
                      })}
                      <span className="text-muted-foreground ml-1">→</span>
                      <WkChip value={wp} label="WP" />
                    </div>
                  </div>

                  {/* Final */}
                  <div className={`px-4 py-3 ${badge.cls} border-0`}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">
                      Wskaźnik Krytyczności (WK_F)
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        avg(WK={wk.toFixed(2)}, WP={wp.toFixed(2)})
                      </span>
                      <span className="font-bold text-lg">{wkf.toFixed(2)}</span>
                      <span className="font-semibold">
                        {badge.emoji} {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Justifications */}
                {justifications.some((j) => j.trim()) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Uzasadnienia
                    </p>
                    {justifications.map((j, i) => {
                      if (!j.trim()) return null;
                      const fields = CRITERION_STEPS[i].fields;
                      const label = CRITERIA.filter((c) =>
                        (fields as string[]).includes(c.key),
                      )
                        .map((c) => c.shortLabel)
                        .join('+');
                      return (
                        <div key={i} className="text-xs">
                          <span className="font-mono font-bold text-brand-orange">{label}:</span>{' '}
                          <span className="text-muted-foreground">"{j.trim()}"</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <div className="px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Wstecz
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleTryClose}>
                Anuluj
              </Button>
              {isSummary ? (
                <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? 'Zapisywanie…' : 'Zapisz ocenę'}
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => setStep((s) => s + 1)}>
                  Dalej
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz anulować?</AlertDialogTitle>
            <AlertDialogDescription>
              Dane nie zostaną zapisane. Wszystkie wprowadzone oceny i uzasadnienia zostaną utracone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wróć do oceny</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Anuluj ocenę</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
