import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TASK_TYPE_META, computePmTotalCost, computeCalcFrequency } from './pmUtils';
import type { PMTask, PMTaskType } from '@/types';
import type { PMTaskPayload } from '@/hooks/useRcm';

// ── Constants ──────────────────────────────────────────────────────────────

const ASSIGNED_TO_OPTIONS = [
  'Mechanik', 'Elektryk', 'Automatyk', 'Operator', 'Serwis zewnętrzny', 'Inne',
];

const PDM_METHODS = [
  'Pomiar drgań', 'Termowizja', 'Analiza olejów', 'Endoskopia',
  'Pomiar prądu silnika', 'Analiza ultradźwiękowa', 'Inne',
];

// ── Schema ─────────────────────────────────────────────────────────────────

const optNum = z.coerce.number().min(0).optional().or(z.literal(''));
const optPosInt = z.coerce.number().int().positive().optional().or(z.literal(''));

const schema = z.object({
  taskType: z.enum(['REDESIGN', 'PDM', 'PM_INSPECTION', 'PM_OVERHAUL', 'RTF']),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
  assignedTo: z.string().max(200).optional().or(z.literal('')),
  isActive: z.boolean(),
  plannedDowntimeH: optNum,
  sparepartCost: optNum,
  repairManHours: optNum,
  finalFrequencyMonths: optPosInt,
});

type FormValues = z.infer<typeof schema>;

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  taskType: PMTaskType;
  defaultValues?: PMTask | null;
  pfMtbfMonths: number | null;
  allowedUnavailability: number;
  machineDowntimeCostPerHour: number;
  technicianHourlyCost: number;
  isPending: boolean;
  onSubmit: (data: PMTaskPayload) => void;
  onCancel: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{children}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground font-mono">
        {value}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function PmTaskForm({
  taskType,
  defaultValues,
  pfMtbfMonths,
  allowedUnavailability,
  machineDowntimeCostPerHour,
  technicianHourlyCost,
  isPending,
  onSubmit,
  onCancel,
}: Props) {
  const meta = TASK_TYPE_META[taskType];
  const calcFreq = computeCalcFrequency(pfMtbfMonths, allowedUnavailability);

  const {
    register, handleSubmit, reset, control, watch,
    setValue, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      taskType,
      description: '',
      assignedTo: '',
      isActive: true,
      plannedDowntimeH: '',
      sparepartCost: '',
      repairManHours: '',
      finalFrequencyMonths: '',
    },
  });

  useEffect(() => {
    reset({
      taskType,
      description: defaultValues?.description ?? '',
      assignedTo: defaultValues?.assignedTo ?? '',
      isActive: defaultValues?.isActive ?? true,
      plannedDowntimeH: defaultValues?.plannedDowntimeH ?? '',
      sparepartCost: defaultValues?.sparepartCost ?? '',
      repairManHours: defaultValues?.repairManHours ?? '',
      finalFrequencyMonths: defaultValues?.finalFrequencyMonths ?? '',
    });
  }, [taskType, defaultValues, reset]);

  // Live cost preview
  const plannedDowntimeH = watch('plannedDowntimeH');
  const sparepartCostVal = watch('sparepartCost');
  const repairManHoursVal = watch('repairManHours');
  const isActive = watch('isActive');

  const totalCostPreview = useMemo(() => {
    return computePmTotalCost(
      plannedDowntimeH !== '' && plannedDowntimeH != null ? Number(plannedDowntimeH) : 0,
      sparepartCostVal !== '' && sparepartCostVal != null ? Number(sparepartCostVal) : 0,
      repairManHoursVal !== '' && repairManHoursVal != null ? Number(repairManHoursVal) : 0,
      machineDowntimeCostPerHour,
      technicianHourlyCost,
    );
  }, [plannedDowntimeH, sparepartCostVal, repairManHoursVal, machineDowntimeCostPerHour, technicianHourlyCost]);

  function handleFormSubmit(values: FormValues) {
    onSubmit({
      taskType: values.taskType,
      description: values.description,
      assignedTo: values.assignedTo || null,
      isActive: values.isActive,
      plannedDowntimeH: values.plannedDowntimeH !== '' && values.plannedDowntimeH != null ? Number(values.plannedDowntimeH) : null,
      sparepartCost: values.sparepartCost !== '' && values.sparepartCost != null ? Number(values.sparepartCost) : null,
      repairManHours: values.repairManHours !== '' && values.repairManHours != null ? Number(values.repairManHours) : null,
      finalFrequencyMonths: values.finalFrequencyMonths !== '' && values.finalFrequencyMonths != null ? Number(values.finalFrequencyMonths) : null,
    });
  }

  const needsFrequency = taskType === 'PM_INSPECTION' || taskType === 'PM_OVERHAUL' || taskType === 'PDM';
  const needsCosts = taskType === 'PM_INSPECTION' || taskType === 'PM_OVERHAUL';
  const hasAssignedTo = taskType !== 'RTF';
  const useAssignedSelect = taskType === 'PM_INSPECTION' || taskType === 'PM_OVERHAUL';

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Task type badge */}
      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}>
        {meta.shortLabel} — {meta.label}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="pm-desc">
          {taskType === 'RTF' && 'Opis działań awaryjnych'}
          {taskType === 'REDESIGN' && 'Opis proponowanej modyfikacji'}
          {taskType === 'PDM' && 'Opis zadania diagnostycznego'}
          {(taskType === 'PM_INSPECTION' || taskType === 'PM_OVERHAUL') && 'Opis zadania (co dokładnie robić)'}
        </Label>
        <Textarea
          id="pm-desc"
          rows={3}
          placeholder={
            taskType === 'RTF' ? 'np. Wymiana łożyska po wystąpieniu awarii, lista zasobów i czasy reakcji...' :
            taskType === 'REDESIGN' ? 'np. Zastąpienie łożyska ślizgowego łożyskiem tocznym klasy P5...' :
            taskType === 'PDM' ? 'np. Miesięczny pomiar drgań na wrzecionie, analiza widma FFT...' :
            'np. Sprawdzić luzy, dokręcić śruby mocujące, wymienić uszczelki...'
          }
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      {/* PDM method select */}
      {taskType === 'PDM' && (
        <div className="space-y-1">
          <Label>Metoda diagnostyczna</Label>
          <Controller
            control={control}
            name="assignedTo"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz metodę..." />
                </SelectTrigger>
                <SelectContent>
                  {PDM_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* AssignedTo */}
      {hasAssignedTo && taskType !== 'PDM' && (
        <div className="space-y-1">
          <Label htmlFor="pm-assigned">
            {taskType === 'REDESIGN' ? 'Odpowiedzialny' : 'Kto wykonuje (branża)'}
          </Label>
          {useAssignedSelect ? (
            <Controller
              control={control}
              name="assignedTo"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz branżę..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNED_TO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input id="pm-assigned" placeholder="np. Dział Utrzymania Ruchu" {...register('assignedTo')} />
          )}
        </div>
      )}

      {/* Frequency section */}
      {needsFrequency && (
        <>
          <SectionTitle>Częstotliwość</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {(taskType === 'PM_INSPECTION' || taskType === 'PM_OVERHAUL') && (
              <>
                <ReadonlyField
                  label="MTBF [miesiące]"
                  value={pfMtbfMonths !== null ? `${pfMtbfMonths} mies.` : 'brak danych'}
                />
                <ReadonlyField
                  label="Dozwolona niedostępność"
                  value={`${(allowedUnavailability * 100).toFixed(1)}%`}
                />
                <ReadonlyField
                  label="Wyliczona częstotliwość [mies.]"
                  value={calcFreq !== null ? `${calcFreq} mies.` : 'brak MTBF'}
                />
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="pm-freq">Zatwierdzona częstotliwość [mies.]</Label>
              <Input
                id="pm-freq"
                type="number"
                min={1}
                step={1}
                placeholder={calcFreq !== null ? String(Math.round(calcFreq)) : 'np. 6'}
                {...register('finalFrequencyMonths')}
              />
              {errors.finalFrequencyMonths && (
                <p className="text-xs text-destructive">{errors.finalFrequencyMonths.message}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Economic parameters for PM_INSPECTION / PM_OVERHAUL */}
      {needsCosts && (
        <>
          <SectionTitle>Parametry ekonomiczne</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pm-downtime">Planowany postój maszyny [h]</Label>
              <Input id="pm-downtime" type="number" min={0} step="0.5" placeholder="0" {...register('plannedDowntimeH')} />
              {plannedDowntimeH !== '' && plannedDowntimeH != null && (
                <p className="text-[10px] text-muted-foreground">
                  = {(Number(plannedDowntimeH) * machineDowntimeCostPerHour).toLocaleString('pl-PL')} PLN
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm-sparepart">Koszt części zamiennych [PLN]</Label>
              <Input id="pm-sparepart" type="number" min={0} step="1" placeholder="0" {...register('sparepartCost')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm-labor">Czas pracy technika [rbh]</Label>
              <Input id="pm-labor" type="number" min={0} step="0.5" placeholder="0" {...register('repairManHours')} />
              {repairManHoursVal !== '' && repairManHoursVal != null && (
                <p className="text-[10px] text-muted-foreground">
                  = {(Number(repairManHoursVal) * technicianHourlyCost).toLocaleString('pl-PL')} PLN
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Koszt PM [PLN]</Label>
              <div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm font-bold text-foreground">
                {totalCostPreview.toLocaleString('pl-PL')} PLN
              </div>
            </div>
          </div>
        </>
      )}

      {/* Active toggle */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setValue('isActive', !isActive)}
          className="flex items-center gap-2 text-sm"
        >
          {isActive
            ? <ToggleRight className="h-6 w-6 text-green-500" />
            : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
          <span className={isActive ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
            {isActive ? 'Aktywne' : 'Nieaktywne'}
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" size="sm" loading={isPending}>
          {defaultValues ? 'Zapisz zmiany' : 'Dodaj zadanie PM'}
        </Button>
      </div>
    </form>
  );
}
