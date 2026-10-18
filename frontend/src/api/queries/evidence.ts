import { useQuery } from '@tanstack/react-query';
import type {
  ConvertEvidenceInput,
  CreateEvidenceInput,
  EvidenceItem,
  PatchEvidenceInput,
  Task,
} from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

export const useEvidence = () =>
  useQuery({ queryKey: ['evidence'], queryFn: () => api.get<EvidenceItem[]>('/evidence') });

export const usePatchEvidence = () =>
  useApiMutation(
    ({ id, ...body }: PatchEvidenceInput & { id: string }) =>
      api.patch<EvidenceItem>(`/evidence/${id}`, body),
    { success: (e) => `${e.id} updated` },
  );
export const useCreateEvidence = () =>
  useApiMutation((body: CreateEvidenceInput) => api.post<EvidenceItem>('/evidence', body), {
    success: (e) => `${e.id} added`,
  });
export const useConvertEvidence = () =>
  useApiMutation(({ id, ...body }: ConvertEvidenceInput & { id: string }) =>
    api.post<{ evidence: EvidenceItem; task: Task }>(`/evidence/${id}/convert`, body),
  );
