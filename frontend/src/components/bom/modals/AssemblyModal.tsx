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
import type { Assembly } from '@/types';

const schema = z.object({
  number: z.string().min(1, 'Numer jest wymagany').max(20),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<Assembly>;
  suggestedNumber?: string;
  parentSystemNumber?: number;
}

export function AssemblyModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValues,
  suggestedNumber,
  parentSystemNumber,
}: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        number: defaultValues?.number ?? suggestedNumber ?? `${parentSystemNumber ?? 1}.1`,
        name: defaultValues?.name ?? '',
      });
    }
  }, [open, defaultValues, suggestedNumber, parentSystemNumber, reset]);

  const isEdit = Boolean(defaultValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj zespół' : 'Dodaj zespół'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="number">Numer zespołu (np. 1.1)</Label>
            <Input id="number" placeholder="1.1" {...register('number')} />
            {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Nazwa zespołu</Label>
            <Input id="name" placeholder="np. Skrzynia biegów" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
