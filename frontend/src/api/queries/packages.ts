import { useQuery } from '@tanstack/react-query';
import type { PatchPackageInput, PublishLogRow, PublishPackage } from '@campaign-ops/core';
import { api } from '../client';
import { useApiMutation } from './core';

export const usePackages = () =>
  useQuery({ queryKey: ['packages'], queryFn: () => api.get<PublishPackage[]>('/packages') });
export const usePublishLog = () =>
  useQuery({ queryKey: ['publish-log'], queryFn: () => api.get<PublishLogRow[]>('/publish-log') });

const usePackageAction = (action: string, success: (p: PublishPackage) => string) =>
  useApiMutation(
    ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.post<PublishPackage>(`/packages/${id}/${action}`, body),
    { success },
  );

export const usePatchPackage = () =>
  useApiMutation(
    ({ id, ...body }: PatchPackageInput & { id: string }) =>
      api.patch<PublishPackage>(`/packages/${id}`, body),
    {
      success: (p) => `${p.id} saved · caption ${p.caption.version}`,
    },
  );
export const useApprovePackage = () =>
  usePackageAction(
    'approve',
    (p) =>
      `${p.id} approved: ${p.approval.approvedAssetVersion ?? 'no asset'} / ${p.approval.approvedCaptionVersion}`,
  );
export const useRejectPackage = () =>
  usePackageAction('reject', (p) => `${p.id} sent back with a note`);
export const useSchedulePackage = () => usePackageAction('schedule', (p) => `${p.id} scheduled`);
export const usePublishedPackage = () =>
  usePackageAction('published', (p) => `${p.id} marked published`);
export const useVerifyPackage = () =>
  usePackageAction('verify', (p) => `${p.id} recorded as ${p.status}`);
export const useTakeDown = () => usePackageAction('take-down', (p) => `${p.id} taken down`);
