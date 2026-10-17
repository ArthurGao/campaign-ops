import { useQuery } from '@tanstack/react-query';
import type { ConfirmFactInput, CreateFactInput, FactEntry, FactPage, FactSheetVersion, FactUsages, FactView, PatchFactInput } from '@campaign-ops/core';
import { api } from '../client';
import { qs, useApiMutation } from './core';

export type FactList = { version: string; entries: FactView[] };

export const useFacts = (page?: FactPage) => useQuery({ queryKey: ['facts', page ?? 'all'], queryFn: () => api.get<FactList>(`/fact-sheet${qs({ page })}`) });
export const useFactVersions = () => useQuery({ queryKey: ['fact-versions'], queryFn: () => api.get<FactSheetVersion[]>('/fact-sheet/versions') });
export const useFactUsages = (id?: string) =>
  useQuery({ queryKey: ['fact-usages', id], queryFn: () => api.get<FactUsages>(`/fact-sheet/${id}/usages`), enabled: !!id });

export const useConfirmFact = () =>
  useApiMutation(({ id, ...body }: ConfirmFactInput & { id: string }) => api.post<FactEntry>(`/fact-sheet/${id}/confirm`, body), {
    success: (f) => `${f.id} confirmed — fact sheet version bumped`,
  });
export const useRejectFact = () =>
  useApiMutation(({ id, note }: { id: string; note: string }) => api.post<FactEntry>(`/fact-sheet/${id}/reject`, { note }), { success: (f) => `${f.id} rejected` });
export const useCreateFact = () => useApiMutation((body: CreateFactInput) => api.post<FactEntry>('/fact-sheet', body), { success: (f) => `${f.id} added as pending` });
export const usePatchFact = () =>
  useApiMutation(({ id, ...body }: PatchFactInput & { id: string }) => api.patch<FactEntry>(`/fact-sheet/${id}`, body), { success: (f) => `${f.id} updated` });
