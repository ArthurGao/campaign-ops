import { useQuery } from '@tanstack/react-query';
import type { ReviewView, SaveReviewInput } from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

export const useReview = () =>
  useQuery({ queryKey: ['review'], queryFn: () => api.get<ReviewView>('/review') });

export const useSaveReview = () =>
  useApiMutation((body: SaveReviewInput) => api.patch<ReviewView>('/review', body), {
    success: 'Review draft saved',
  });
export const useSendReview = () =>
  useApiMutation(() => api.post<ReviewView>('/review/send'), {
    success: 'Review sent to the client',
  });
