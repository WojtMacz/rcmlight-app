import { useEffect } from 'react';
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
import type { FailureCause } from '@/types';

const CAUSE_CATEGORIES = [
  { value: 'Zużycie naturalne', label: 'Zużycie naturalne' },
  { value: 'Uszkodzenie mechaniczne', label: 'Uszkodzenie mechaniczne' },
  { value: 'Błąd obsługi / operatora', label: 'Błąd obsługi / operatora' },
  { value: 'Błąd projektowy', label: 'Błąd projektowy' },
  { value: 'Nieprawidłowa konserwacja', label: 'Nieprawidłowa konserwacja' },
  { value: 'Zanieczyszczenie', label: 'Zanieczyszczenie' },
  { value: 'Przeciążenie', label: 'Przeciążenie' },
  { value: 'Korozja', label: 'Korozja' },
  { value: 'Błąd instalacji', label: 'Błąd instalacji' },
  { value: 'Inne', label: 'Inne' },
] as const;

const schema = z.object({
  code: z.string().min(1, 'Kod jest wymagany').max(100),
  category: z.string().min(1, 'Kategoria jest wymagana'),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { code: string; description: string }) => void;
  isPending: boolean;
  defaultValues?: Partial<FailureCause>;
  suggestedCode?: string;
  pfCode?: string;
}

export function CauseModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValues,
  suggestedCode,
  pfCode,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      const existingCategory = defaultValues?.description?.startsWith('[')
        ? (defaultValues.description.match(/^\[([^\]]+)\]/)?.[1] ?? '')
        : '';
      const existingDesc = existingCategory
        ? defaultValues?.description?.replace(/^\[[^\]]+\]\s*/, '') ?? ''
        : defaultValues?.description ?? '';

      reset({
        code: defaultValues?.code ?? suggestedCode ?? '',
        category: existingCategory,
        description: existingDesc,
      });
    }
  }, [open, defaultValues, suggestedCode, reset]);

  function handleSubmitWrapper(values: FormValues) {
    const fullDescription = values.category
      ? `[${values.category}] ${values.description}`
      : values.description;
    onSubmit({ code: values.code, description: fullDescription });
  }

  const isEdit = Boolean(defaultValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edytuj przyczynę' : `Dodaj przyczynę${pfCode ? ` — ${pfCode}` : ''}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleSubmitWrapper)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cause-code">Kod</Label>
            <Input id="cause-code" className="font-mono" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Kategoria przyczyny</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorię..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CAUSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cause-desc">Opis przyczyny</Label>
            <Textarea
              id="cause-desc"
              rows={3}
              placeholder="np. Niewystarczające smarowanie łożyska"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
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
