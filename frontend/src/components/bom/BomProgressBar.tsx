import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { MachineWithBOM } from '@/types';

interface Props {
  machine: MachineWithBOM;
}

export function BomProgressBar({ machine }: Props) {
  const systemCount = machine.systems.length;
  const assemblyCount = machine.systems.reduce((acc, s) => acc + s.assemblies.length, 0);
  const groupCount = machine.systems.reduce(
    (acc, s) => acc + s.assemblies.reduce((a, a2) => a + a2.materialGroups.length, 0),
    0,
  );
  const partCount = machine.systems.reduce(
    (acc, s) =>
      acc +
      s.assemblies.reduce(
        (a, a2) => a + a2.materialGroups.reduce((b, g) => b + g.spareParts.length, 0),
        0,
      ),
    0,
  );

  const isReady = systemCount >= 1 && assemblyCount >= 1;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-6">
        <StatBadge label="Systemy" value={systemCount} />
        <StatBadge label="Zespoły" value={assemblyCount} />
        <StatBadge label="Gr. materiałowe" value={groupCount} />
        <StatBadge label="Części zamienne" value={partCount} />

        <div className="ml-auto flex items-center gap-2">
          {isReady ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">Gotowy do analizy RCM</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Uzupełnij strukturę BOM</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
