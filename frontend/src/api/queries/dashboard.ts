import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '@campaign-ops/core';
import { api } from '../client';

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardResponse>('/dashboard') });

export const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: () =>
      api.get<{ ok: boolean; seedVersion: string; now: string; mode?: string }>('/health'),
    refetchInterval: 30_000,
  });
