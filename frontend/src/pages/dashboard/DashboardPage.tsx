import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, ChevronRight, Cpu, Trash2 } from 'lucide-react';
import { useMachines, useDeleteMachine, useMachineStats } from '@/hooks/useMachines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Machine, MachineStats } from '@/types';

function MachineCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/4 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

function StatusDot({ stats }: { stats: MachineStats }) {
  if (stats.causesCount === 0) return null;

  let color = 'bg-green-500';
  let title = 'Analiza ukończona';

  if (stats.highCriticalityCount > 0 && stats.causesWithoutPmCount > 0) {
    color = 'bg-red-500';
    title = 'Wysokie WKF bez zadań PM';
  } else if (stats.causesWithoutPmCount > 0) {
    color = 'bg-orange-400';
    title = 'Przyczyny bez zadań PM';
  }

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color} shrink-0 mt-1`}
      title={title}
    />
  );
}

function StatTile({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-md px-2.5 py-2 text-center">
      <div className={`text-lg font-bold leading-tight ${valueClass ?? 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</div>
    </div>
  );
}

function MachineCardStats({ machineId }: { machineId: string }) {
  const { data: stats, isLoading } = useMachineStats(machineId);

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!stats) return null;

  const pctClass =
    stats.completionPercent === 100
      ? 'text-green-600'
      : stats.completionPercent >= 50
        ? 'text-orange-500'
        : 'text-destructive';

  return (
    <div className="space-y-2">
      {/* 3×2 stat grid */}
      <div className="grid grid-cols-3 gap-1.5">
        <StatTile label="Systemy" value={stats.systemsCount} />
        <StatTile label="Przyczyny" value={stats.causesCount} />
        <StatTile
          label="Wysokie WKF"
          value={stats.highCriticalityCount}
          valueClass={stats.highCriticalityCount > 0 ? 'text-destructive' : undefined}
        />
        <StatTile
          label="Bez PM"
          value={stats.causesWithoutPmCount}
          valueClass={stats.causesWithoutPmCount > 0 ? 'text-orange-500' : undefined}
        />
        <StatTile label="Zadania PM" value={stats.pmTasksCount} />
        <StatTile
          label="Ukończenie"
          value={`${stats.completionPercent}%`}
          valueClass={pctClass}
        />
      </div>

      {/* Alert badges */}
      {(stats.highCriticalityCount > 0 || stats.causesWithoutPmCount > 0 || stats.completionPercent === 100) && (
        <div className="flex flex-wrap gap-1">
          {stats.highCriticalityCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
              {stats.highCriticalityCount} wysokie WKF
            </span>
          )}
          {stats.causesWithoutPmCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
              {stats.causesWithoutPmCount} bez PM
            </span>
          )}
          {stats.completionPercent === 100 && stats.causesCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Analiza ukończona
            </span>
          )}
        </div>
      )}
    </div>
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
  const { data: stats } = useMachineStats(machine.id);

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
          <div className="flex items-center gap-1.5 shrink-0">
            {stats && <StatusDot stats={stats} />}
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
        {machine.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{machine.location}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3">
        <MachineCardStats machineId={machine.id} />

        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Akt. {formattedDate}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="group-hover:border-brand-navy/40 transition-colors"
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
