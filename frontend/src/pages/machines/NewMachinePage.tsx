import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ApiError, Machine } from '@/types';
import type { AxiosError } from 'axios';

const schema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  number: z.string().min(1, 'Numer jest wymagany').max(50),
  location: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  allowedUnavailability: z.coerce.number().min(0).max(1).default(0.1),
  machineDowntimeCostPerHour: z.coerce.number().nonnegative().default(1000),
  technicianHourlyCost: z.coerce.number().nonnegative().default(80),
});
type FormData = z.infer<typeof schema>;

export default function NewMachinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post<{ data: { machine: Machine } }>('/machines', data);
      return res.data.data.machine;
    },
    onSuccess: (machine) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Maszyna została dodana');
      navigate(`/app/machines/${machine.id}`);
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message ?? 'Nie udało się dodać maszyny');
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </Button>
        <h1 className="text-2xl font-bold">Nowa maszyna</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane maszyny</CardTitle>
          <CardDescription>Podstawowe informacje i parametry kosztowe do obliczeń RCM.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nazwa maszyny *</Label>
                <Input id="name" placeholder="np. Tokarka CNC" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="number">Numer / symbol *</Label>
                <Input id="number" placeholder="np. CNC-001" {...register('number')} />
                {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Lokalizacja</Label>
              <Input id="location" placeholder="np. Hala A, stanowisko 3" {...register('location')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Opis</Label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                placeholder="Krótki opis maszyny..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Parametry kosztowe</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="allowedUnavailability">Dopuszcz. niedostępność</Label>
                  <div className="relative">
                    <Input
                      id="allowedUnavailability"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      defaultValue={0.1}
                      {...register('allowedUnavailability')}
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      [0–1]
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="machineDowntimeCostPerHour">Koszt przestoju [zł/h]</Label>
                  <Input
                    id="machineDowntimeCostPerHour"
                    type="number"
                    min="0"
                    defaultValue={1000}
                    {...register('machineDowntimeCostPerHour')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="technicianHourlyCost">Koszt technika [zł/h]</Label>
                  <Input
                    id="technicianHourlyCost"
                    type="number"
                    min="0"
                    defaultValue={80}
                    {...register('technicianHourlyCost')}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Anuluj
              </Button>
              <Button type="submit" variant="orange" disabled={isPending}>
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Zapisywanie...</> : 'Utwórz maszynę'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
