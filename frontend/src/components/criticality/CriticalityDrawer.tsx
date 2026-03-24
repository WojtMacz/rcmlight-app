import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CriterionCard } from './CriterionCard';
import { WkChip } from './WkChip';
import { CRITERIA, computeWk, computeWp, computeWkf, computeTotalCost, type CritRow } from './criticalityUtils';
import type { CriticalityPayload } from '@/hooks/useRcm';

// ── Form schema ────────────────────────────────────────────────────────────

const ratingField = z.coerce.number().int().min(0).max(3);

const schema = z.object({
  safety: ratingField,
  quality: ratingField,
  production: ratingField,
  frequency: ratingField,
  availability: ratingField,
  repairCost: ratingField,
  laborTime: ratingField,
  downtimeHours: z.coerce.number().min(0).optional().or(z.literal('')),
  qualityLossCost: z.coerce.number().min(0).optional().or(z.literal('')),
  secondaryDamageCost: z.coerce.number().min(0).optional().or(z.literal('')),
  sparepartCost: z.coerce.number().min(0).optional().or(z.literal('')),
  repairManHours: z.coerce.number().min(0).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  row: CritRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (causeId: string, data: CriticalityPayload) => void;
  isPending: boolean;
  machineDowntimeCostPerHour: number;
  technicianHourlyCost: number;
}

// ── Live preview helpers ───────────────────────────────────────────────────

function usePreview(watch: () => FormValues) {
  const v = watch();
  const crit = {
    id: '',
    causeId: '',
    safety: v.safety ?? 0,
    impact: 0,
    quality: v.quality ?? 0,
    production: v.production ?? 0,
    frequency: v.frequency ?? 0,
    availability: v.availability ?? 0,
    repairCost: v.repairCost ?? 0,
    laborTime: v.laborTime ?? 0,
    downtimeHours: v.downtimeHours ? Number(v.downtimeHours) : null,
    qualityLossCost: v.qualityLossCost ? Number(v.qualityLossCost) : null,
    secondaryDamageCost: v.secondaryDamageCost ? Number(v.secondaryDamageCost) : null,
    sparepartCost: v.sparepartCost ? Number(v.sparepartCost) : null,
    repairManHours: v.repairManHours ? Number(v.repairManHours) : null,
  };
  return crit;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CriticalityDrawer({
  row,
  open,
  onOpenChange,
  onSave,
  isPending,
  machineDowntimeCostPerHour,
  technicianHourlyCost,
}: Props) {
  const [activeSection, setActiveSection] = useState<'consequence' | 'workload' | 'costs'>('consequence');

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      safety: 0, quality: 0, production: 0, frequency: 0, availability: 0,
      repairCost: 0, laborTime: 0,
      downtimeHours: '', qualityLossCost: '', secondaryDamageCost: '', sparepartCost: '', repairManHours: '',
    },
  });

  useEffect(() => {
    if (open && row) {
      const c = row.criticality;
      reset({
        safety: c?.safety ?? 0,
        quality: c?.quality ?? 0,
        production: c?.production ?? 0,
        frequency: c?.frequency ?? 0,
        availability: c?.availability ?? 0,
        repairCost: c?.repairCost ?? 0,
        laborTime: c?.laborTime ?? 0,
        downtimeHours: c?.downtimeHours ?? '',
        qualityLossCost: c?.qualityLossCost ?? '',
        secondaryDamageCost: c?.secondaryDamageCost ?? '',
        sparepartCost: c?.sparepartCost ?? '',
        repairManHours: c?.repairManHours ?? '',
      });
    }
  }, [open, row, reset]);

  const preview = usePreview(() => watch());
  const wk = computeWk(preview);
  const wp = computeWp(preview);
  const wkf = computeWkf(preview);
  const totalCost = computeTotalCost(preview, machineDowntimeCostPerHour, technicianHourlyCost);

  function handleSave(values: FormValues) {
    if (!row) return;
    onSave(row.causeId, {
      safety: values.safety,
      quality: values.quality,
      production: values.production,
      frequency: values.frequency,
      availability: values.availability,
      repairCost: values.repairCost,
      laborTime: values.laborTime,
      downtimeHours: values.downtimeHours !== '' ? Number(values.downtimeHours) : null,
      qualityLossCost: values.qualityLossCost !== '' ? Number(values.qualityLossCost) : null,
      secondaryDamageCost: values.secondaryDamageCost !== '' ? Number(values.secondaryDamageCost) : null,
      sparepartCost: values.sparepartCost !== '' ? Number(values.sparepartCost) : null,
      repairManHours: values.repairManHours !== '' ? Number(values.repairManHours) : null,
    });
  }

  if (!row) return null;

  const consequenceCriteria = CRITERIA.filter((c) => c.group === 'consequence');
  const workloadCriteria = CRITERIA.filter((c) => c.group === 'workload');

  const sectionTab = (id: typeof activeSection, label: string) => (
    <button
      type="button"
      onClick={() => setActiveSection(id)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        activeSection === id ? 'bg-brand-orange text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Ocena krytyczności" width="580px">
      <form onSubmit={handleSubmit(handleSave)} className="flex flex-col h-full">
        {/* Context */}
        <div className="px-5 py-3 border-b bg-secondary/20">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>
              <span className="font-mono text-brand-orange">{row.functionCode}</span>
              {' '}·{' '}
              <span className="font-mono">{row.ffCode}</span>
              {' '}·{' '}
              <span className="font-mono">{row.pfCode}</span>
            </div>
            <div className="text-foreground font-medium text-sm">{row.pfDescription}</div>
            <div className="text-muted-foreground">
              <span className="font-mono text-xs">{row.causeCode}</span>
              {' — '}
              {row.causeDescription}
            </div>
          </div>
        </div>

        {/* Live result bar */}
        <div className="px-5 py-2 border-b flex items-center gap-3 bg-background">
          <WkChip value={wk} label="WK" />
          <WkChip value={wp} label="WP" />
          <WkChip value={wkf} label="WK_F" size="md" />
          <span className="ml-auto text-xs text-muted-foreground">
            Koszt: <span className="font-semibold text-foreground">{totalCost.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</span>
          </span>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-5 py-2 border-b">
          {sectionTab('consequence', `Konsekwencje (WK=${wk.toFixed(1)})`)}
          {sectionTab('workload', `Pracochłonność (WP=${wp.toFixed(1)})`)}
          {sectionTab('costs', 'Składowe kosztów')}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {activeSection === 'consequence' && consequenceCriteria.map((criterion) => (
            <Controller
              key={criterion.key}
              control={control}
              name={criterion.key as keyof FormValues}
              render={({ field }) => (
                <CriterionCard
                  criterion={criterion}
                  value={field.value as number}
                  onChange={(v) => { field.onChange(v); setValue(criterion.key as keyof FormValues, v); }}
                />
              )}
            />
          ))}

          {activeSection === 'workload' && workloadCriteria.map((criterion) => (
            <Controller
              key={criterion.key}
              control={control}
              name={criterion.key as keyof FormValues}
              render={({ field }) => (
                <CriterionCard
                  criterion={criterion}
                  value={field.value as number}
                  onChange={(v) => { field.onChange(v); setValue(criterion.key as keyof FormValues, v); }}
                />
              )}
            />
          ))}

          {activeSection === 'costs' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Pola kosztowe są opcjonalne i służą do obliczenia całkowitego kosztu awarii.
                Stawki maszyny: {machineDowntimeCostPerHour.toLocaleString('pl-PL')} PLN/h (postój),{' '}
                {technicianHourlyCost.toLocaleString('pl-PL')} PLN/h (technik).
              </p>

              {([
                { name: 'downtimeHours', label: 'Czas postoju maszyny [h]' },
                { name: 'qualityLossCost', label: 'Koszty strat jakościowych [PLN]' },
                { name: 'secondaryDamageCost', label: 'Koszty szkód wtórnych [PLN]' },
                { name: 'sparepartCost', label: 'Koszty części zamiennych [PLN]' },
                { name: 'repairManHours', label: 'Czas naprawy — roboczogodziny [h]' },
              ] as const).map(({ name, label }) => (
                <div key={name} className="space-y-1">
                  <Label htmlFor={`crit-${name}`} className="text-sm">{label}</Label>
                  <Controller
                    control={control}
                    name={name as keyof FormValues}
                    render={({ field }) => (
                      <Input
                        id={`crit-${name}`}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="—"
                        value={field.value as string | number}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors[name as keyof typeof errors] && (
                    <p className="text-xs text-destructive">
                      {(errors[name as keyof typeof errors] as { message?: string })?.message}
                    </p>
                  )}
                </div>
              ))}

              {/* Computed cost breakdown */}
              <div className="rounded-lg border p-3 space-y-1.5 bg-secondary/20 text-xs">
                <p className="font-semibold mb-2">Podgląd kosztów</p>
                {(() => {
                  const dh = watch('downtimeHours');
                  const ql = watch('qualityLossCost');
                  const sd = watch('secondaryDamageCost');
                  const sp = watch('sparepartCost');
                  const rm = watch('repairManHours');
                  const downCost = (dh !== '' && dh != null ? Number(dh) : 0) * machineDowntimeCostPerHour;
                  const repairLaborCost = (rm !== '' && rm != null ? Number(rm) : 0) * technicianHourlyCost;
                  return (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Koszt postoju</span><span>{downCost.toLocaleString('pl-PL')} PLN</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Straty jakościowe</span><span>{(ql !== '' && ql != null ? Number(ql) : 0).toLocaleString('pl-PL')} PLN</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Szkody wtórne</span><span>{(sd !== '' && sd != null ? Number(sd) : 0).toLocaleString('pl-PL')} PLN</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Części zamienne</span><span>{(sp !== '' && sp != null ? Number(sp) : 0).toLocaleString('pl-PL')} PLN</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Robocizna</span><span>{repairLaborCost.toLocaleString('pl-PL')} PLN</span></div>
                      <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5">
                        <span>Łącznie</span>
                        <span>{totalCost.toLocaleString('pl-PL')} PLN</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0">
          {/* WK_F summary */}
          <div className="flex items-center gap-2">
            <WkChip value={wkf} label="WK_F" size="md" />
            <span className="text-xs text-muted-foreground">
              {wkf < 1 ? 'Niski priorytet' : wkf < 2 ? 'Średni priorytet' : 'Wysoki priorytet'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Zapisz ocenę
            </Button>
          </div>
        </div>
      </form>
    </Sheet>
  );
}
