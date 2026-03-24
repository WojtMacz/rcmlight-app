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
import type { BomSystem } from '@/types';

const schema = z.object({
  number: z.coerce.number().int().positive('Numer musi być dodatni'),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<BomSystem>;
  nextNumber?: number;
}

export function SystemModal({ open, onOpenChange, onSubmit, isPending, defaultValues, nextNumber }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        number: defaultValues?.number ?? nextNumber ?? 1,
        name: defaultValues?.name ?? '',
      });
    }
  }, [open, defaultValues, nextNumber, reset]);

  const isEdit = Boolean(defaultValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj system' : 'Dodaj system'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="number">Numer systemu</Label>
            <Input id="number" type="number" min={1} {...register('number')} />
            {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Nazwa systemu</Label>
            <Input id="name" placeholder="np. Układ napędowy" {...register('name')} />
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
