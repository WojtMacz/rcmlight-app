import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CriticalityCriteria, CriteriaCategory, MaterialGroupTemplate } from '@/types';

// ── Query keys ─────────────────────────────────────────────────────────────

export const settingsKeys = {
  criteria: () => ['settings', 'criteria'] as const,
  templates: () => ['settings', 'material-group-templates'] as const,
};

// ── Criteria queries & mutations ────────────────────────────────────────────

export function useCriteriaCriteria() {
  return useQuery({
    queryKey: settingsKeys.criteria(),
    queryFn: async () => {
      const { data } = await api.get<{ data: { criteria: CriticalityCriteria[] } }>(
        '/settings/criticality-criteria',
      );
      return data.data.criteria;
    },
  });
}

export function useUpdateCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label, description }: { id: string; label: string; description: string }) => {
      const { data } = await api.patch<{ data: { criterion: CriticalityCriteria } }>(
        `/settings/criticality-criteria/${id}`,
        { label, description },
      );
      return data.data.criterion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.criteria() });
      toast.success('Kryterium zaktualizowane');
    },
    onError: () => toast.error('Błąd aktualizacji kryterium'),
  });
}

export function useResetCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (category?: CriteriaCategory) => {
      const { data } = await api.post<{ data: { criteria: CriticalityCriteria[] } }>(
        '/settings/criticality-criteria/reset',
        category ? { category } : {},
      );
      return data.data.criteria;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.criteria() });
      toast.success('Kryteria przywrócone do wartości domyślnych');
    },
    onError: () => toast.error('Błąd resetu kryteriów'),
  });
}

// ── Material group templates ────────────────────────────────────────────────

export function useMaterialGroupTemplates() {
  return useQuery({
    queryKey: settingsKeys.templates(),
    queryFn: async () => {
      const { data } = await api.get<{ data: { templates: MaterialGroupTemplate[] } }>(
        '/settings/material-groups-dictionary',
      );
      return data.data.templates;
    },
  });
}

export interface CreateTemplatePayload {
  code: string;
  name: string;
  category: string;
  categoryName: string;
  description?: string;
  inspectionStandards?: string;
  typicalCauses?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export function useCreateMaterialGroupTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data } = await api.post<{ data: { template: MaterialGroupTemplate } }>(
        '/settings/material-groups-dictionary',
        payload,
      );
      return data.data.template;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.templates() });
      toast.success('Szablon dodany');
    },
    onError: () => toast.error('Błąd dodawania szablonu'),
  });
}

export function useUpdateMaterialGroupTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateTemplatePayload> & { id: string }) => {
      const { data } = await api.patch<{ data: { template: MaterialGroupTemplate } }>(
        `/settings/material-groups-dictionary/${id}`,
        payload,
      );
      return data.data.template;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.templates() });
      toast.success('Szablon zaktualizowany');
    },
    onError: () => toast.error('Błąd aktualizacji szablonu'),
  });
}

export function useDeleteMaterialGroupTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/material-groups-dictionary/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.templates() });
      toast.success('Szablon usunięty');
    },
    onError: () => toast.error('Błąd usuwania szablonu'),
  });
}
