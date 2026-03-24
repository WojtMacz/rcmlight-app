import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  FailureCause,
  FunctionDef,
  FunctionalFailure,
  PhysicalFailure,
  RcmAnalysis,
} from '@/types';

// ── Query keys ─────────────────────────────────────────────────────────────

export const rcmKeys = {
  functions: (machineId: string) => ['rcm', machineId, 'functions'] as const,
  ff: (functionId: string) => ['rcm', 'ff', functionId] as const,
  pf: (ffId: string) => ['rcm', 'pf', ffId] as const,
  causes: (pfId: string) => ['rcm', 'causes', pfId] as const,
  analysis: (machineId: string) => ['rcm', machineId, 'analysis'] as const,
};

// ── Queries ────────────────────────────────────────────────────────────────

export function useMachineFunctions(machineId: string) {
  return useQuery({
    queryKey: rcmKeys.functions(machineId),
    queryFn: async () => {
      const { data } = await api.get<{ data: { functions: FunctionDef[] } }>(
        `/machines/${machineId}/functions`,
      );
      return data.data.functions;
    },
    enabled: Boolean(machineId),
  });
}

export function useFunctionalFailures(functionId: string, enabled = true) {
  return useQuery({
    queryKey: rcmKeys.ff(functionId),
    queryFn: async () => {
      const { data } = await api.get<{ data: { failures: FunctionalFailure[] } }>(
        `/functions/${functionId}/functional-failures`,
      );
      return data.data.failures;
    },
    enabled: Boolean(functionId) && enabled,
  });
}

export function usePhysicalFailures(ffId: string, enabled = true) {
  return useQuery({
    queryKey: rcmKeys.pf(ffId),
    queryFn: async () => {
      const { data } = await api.get<{ data: { failures: PhysicalFailure[] } }>(
        `/functional-failures/${ffId}/physical-failures`,
      );
      return data.data.failures;
    },
    enabled: Boolean(ffId) && enabled,
  });
}

export function useCauses(pfId: string, enabled = true) {
  return useQuery({
    queryKey: rcmKeys.causes(pfId),
    queryFn: async () => {
      const { data } = await api.get<{ data: { causes: FailureCause[] } }>(
        `/physical-failures/${pfId}/causes`,
      );
      return data.data.causes;
    },
    enabled: Boolean(pfId) && enabled,
  });
}

export function useRcmAnalysis(machineId: string) {
  return useQuery({
    queryKey: rcmKeys.analysis(machineId),
    queryFn: async () => {
      const { data } = await api.get<{ data: { analysis: RcmAnalysis } }>(
        `/machines/${machineId}/rcm-analysis`,
      );
      return data.data.analysis;
    },
    enabled: Boolean(machineId),
  });
}

// ── Mutation helpers ───────────────────────────────────────────────────────

function useInvalidate(machineId: string) {
  const qc = useQueryClient();
  return {
    functions: () => qc.invalidateQueries({ queryKey: rcmKeys.functions(machineId) }),
    analysis: () => qc.invalidateQueries({ queryKey: rcmKeys.analysis(machineId) }),
    ff: (functionId: string) => qc.invalidateQueries({ queryKey: rcmKeys.ff(functionId) }),
    pf: (ffId: string) => qc.invalidateQueries({ queryKey: rcmKeys.pf(ffId) }),
    causes: (pfId: string) => qc.invalidateQueries({ queryKey: rcmKeys.causes(pfId) }),
  };
}

// ── Function mutations ─────────────────────────────────────────────────────

export function useCreateSystemFunction(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { systemId: string; data: { code: string; description: string; standard: string } }) =>
      api.post(`/systems/${p.systemId}/functions`, p.data),
    onSuccess: () => { toast.success('Funkcja dodana'); inv.functions(); inv.analysis(); },
    onError: () => toast.error('Błąd podczas dodawania funkcji'),
  });
}

export function useCreateAssemblyFunction(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { assemblyId: string; data: { code: string; description: string; standard: string } }) =>
      api.post(`/assemblies/${p.assemblyId}/functions`, p.data),
    onSuccess: () => { toast.success('Funkcja dodana'); inv.functions(); inv.analysis(); },
    onError: () => toast.error('Błąd podczas dodawania funkcji'),
  });
}

export function useUpdateFunction(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { functionId: string; data: Record<string, unknown> }) =>
      api.patch(`/functions/${p.functionId}`, p.data),
    onSuccess: () => { toast.success('Funkcja zaktualizowana'); inv.functions(); inv.analysis(); },
    onError: () => toast.error('Błąd podczas aktualizacji funkcji'),
  });
}

export function useDeleteFunction(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (functionId: string) => api.delete(`/functions/${functionId}?force=true`),
    onSuccess: () => { toast.success('Funkcja usunięta'); inv.functions(); inv.analysis(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania funkcji');
    },
  });
}

// ── FunctionalFailure mutations ────────────────────────────────────────────

export function useCreateFF(machineId: string, functionId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (data: { code: string; description: string }) =>
      api.post(`/functions/${functionId}/functional-failures`, data),
    onSuccess: () => {
      toast.success('Uszkodzenie funkcjonalne dodane');
      inv.ff(functionId);
      inv.functions();
      inv.analysis();
    },
    onError: () => toast.error('Błąd podczas dodawania uszkodzenia funkcjonalnego'),
  });
}

export function useUpdateFF(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { ffId: string; functionId: string; data: Record<string, unknown> }) =>
      api.patch(`/functional-failures/${p.ffId}`, p.data),
    onSuccess: (_, vars) => {
      toast.success('Uszkodzenie funkcjonalne zaktualizowane');
      inv.ff(vars.functionId);
      inv.analysis();
    },
    onError: () => toast.error('Błąd podczas aktualizacji'),
  });
}

export function useDeleteFF(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { ffId: string; functionId: string }) =>
      api.delete(`/functional-failures/${p.ffId}?force=true`),
    onSuccess: (_, vars) => {
      toast.success('Uszkodzenie funkcjonalne usunięte');
      inv.ff(vars.functionId);
      inv.functions();
      inv.analysis();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania');
    },
  });
}

// ── PhysicalFailure mutations ──────────────────────────────────────────────

export function useCreatePF(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: {
      ffId: string;
      data: { description: string; materialGroupId: string; mtbfMonths?: number };
    }) => api.post(`/functional-failures/${p.ffId}/physical-failures`, p.data),
    onSuccess: (_, vars) => {
      toast.success('Uszkodzenie fizyczne dodane');
      inv.pf(vars.ffId);
      inv.analysis();
    },
    onError: () => toast.error('Błąd podczas dodawania uszkodzenia fizycznego'),
  });
}

export function useUpdatePF(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { pfId: string; ffId: string; data: Record<string, unknown> }) =>
      api.patch(`/physical-failures/${p.pfId}`, p.data),
    onSuccess: (_, vars) => {
      toast.success('Uszkodzenie fizyczne zaktualizowane');
      inv.pf(vars.ffId);
      inv.analysis();
    },
    onError: () => toast.error('Błąd podczas aktualizacji'),
  });
}

export function useDeletePF(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { pfId: string; ffId: string }) =>
      api.delete(`/physical-failures/${p.pfId}?force=true`),
    onSuccess: (_, vars) => {
      toast.success('Uszkodzenie fizyczne usunięte');
      inv.pf(vars.ffId);
      inv.analysis();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania');
    },
  });
}

// ── Criticality mutation ───────────────────────────────────────────────────

export interface CriticalityPayload {
  safety: number;
  impact?: number; // legacy
  quality: number;
  production: number;
  frequency: number;
  availability: number;
  repairCost: number;
  laborTime: number;
  downtimeHours?: number | null;
  qualityLossCost?: number | null;
  secondaryDamageCost?: number | null;
  sparepartCost?: number | null;
  repairManHours?: number | null;
}

export function useUpsertCriticality(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { causeId: string; data: CriticalityPayload }) =>
      api.post(`/causes/${p.causeId}/criticality`, p.data),
    onSuccess: () => { toast.success('Ocena krytyczności zapisana'); inv.analysis(); },
    onError: () => toast.error('Błąd podczas zapisywania oceny krytyczności'),
  });
}

// ── PM Task mutations ──────────────────────────────────────────────────────

export interface PMTaskPayload {
  taskType: 'REDESIGN' | 'PDM' | 'PM_INSPECTION' | 'PM_OVERHAUL' | 'RTF';
  description: string;
  assignedTo?: string | null;
  isActive?: boolean;
  plannedDowntimeH?: number | null;
  sparepartCost?: number | null;
  repairManHours?: number | null;
  finalFrequencyMonths?: number | null;
}

export function useUpsertPMTask(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { causeId: string; data: PMTaskPayload }) =>
      api.post(`/causes/${p.causeId}/pm-task`, p.data),
    onSuccess: () => { toast.success('Zadanie PM zapisane'); inv.analysis(); },
    onError: () => toast.error('Błąd podczas zapisywania zadania PM'),
  });
}

export function useUpdatePMTask(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { pmTaskId: string; data: Partial<PMTaskPayload> }) =>
      api.patch(`/pm-tasks/${p.pmTaskId}`, p.data),
    onSuccess: () => { toast.success('Zadanie PM zaktualizowane'); inv.analysis(); },
    onError: () => toast.error('Błąd podczas aktualizacji zadania PM'),
  });
}

export function useDeletePMTask(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (pmTaskId: string) => api.delete(`/pm-tasks/${pmTaskId}`),
    onSuccess: () => { toast.success('Zadanie PM usunięte'); inv.analysis(); },
    onError: () => toast.error('Błąd podczas usuwania zadania PM'),
  });
}

// ── Cause mutations ────────────────────────────────────────────────────────

export function useCreateCause(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { pfId: string; data: { code: string; description: string } }) =>
      api.post(`/physical-failures/${p.pfId}/causes`, p.data),
    onSuccess: (_, vars) => {
      toast.success('Przyczyna dodana');
      inv.causes(vars.pfId);
      inv.analysis();
    },
    onError: () => toast.error('Błąd podczas dodawania przyczyny'),
  });
}

export function useUpdateCause(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { causeId: string; pfId: string; data: Record<string, unknown> }) =>
      api.patch(`/causes/${p.causeId}`, p.data),
    onSuccess: (_, vars) => {
      toast.success('Przyczyna zaktualizowana');
      inv.causes(vars.pfId);
      inv.analysis();
    },
    onError: () => toast.error('Błąd podczas aktualizacji przyczyny'),
  });
}

export function useDeleteCause(machineId: string) {
  const inv = useInvalidate(machineId);
  return useMutation({
    mutationFn: (p: { causeId: string; pfId: string }) =>
      api.delete(`/causes/${p.causeId}?force=true`),
    onSuccess: (_, vars) => {
      toast.success('Przyczyna usunięta');
      inv.causes(vars.pfId);
      inv.analysis();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania przyczyny');
    },
  });
}
