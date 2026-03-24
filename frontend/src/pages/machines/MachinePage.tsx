import { Navigate, NavLink, Outlet, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useMachine } from '@/hooks/useMachines';
import { ANALYSIS_STEPS, type AnalysisStep } from '@/types';
import { cn } from '@/lib/utils';

function AnalysisTabs({
  machineId,
  completedSteps,
}: {
  machineId: string;
  completedSteps: Set<AnalysisStep>;
}) {
  return (
    <div className="flex overflow-x-auto border-b">
      {ANALYSIS_STEPS.map((step, index) => {
        const done = completedSteps.has(step.key);
        return (
          <NavLink
            key={step.key}
            to={`/app/machines/${machineId}/${step.key}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )
            }
          >
            <span className="shrink-0">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Circle className="h-3.5 w-3.5 opacity-40" />
              )}
            </span>
            <span>
              {index + 1}. {step.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

export default function MachinePage() {
  const { machineId } = useParams<{ machineId: string }>();
  const { data: machine, isLoading, isError } = useMachine(machineId ?? '');

  // Placeholder — future prompts will calculate real completion
  const completedSteps = new Set<AnalysisStep>();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !machine) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Machine header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{machine.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nr: <span className="font-mono">{machine.number}</span>
          {machine.location && <> · Lokalizacja: {machine.location}</>}
        </p>
      </div>

      {/* Analysis step tabs */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <AnalysisTabs machineId={machine.id} completedSteps={completedSteps} />
        </div>
      </div>

      {/* Step content */}
      <Outlet context={{ machine }} />
    </div>
  );
}
