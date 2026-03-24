import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import type { FunctionalFailure } from '@/types';

const SUGGESTIONS = [
  'Całkowita utrata funkcji',
  'Częściowa utrata funkcji (< 50% wydajności)',
  'Praca w złym kierunku / trybie',
  'Niestabilna praca z przerwami',
  'Przekroczenie parametrów powyżej normy',
];

const schema = z.object({
  code: z.string().min(1, 'Kod jest wymagany').max(50),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<FunctionalFailure>;
  suggestedCode?: string;
  functionCode?: string;
}

export function FunctionalFailureModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValues,
  suggestedCode,
  functionCode,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        code: defaultValues?.code ?? suggestedCode ?? '',
        description: defaultValues?.description ?? '',
      });
    }
  }, [open, defaultValues, suggestedCode, reset]);

  const isEdit = Boolean(defaultValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? 'Edytuj uszkodzenie funkcjonalne'
              : `Dodaj uszkodzenie funkcjonalne${functionCode ? ` — ${functionCode}` : ''}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="col-span-3 space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="ff-code">Kod</Label>
              <Input id="ff-code" className="font-mono" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ff-desc">Opis uszkodzenia funkcjonalnego</Label>
              <Textarea
                id="ff-desc"
                rows={4}
                placeholder="np. Brak podawania wykrojów do prasy"
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

          {/* Suggestions sidebar */}
          <div className="col-span-2 border-l pl-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Typowe uszkodzenia funkcjonalne
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValue('description', s)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
