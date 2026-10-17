import { useQuery } from '@tanstack/react-query';
import type { PatchSettingsInput, Settings } from '@campaign-ops/core';
import { api } from '../client';
import { qs, useApiMutation } from './core';

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings') });
export const useUtmPreview = (p: { source?: string; medium?: string; content?: string }) =>
  useQuery({ queryKey: ['utm-preview', p], queryFn: () => api.get<{ link: string }>(`/settings/utm-preview${qs(p)}`) });

export const usePatchSettings = () => useApiMutation((body: PatchSettingsInput) => api.patch<Settings>('/settings', body), { success: 'Settings saved' });
export const useResetDemo = () => useApiMutation(() => api.post<{ ok: true; seedVersion: string }>('/settings/reset-demo'), { success: 'Demo data reset to the seed' });
