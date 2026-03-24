import { QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minut
      retry: (failureCount, error) => {
        const axiosError = error as AxiosError<ApiError>;
        // Nie ponawiaj dla 4xx (poza 429)
        if (axiosError.response?.status && axiosError.response.status < 500 &&
            axiosError.response.status !== 429) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
