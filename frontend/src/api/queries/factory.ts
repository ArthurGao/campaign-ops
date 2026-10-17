import { useQuery } from '@tanstack/react-query';
import type { AvailableAsset, Brief, BriefDraft, BriefQAInput, PublishPackage } from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

const inFlight = (b: Brief) => ['submitted', 'accepted', 'in_production'].includes(b.status);
const SEEDED_IN_PRODUCTION = 'SOC-2027CT-004';

/** Polls while a brief the user sent is moving through the factory. */
export const useBriefs = () =>
  useQuery({
    queryKey: ['briefs'],
    queryFn: () => api.get<Brief[]>('/factory/briefs'),
    refetchInterval: (q) => ((q.state.data ?? []).some((b) => inFlight(b) && b.id !== SEEDED_IN_PRODUCTION) ? 2000 : false),
  });
export const useAssets = () => useQuery({ queryKey: ['assets'], queryFn: () => api.get<AvailableAsset[]>('/factory/assets') });
export const useQaChecklist = () => useQuery({ queryKey: ['qa-checklist'], queryFn: () => api.get<string[]>('/factory/qa-checklist'), staleTime: Infinity });

export const useCreateBrief = () => useApiMutation((body: BriefDraft) => api.post<Brief>('/factory/briefs', body), { success: (b) => `${b.id} saved as draft` });
export const useSendBrief = () => useApiMutation((id: string) => api.post<Brief>(`/factory/briefs/${id}/send`), { success: (b) => `${b.id} sent — duplicate check passed` });
export const useBriefQa = () =>
  useApiMutation(({ id, ...body }: BriefQAInput & { id: string }) => api.post<{ brief: Brief; packages: PublishPackage[] }>(`/factory/briefs/${id}/qa`, body), {
    success: (r) => (r.brief.status === 'qa_passed' ? `QA passed — ${r.packages.length} packages created` : `${r.brief.id} returned to the factory`),
  });
export const useCancelBrief = () =>
  useApiMutation(({ id, note }: { id: string; note?: string }) => api.post<Brief>(`/factory/briefs/${id}/cancel`, { note }), { success: (b) => `${b.id} cancelled` });
