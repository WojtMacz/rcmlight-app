import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { FunctionDef, FunctionalFailure, MachineWithBOM, PhysicalFailure, RcmAnalysis } from '@/types';

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  // code is auto-generated — not in the form
  description: z.string().min(1, 'Opis jest wymagany').max(500),
  functionId: z.string().optional().or(z.literal('')),
  ffId: z.string().min(1, 'Wybierz uszkodzenie funkcjonalne'),
  materialGroupId: z.string().min(1, 'Wybierz grupę materiałową'),
  mtbfMonths: z.coerce.number().positive().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ────────────────────────────────────────────────────────────────

// Flatten material groups from BOM, optionally filtered to one assembly
function flatMaterialGroups(machine: MachineWithBOM, filterAssemblyId?: string) {
  return machine.systems.flatMap((s) =>
    s.assemblies
      .filter((a) => !filterAssemblyId || a.id === filterAssemblyId)
      .flatMap((a) =>
        a.materialGroups.map((mg) => ({
          id: mg.id,
          label: `${mg.code} — ${mg.name}`,
        })),
      ),
  );
}

// Compute auto-generated code preview from current form selections
function computeCodePreview(
  mgId: string,
  ffId: string,
  machine: MachineWithBOM,
  ffByFunction: Record<string, FunctionalFailure[]>,
  analysis: RcmAnalysis | undefined,
): string | null {
  if (!mgId || !ffId) return null;

  // Find MG location in BOM hierarchy
  let mgCode = '';
  let asmNumber = '';
  let sysNumber = 0;

  outer: for (const sys of machine.systems) {
    for (const asm of sys.assemblies) {
      const mg = asm.materialGroups.find((m) => m.id === mgId);
      if (mg) {
        mgCode = mg.code;
        asmNumber = asm.number;
        sysNumber = sys.number;
        break outer;
      }
    }
  }

  if (!mgCode) return null;

  // Find FF code from loaded ffByFunction map
  let ffCode = '';
  for (const ffs of Object.values(ffByFunction)) {
    const ff = ffs.find((f) => f.id === ffId);
    if (ff) { ffCode = ff.code; break; }
  }

  if (!ffCode) return null;

  // Count existing PFs for this FF+MG combination from loaded analysis
  let pfCount = 0;
  if (analysis) {
    for (const sys of analysis.systems) {
      for (const asm of sys.assemblies) {
        for (const mg of asm.materialGroups) {
          for (const pf of mg.physicalFailures) {
            if (pf.functionalFailureId === ffId && pf.materialGroupId === mgId) {
              pfCount++;
            }
          }
        }
      }
    }
  }

  return `${sysNumber}.${asmNumber}.${mgCode}.${ffCode}.PF${pfCount + 1}`;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { ffId: string; description: string; materialGroupId: string; mtbfMonths?: number }) => void;
  isPending: boolean;
  defaultValues?: Partial<PhysicalFailure>;
  machine: MachineWithBOM;
  functions: FunctionDef[];
  ffByFunction: Record<string, FunctionalFailure[]>;
  onFunctionChange: (functionId: string) => void;
  preselectedMgId?: string;
  preselectedFfId?: string;
  filterAssemblyId?: string;
  analysis?: RcmAnalysis;
}

// ── Component ──────────────────────────────────────────────────────────────

export function PhysicalFailureModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValues,
  machine,
  functions,
  ffByFunction,
  onFunctionChange,
  preselectedMgId,
  preselectedFfId,
  filterAssemblyId,
  analysis,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedFunctionId = watch('functionId') ?? '';
  const watchedMgId = watch('materialGroupId') ?? '';
  const watchedFfId = watch('ffId') ?? '';

  const availableFFs = selectedFunctionId ? (ffByFunction[selectedFunctionId] ?? []) : [];
  const allMgs = flatMaterialGroups(machine, filterAssemblyId);

  const isEdit = Boolean(defaultValues?.id);

  // Live code preview: in edit mode show existing code, in create mode compute it
  const codePreview = useMemo(() => {
    if (isEdit) return defaultValues?.code ?? null;
    return computeCodePreview(watchedMgId, watchedFfId, machine, ffByFunction, analysis);
  }, [isEdit, watchedMgId, watchedFfId, machine, ffByFunction, analysis, defaultValues?.code]);

  useEffect(() => {
    if (open) {
      reset({
        description: defaultValues?.description ?? '',
        functionId: '',
        ffId: preselectedFfId ?? defaultValues?.functionalFailureId ?? '',
        materialGroupId: preselectedMgId ?? defaultValues?.materialGroupId ?? '',
        mtbfMonths: defaultValues?.mtbfMonths ?? '',
      });
    }
  }, [open, defaultValues, preselectedMgId, preselectedFfId, reset]);

  function handleSubmitWrapper(values: FormValues) {
    onSubmit({
      ffId: values.ffId,
      description: values.description,
      materialGroupId: values.materialGroupId,
      mtbfMonths: values.mtbfMonths ? Number(values.mtbfMonths) : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edytuj uszkodzenie fizyczne' : 'Dodaj opis uszkodzenia'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSubmitWrapper)} className="space-y-4">
          {/* 1. Grupa materiałowa */}
          <div className="space-y-1">
            <Label>Grupa materiałowa (element uszkodzony)</Label>
            <Controller
              control={control}
              name="materialGroupId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz grupę..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMgs.map((mg) => (
                      <SelectItem key={mg.id} value={mg.id}>
                        {mg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.materialGroupId && (
              <p className="text-xs text-destructive">{errors.materialGroupId.message}</p>
            )}
          </div>

          {/* 2. Opis uszkodzenia */}
          <div className="space-y-1">
            <Label htmlFor="pf-desc">Opis uszkodzenia</Label>
            <Textarea
              id="pf-desc"
              rows={2}
              placeholder="np. Zatarcie łożyska wejściowego, pęknięcie pierścienia..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* 3+4. Funkcja + Uszkodzenie funkcjonalne (only in create mode) */}
          {!isEdit && (
            <>
              <div className="space-y-1">
                <Label>Funkcja</Label>
                <Controller
                  control={control}
                  name="functionId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => {
                        field.onChange(v);
                        setValue('ffId', '');
                        onFunctionChange(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz funkcję..." />
                      </SelectTrigger>
                      <SelectContent>
                        {functions.map((fn) => (
                          <SelectItem key={fn.id} value={fn.id}>
                            <span className="font-mono mr-2 text-muted-foreground">{fn.code}</span>
                            {fn.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label>Uszkodzenie funkcjonalne</Label>
                <Controller
                  control={control}
                  name="ffId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedFunctionId || availableFFs.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz uszkodzenie..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFFs.map((ff) => (
                          <SelectItem key={ff.id} value={ff.id}>
                            <span className="font-mono mr-2 text-muted-foreground">{ff.code}</span>
                            {ff.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.ffId && <p className="text-xs text-destructive">{errors.ffId.message}</p>}
              </div>
            </>
          )}

          {/* 5. MTBF */}
          <div className="space-y-1">
            <Label htmlFor="mtbf">MTBF [miesiące] (opcjonalnie)</Label>
            <Input id="mtbf" type="number" min={0} step="0.1" {...register('mtbfMonths')} />
          </div>

          {/* 6. Kod — readonly preview */}
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Wygenerowany kod</Label>
            <div className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground select-all">
              {codePreview ?? (isEdit ? '—' : 'Wybierz grupę i uszkodzenie funkcjonalne…')}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
