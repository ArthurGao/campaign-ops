import { useQuery } from '@tanstack/react-query';
import type { LogTimeInput, SaveReportInput, WeekSummary, WeekView } from '@campaign-ops/core';
import { plural } from '@/lib/format';
import { api } from '../client';
import { useApiMutation } from './core';

/** ':week' is a Monday 'YYYY-MM-DD', or 'current'. */
export const useWeeks = () =>
  useQuery({ queryKey: ['weeks'], queryFn: () => api.get<WeekSummary[]>('/weeks') });
export const useWeek = (week = 'current') =>
  useQuery({ queryKey: ['weeks', week], queryFn: () => api.get<WeekView>(`/weeks/${week}`) });

export const useSetPlan = () =>
  useApiMutation(
    ({ week, taskIds }: { week: string; taskIds: string[] }) =>
      api.patch<WeekView>(`/weeks/${week}/plan`, { taskIds }),
    { success: (w) => `Plan saved: ${plural(w.plan.length, 'task')}` },
  );
export const useLogTime = () =>
  useApiMutation(
    ({ week, ...body }: LogTimeInput & { week: string }) =>
      api.post<WeekView>(`/weeks/${week}/time`, body),
    { success: (w, v) => `${v.hours} h logged · ${w.hours.total} of ${w.hours.cap} h this week` },
  );
export const useSaveReport = () =>
  useApiMutation(
    ({ week, ...body }: SaveReportInput & { week: string }) =>
      api.patch<WeekView>(`/weeks/${week}/report`, body),
    { success: 'Draft saved' },
  );
export const useSendReport = () =>
  useApiMutation(({ week }: { week: string }) => api.post<WeekView>(`/weeks/${week}/report/send`), {
    success: 'Report sent to the client',
  });
