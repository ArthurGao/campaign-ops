import { useQuery } from '@tanstack/react-query';
import type { CreateLeadInput, Lead, MergeSuggestion, PatchLeadInput, ReconResponse } from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

export const useLeads = () => useQuery({ queryKey: ['leads'], queryFn: () => api.get<Lead[]>('/leads') });
export const useMergeSuggestions = () => useQuery({ queryKey: ['merge-suggestions'], queryFn: () => api.get<MergeSuggestion[]>('/leads/merge-suggestions') });
export const useRecon = (weeks = 3) => useQuery({ queryKey: ['recon', weeks], queryFn: () => api.get<ReconResponse>(`/reconciliation?weeks=${weeks}`) });

export const usePatchLead = () =>
  useApiMutation(({ id, ...body }: PatchLeadInput & { id: string }) => api.patch<Lead>(`/leads/${id}`, body), { success: (l) => `${l.id} saved` });
export const useMergeLead = () =>
  useApiMutation(({ id, intoId }: { id: string; intoId: string }) => api.post<Lead>(`/leads/${id}/merge`, { intoId }), { success: (l) => `Merged into ${l.id}` });
export const useCreateLead = () => useApiMutation((body: CreateLeadInput) => api.post<Lead>('/leads', body), { success: (l) => `${l.id} recorded` });

export const fetchExportCsv = () => api.get<string>('/leads/export', { text: true });
