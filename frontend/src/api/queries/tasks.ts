import { useQuery } from '@tanstack/react-query';
import type { AdGates, BriefDraft, CreatePackageInput, CreateTaskInput, PatchTaskInput, PublishPackage, Task, TransitionInput } from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

export const useTasks = () => useQuery({ queryKey: ['tasks'], queryFn: () => api.get<Task[]>('/tasks') });
export const useTask = (id?: string) => useQuery({ queryKey: ['task', id], queryFn: () => api.get<Task>(`/tasks/${id}`), enabled: !!id });
export const useTaskGates = (id?: string, enabled = true) =>
  useQuery({ queryKey: ['task-gates', id], queryFn: () => api.get<AdGates>(`/tasks/${id}/gates`), enabled: !!id && enabled });

export const useCreateTask = () => useApiMutation((body: CreateTaskInput) => api.post<Task>('/tasks', body), { success: (t) => `${t.id} created` });
export const usePatchTask = () =>
  useApiMutation(({ id, ...body }: PatchTaskInput & { id: string }) => api.patch<Task>(`/tasks/${id}`, body), {
    success: (t) => `${t.id} saved · v${t.version}`,
  });
export const useTransitionTask = () =>
  useApiMutation(({ id, ...body }: TransitionInput & { id: string }) => api.post<Task>(`/tasks/${id}/transition`, body), {
    success: (t) => `${t.id} → ${t.status.replace(/_/g, ' ')}`,
  });
export const useCreatePackage = () =>
  useApiMutation(({ id, ...body }: CreatePackageInput & { id: string }) => api.post<PublishPackage>(`/tasks/${id}/create-package`, body), {
    success: (p) => `${p.id} created — awaiting client approval`,
  });
export const useBriefPrefill = () => useApiMutation((id: string) => api.post<BriefDraft>(`/tasks/${id}/create-brief`));
