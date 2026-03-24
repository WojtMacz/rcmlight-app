import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, ChevronRight, Cpu, Trash2 } from 'lucide-react';
import { useMachines, useDeleteMachine } from '@/hooks/useMachines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Machine } from '@/types';

function MachineCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/4 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

function MachineCard({
  machine,
  canDelete,
  onDeleteRequest,
}: {
  machine: Machine;
  canDelete: boolean;
  onDeleteRequest: (machine: Machine) => void;
}) {
  const navigate = useNavigate();
  // Placeholder progress — will be computed from RCM analysis in future prompt
  const completedSteps: number = 0;
  const totalSteps = 6;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  const formattedDate = new Date(machine.updatedAt).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug">{machine.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">Nr: {machine.number}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={completedSteps === totalSteps ? 'success' : 'secondary'}>
              {completedSteps}/{totalSteps}
            </Badge>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteRequest(machine); }}
                className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Usuń maszynę"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3">
        {machine.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{machine.location}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Akt. {formattedDate}</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Postęp analizy</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        <div className="mt-auto pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full group-hover:border-brand-navy/40 transition-colors"
            onClick={() => navigate(`/app/machines/${machine.id}`)}
          >
            Otwórz analizę
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useMachines({ search: search || undefined });
  const deleteMachine = useDeleteMachine();

  const machines = data?.items ?? [];
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ANALYST';
  const canDelete = user?.role === 'ADMIN';

  function handleConfirmDelete() {
    if (!machineToDelete) return;
    deleteMachine.mutate(machineToDelete.id, {
      onSuccess: () => {
        toast.success(`Maszyna "${machineToDelete.name}" została usunięta`);
        setMachineToDelete(null);
      },
      onError: () => {
        toast.error('Nie udało się usunąć maszyny. Spróbuj ponownie.');
        setMachineToDelete(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maszyny</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.pagination.total} ${data.pagination.total === 1 ? 'maszyna' : 'maszyn'} w systemie`
              : 'Ładowanie...'}
          </p>
        </div>
        {canEdit && (
          <Button variant="orange" onClick={() => navigate('/app/machines/new')}>
            <Plus className="h-4 w-4" />
            Nowa maszyna
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj maszyny..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MachineCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-destructive font-medium">Błąd ładowania maszyn</p>
          <p className="mt-1 text-sm text-muted-foreground">Sprawdź połączenie i odśwież stronę.</p>
        </div>
      ) : machines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Cpu className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-foreground">
            {search ? 'Brak wyników wyszukiwania' : 'Brak maszyn'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? `Nie znaleziono maszyn pasujących do "${search}".`
              : 'Dodaj pierwszą maszynę, aby rozpocząć analizę RCM.'}
          </p>
          {!search && canEdit && (
            <Button
              variant="orange"
              className="mt-6"
              onClick={() => navigate('/app/machines/new')}
            >
              <Plus className="h-4 w-4" />
              Dodaj maszynę
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              canDelete={canDelete}
              onDeleteRequest={setMachineToDelete}
            />
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!machineToDelete} onOpenChange={(open) => { if (!open) setMachineToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć maszynę?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Zamierzasz usunąć maszynę <strong className="text-foreground">{machineToDelete?.name}</strong>{' '}
                  (Nr: {machineToDelete?.number}).
                </p>
                <p>
                  Operacja jest <strong className="text-destructive">nieodwracalna</strong> i usunie całą
                  strukturę BOM oraz pełną analizę RCM — funkcje, uszkodzenia, krytyczność i zadania PM.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMachine.isPending}
            >
              {deleteMachine.isPending ? 'Usuwanie...' : 'Usuń maszynę'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
