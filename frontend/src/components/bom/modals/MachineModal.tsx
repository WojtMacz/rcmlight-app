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
import type { Machine } from '@/types';

const schema = z.object({
  number: z.string().min(1, 'Numer jest wymagany').max(50),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  description: z.string().max(1000).optional(),
  machineDowntimeCostPerHour: z.coerce.number().nonnegative().default(0),
  technicianHourlyCost: z.coerce.number().nonnegative().default(0),
  allowedUnavailability: z.coerce.number().min(0).max(100).default(3),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
  defaultValues?: Machine;
}

export function MachineModal({ open, onOpenChange, onSubmit, isPending, defaultValues }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open && defaultValues) {
      reset({
        number: defaultValues.number,
        name: defaultValues.name,
        description: defaultValues.description ?? '',
        machineDowntimeCostPerHour: defaultValues.machineDowntimeCostPerHour,
        technicianHourlyCost: defaultValues.technicianHourlyCost,
        // API stores as 0-1 fraction, UI shows as percentage
        allowedUnavailability: defaultValues.allowedUnavailability * 100,
      });
    }
  }, [open, defaultValues, reset]);

  function handleSubmitWrapper(values: FormValues) {
    // Convert back percentage → fraction
    onSubmit({ ...values, allowedUnavailability: values.allowedUnavailability / 100 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj maszynę</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleSubmitWrapper)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="number">Nr maszyny</Label>
              <Input id="number" placeholder="M-001" {...register('number')} />
              {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Nazwa maszyny</Label>
              <Input id="name" placeholder="Linia pakowania" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Opis</Label>
            <Textarea id="description" placeholder="Opcjonalny opis..." {...register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="downtime">Koszt postoju [zł/h]</Label>
              <Input
                id="downtime"
                type="number"
                min={0}
                step="0.01"
                {...register('machineDowntimeCostPerHour')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tech">Koszt rbh Technika [zł]</Label>
              <Input
                id="tech"
                type="number"
                min={0}
                step="0.01"
                {...register('technicianHourlyCost')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unavail">Dozwolona niedostępność [%]</Label>
              <Input
                id="unavail"
                type="number"
                min={0}
                max={100}
                step="0.1"
                {...register('allowedUnavailability')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" loading={isPending}>
              Zapisz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
