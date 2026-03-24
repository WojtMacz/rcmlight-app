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
import type { FunctionDef } from '@/types';

const schema = z.object({
  code: z.string().min(1, 'Kod jest wymagany').max(50),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
  standard: z.string().min(1, 'Standard jest wymagany').max(500),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<FunctionDef>;
  suggestedCode?: string;
  nodeLabel?: string;
}

export function FunctionModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValues,
  suggestedCode,
  nodeLabel,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        code: defaultValues?.code ?? suggestedCode ?? '',
        description: defaultValues?.description ?? '',
        standard: defaultValues?.standard ?? '',
      });
    }
  }, [open, defaultValues, suggestedCode, reset]);

  const isEdit = Boolean(defaultValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edytuj funkcję' : `Dodaj funkcję${nodeLabel ? ` — ${nodeLabel}` : ''}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="code">Kod funkcji</Label>
            <Input id="code" placeholder="np. 1.F1" {...register('code')} className="font-mono" />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Opis funkcji</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="np. Podawanie wykrojów do prasy z wydajnością..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="standard">Standard działania (kwantyfikator)</Label>
            <Textarea
              id="standard"
              rows={2}
              placeholder="np. Wydajność > 500 szt/h, ciśnienie 6±0.5 bar"
              {...register('standard')}
            />
            {errors.standard && (
              <p className="text-xs text-destructive">{errors.standard.message}</p>
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
