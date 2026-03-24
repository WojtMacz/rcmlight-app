import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MachineWithBOM } from '@/types';

// ── Query key factory ───────────────────────────────────────────────────────

export const bomKeys = {
  all: (machineId: string) => ['bom', machineId] as const,
};

// ── Fetch full BOM tree ─────────────────────────────────────────────────────

export function useMachineWithBOM(machineId: string) {
  return useQuery({
    queryKey: bomKeys.all(machineId),
    queryFn: async () => {
      const { data } = await api.get<{ data: { machine: MachineWithBOM } }>(
        `/machines/${machineId}`,
      );
      return data.data.machine;
    },
    enabled: Boolean(machineId),
  });
}

// ── Helper: invalidate BOM ──────────────────────────────────────────────────

function useInvalidateBom(machineId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: bomKeys.all(machineId) });
}

// ── Machine mutations ───────────────────────────────────────────────────────

export function useUpdateMachine(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/machines/${machineId}`, data),
    onSuccess: () => { toast.success('Maszyna zaktualizowana'); invalidate(); },
    onError: () => toast.error('Błąd podczas aktualizacji maszyny'),
  });
}

// ── System mutations ────────────────────────────────────────────────────────

export function useCreateSystem(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: (data: { number: number; name: string }) =>
      api.post(`/machines/${machineId}/systems`, data),
    onSuccess: () => { toast.success('System dodany'); invalidate(); },
    onError: () => toast.error('Błąd podczas dodawania systemu'),
  });
}

export function useUpdateSystem(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ systemId, data }: { systemId: string; data: Record<string, unknown> }) =>
      api.patch(`/systems/${systemId}`, data),
    onSuccess: () => { toast.success('System zaktualizowany'); invalidate(); },
    onError: () => toast.error('Błąd podczas aktualizacji systemu'),
  });
}

export function useDeleteSystem(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ systemId, force = false }: { systemId: string; force?: boolean }) =>
      api.delete(`/systems/${systemId}${force ? '?force=true' : ''}`),
    onSuccess: () => { toast.success('System usunięty'); invalidate(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania systemu');
    },
  });
}

export function useReorderSystems(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: (items: { id: string; number: number }[]) =>
      api.post('/systems/reorder', { items }),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Błąd podczas zmiany kolejności'),
  });
}

// ── Assembly mutations ──────────────────────────────────────────────────────

export function useCreateAssembly(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ systemId, data }: { systemId: string; data: { number: string; name: string } }) =>
      api.post(`/systems/${systemId}/assemblies`, data),
    onSuccess: () => { toast.success('Zespół dodany'); invalidate(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas dodawania zespołu');
    },
  });
}

export function useUpdateAssembly(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ assemblyId, data }: { assemblyId: string; data: Record<string, unknown> }) =>
      api.patch(`/assemblies/${assemblyId}`, data),
    onSuccess: () => { toast.success('Zespół zaktualizowany'); invalidate(); },
    onError: () => toast.error('Błąd podczas aktualizacji zespołu'),
  });
}

export function useDeleteAssembly(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ assemblyId, force = false }: { assemblyId: string; force?: boolean }) =>
      api.delete(`/assemblies/${assemblyId}${force ? '?force=true' : ''}`),
    onSuccess: () => { toast.success('Zespół usunięty'); invalidate(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania zespołu');
    },
  });
}

// ── MaterialGroup mutations ─────────────────────────────────────────────────

export function useCreateMaterialGroup(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({
      assemblyId,
      data,
    }: {
      assemblyId: string;
      data: { code: string; name: string; category: string };
    }) => api.post(`/assemblies/${assemblyId}/material-groups`, data),
    onSuccess: () => { toast.success('Grupa materiałowa dodana'); invalidate(); },
    onError: () => toast.error('Błąd podczas dodawania grupy materiałowej'),
  });
}

export function useUpdateMaterialGroup(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: Record<string, unknown> }) =>
      api.patch(`/material-groups/${groupId}`, data),
    onSuccess: () => { toast.success('Grupa materiałowa zaktualizowana'); invalidate(); },
    onError: () => toast.error('Błąd podczas aktualizacji grupy materiałowej'),
  });
}

export function useDeleteMaterialGroup(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ groupId, force = false }: { groupId: string; force?: boolean }) =>
      api.delete(`/material-groups/${groupId}${force ? '?force=true' : ''}`),
    onSuccess: () => { toast.success('Grupa materiałowa usunięta'); invalidate(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas usuwania grupy');
    },
  });
}

// ── SparePart mutations ─────────────────────────────────────────────────────

export function useCreateSparePart(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { name: string; catalogNumber?: string };
    }) => api.post(`/material-groups/${groupId}/spare-parts`, data),
    onSuccess: () => { toast.success('Część zamienna dodana'); invalidate(); },
    onError: () => toast.error('Błąd podczas dodawania części zamiennej'),
  });
}

export function useUpdateSparePart(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: Record<string, unknown> }) =>
      api.patch(`/spare-parts/${partId}`, data),
    onSuccess: () => { toast.success('Część zamienna zaktualizowana'); invalidate(); },
    onError: () => toast.error('Błąd podczas aktualizacji części zamiennej'),
  });
}

export function useDeleteSparePart(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: (partId: string) => api.delete(`/spare-parts/${partId}`),
    onSuccess: () => { toast.success('Część zamienna usunięta'); invalidate(); },
    onError: () => toast.error('Błąd podczas usuwania części zamiennej'),
  });
}

// ── Import BOM ──────────────────────────────────────────────────────────────

export function useImportBom(machineId: string) {
  const invalidate = useInvalidateBom(machineId);
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post<{ data: { systems: number; assemblies: number; materialGroups: number; spareParts: number } }>(
        `/machines/${machineId}/import-bom`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ),
    onSuccess: (res) => {
      const d = res.data.data;
      toast.success(
        `Zaimportowano: ${d.systems} systemów, ${d.assemblies} zespołów, ${d.materialGroups} grup, ${d.spareParts} części`,
      );
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas importu');
    },
  });
}
