import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Machine, MachineStats, PaginatedResponse } from '@/types';

interface UseMachinesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function useMachines(options: UseMachinesOptions = {}) {
  const { page = 1, limit = 20, search } = options;

  return useQuery({
    queryKey: ['machines', { page, limit, search }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const { data } = await api.get<{ data: PaginatedResponse<Machine> }>(
        `/machines?${params}`,
      );
      return data.data;
    },
  });
}

export function useMachine(machineId: string) {
  return useQuery({
    queryKey: ['machines', machineId],
    queryFn: async () => {
      const { data } = await api.get<{ data: { machine: Machine } }>(
        `/machines/${machineId}`,
      );
      return data.data.machine;
    },
    enabled: Boolean(machineId),
  });
}

export function useMachineStats(machineId: string) {
  return useQuery({
    queryKey: ['machineStats', machineId],
    queryFn: async () => {
      const { data } = await api.get<{ data: MachineStats }>(`/machines/${machineId}/stats`);
      return data.data;
    },
    enabled: Boolean(machineId),
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (machineId: string) =>
      api.delete(`/machines/${machineId}?force=true`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}
