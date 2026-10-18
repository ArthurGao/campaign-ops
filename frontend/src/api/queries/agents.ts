import { useQuery } from '@tanstack/react-query';
import type {
  AgentCard,
  AgentId,
  AgentRun,
  AiCostView,
  DecisionResult,
  RunTrigger,
} from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

const active = (r?: AgentRun) => r?.status === 'queued' || r?.status === 'running';

export const useAgents = () =>
  useQuery({ queryKey: ['agents'], queryFn: () => api.get<AgentCard[]>('/agents') });

/** Polls every 2 s while any user-started run is in flight (the seeded scheduled run waits for its slot). */
export const useAiCost = () =>
  useQuery({ queryKey: ['ai-cost'], queryFn: () => api.get<AiCostView>('/agents/cost') });
export const useRuns = () =>
  useQuery({
    queryKey: ['runs'],
    queryFn: () => api.get<AgentRun[]>('/agents/runs'),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r) => active(r) && r.trigger !== 'scheduled') ? 2000 : false,
  });

/** frontend/CLAUDE.md rule 7: poll every 2 s while queued or running, otherwise stop. */
export const useAgentRun = (id?: string) =>
  useQuery({
    queryKey: ['run', id],
    queryFn: () => api.get<AgentRun>(`/agents/runs/${id}`),
    enabled: !!id,
    refetchInterval: (q) =>
      active(q.state.data) && q.state.data?.trigger !== 'scheduled' ? 2000 : false,
  });

export const useStartRun = () =>
  useApiMutation(
    ({
      agent,
      inputs,
      trigger,
    }: {
      agent: AgentId;
      inputs: Record<string, unknown>;
      trigger?: RunTrigger;
    }) =>
      api.post<{ runId: string }>(`/agents/${agent}/runs`, {
        inputs,
        ...(trigger ? { trigger } : {}),
      }),
  );

export const useDecideOutput = () =>
  useApiMutation(
    ({
      runId,
      outputId,
      status,
      note,
    }: {
      runId: string;
      outputId: string;
      status: 'accepted' | 'rejected';
      note?: string;
    }) =>
      api.post<DecisionResult>(`/agents/runs/${runId}/outputs/${outputId}/decision`, {
        status,
        ...(note ? { note } : {}),
      }),
  );
