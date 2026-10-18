import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '../client';

/**
 * Mutations wait for the server, then refresh everything: one change (confirming a fact) touches
 * tasks, packages and the dashboard at once, and the API is cheap. Errors toast globally (App).
 */
export function useApiMutation<TVars, TRes>(
  fn: (vars: TVars) => Promise<TRes>,
  opts: { success?: string | ((res: TRes, vars: TVars) => string) } & Omit<
    UseMutationOptions<TRes, ApiError, TVars>,
    'mutationFn'
  > = {},
) {
  const qc = useQueryClient();
  const { success, onSuccess, ...rest } = opts;
  return useMutation<TRes, ApiError, TVars>({
    mutationFn: fn,
    ...rest,
    onSuccess: async (res, vars, ctx, meta) => {
      await qc.invalidateQueries();
      if (success) toast.success(typeof success === 'function' ? success(res, vars) : success);
      await onSuccess?.(res, vars, ctx, meta);
    },
  });
}

export const qs = (params: Record<string, string | number | undefined>) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return p.length ? `?${new URLSearchParams(p.map(([k, v]) => [k, String(v)])).toString()}` : '';
};
