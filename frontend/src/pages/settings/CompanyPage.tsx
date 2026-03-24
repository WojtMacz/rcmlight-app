import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Company } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Min. 2 znaki').max(120),
  defaultDowntimeCostPerHour: z.coerce.number().nonnegative('Nie może być ujemna'),
  defaultTechnicianHourlyCost: z.coerce.number().nonnegative('Nie może być ujemna'),
  defaultAllowedUnavailability: z.coerce.number().min(0).max(1, 'Wartość 0–1 (np. 0.03 = 3%)'),
});
type FormData = z.infer<typeof schema>;

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange/50 ${className}`}
      {...props}
    />
  );
}

export default function CompanyPage() {
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const res = await api.get<{ data: { company: Company } }>('/company');
      return res.data.data.company;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      defaultDowntimeCostPerHour: 1000,
      defaultTechnicianHourlyCost: 80,
      defaultAllowedUnavailability: 0.03,
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        defaultDowntimeCostPerHour: data.defaultDowntimeCostPerHour,
        defaultTechnicianHourlyCost: data.defaultTechnicianHourlyCost,
        defaultAllowedUnavailability: data.defaultAllowedUnavailability,
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (d: FormData) => api.patch('/company', d),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia firmy</CardTitle>
          <CardDescription>
            Domyślne parametry ekonomiczne stosowane przy tworzeniu nowych maszyn.
            Każda maszyna może mieć własne wartości.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            <Field label="Nazwa firmy" error={errors.name?.message}>
              <Input {...register('name')} placeholder="Nazwa Sp. z o.o." />
            </Field>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3">Parametry ekonomiczne (domyślne)</p>
              <div className="space-y-4">
                <Field
                  label="Koszt postoju maszyny [PLN/h]"
                  hint="Koszty strat produkcyjnych w trakcie awarii"
                  error={errors.defaultDowntimeCostPerHour?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('defaultDowntimeCostPerHour')}
                    placeholder="1000"
                  />
                </Field>
                <Field
                  label="Stawka godzinowa technika [PLN/h]"
                  hint="Koszt rbh dla obliczenia pracochłonności napraw"
                  error={errors.defaultTechnicianHourlyCost?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('defaultTechnicianHourlyCost')}
                    placeholder="80"
                  />
                </Field>
                <Field
                  label="Dopuszczalna niedyspozycyjność [-]"
                  hint="Ułamek czasu postoju (np. 0.03 = 3%). Używane do wyliczenia częstotliwości PM."
                  error={errors.defaultAllowedUnavailability?.message}
                >
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    {...register('defaultAllowedUnavailability')}
                    placeholder="0.03"
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                size="sm"
                variant="orange"
                disabled={mutation.isPending}
                className="gap-1.5"
              >
                {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Zapisz ustawienia
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> Zapisano
                </span>
              )}
              {mutation.isError && (
                <span className="text-sm text-destructive">Błąd zapisu</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
