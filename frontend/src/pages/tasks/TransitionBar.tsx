import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { ALLOWED_TRANSITIONS, type Task, type TaskStatus } from '@campaign-ops/core';
import { useTransitionTask } from '@/api/queries/tasks';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { transitionRoles } from '@/lib/permissions';
import { CreatePackageDialog } from './CreatePackageDialog';

const LABEL: Record<string, string> = {
  'draft->qa': 'Send to QA',
  'qa->awaiting_approval': 'Record QA…',
  'awaiting_approval->approved': 'Approve',
  'awaiting_approval->draft': 'Reject with note',
  'approved->live': 'Mark live',
  'live->verified': 'Mark verified',
  'blocked->draft': 'Unblock',
};

/** Keyboard-friendly alternative to dragging: the allowed next steps, gated by role. */
export function TransitionBar({ task, onTab }: { task: Task; onTab(tab: string): void }) {
  const navigate = useNavigate();
  const transition = useTransitionTask();
  const [rejecting, setRejecting] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const next = ALLOWED_TRANSITIONS[task.status];

  const reasonFor = (to: TaskStatus): string | undefined => {
    if (to === 'verified' && task.verification?.result !== 'match')
      return 'Accept a verification output for this task first (Agents › Outbound verify).';
    if (task.status === 'blocked' && task.needsConfirmation)
      return `Waiting on ${task.blockedReason?.replace('needs_confirmation: ', '') ?? 'facts'}: the client must confirm first.`;
    return undefined;
  };

  const go = (to: TaskStatus) => {
    const key = `${task.status}->${to}`;
    if (key === 'qa->awaiting_approval') return onTab('qa');
    if (key === 'awaiting_approval->draft') return setRejecting(true);
    transition.mutate({ id: task.id, to });
  };

  const canPackage =
    (task.type === 'social_post' || task.type === 'ad_copy') &&
    !task.linkedPackageId &&
    (task.status === 'approved' ||
      (task.qa?.passed && ['qa', 'awaiting_approval'].includes(task.status)));

  return (
    <div className="grid gap-2 border-b border-rule bg-ground px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-2xs font-semibold uppercase tracking-wide text-ink-3">
          Next step
        </span>
        {next.length === 0 ? (
          <span className="text-sm text-ink-2">Verified — nothing left to do.</span>
        ) : null}
        {next.map((to) => {
          const key = `${task.status}->${to}`;
          const approveNs = key === 'awaiting_approval->approved' && task.pendingNonSubstantive;
          return (
            <ActionButton
              key={to}
              size="sm"
              variant={
                to === 'draft' && task.status === 'awaiting_approval'
                  ? 'danger'
                  : key === 'awaiting_approval->approved'
                    ? 'approve'
                    : 'primary'
              }
              roles={transitionRoles(task, to)}
              blockedReason={reasonFor(to)}
              loading={transition.isPending && transition.variables?.to === to}
              onClick={() => go(to)}
            >
              {approveNs
                ? `Approve v${task.version} (${task.pendingNonSubstantive?.scopeRef})`
                : key === 'awaiting_approval->approved'
                  ? `Approve v${task.version}`
                  : LABEL[key]}
            </ActionButton>
          );
        })}
        {canPackage ? (
          <ActionButton size="sm" permission="task.package" onClick={() => setPackaging(true)}>
            Create publish package
          </ActionButton>
        ) : null}
        {task.type === 'video_brief' && !task.linkedBriefId ? (
          <ActionButton
            size="sm"
            permission="factory.write"
            onClick={() => navigate(`/factory?newFrom=${task.id}`)}
          >
            Create video brief
          </ActionButton>
        ) : null}
      </div>
      {next.map((to) => reasonFor(to)).filter(Boolean).length ? (
        <p className="flex items-start gap-1.5 text-[0.8125rem] text-bad">
          <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {next.map((to) => reasonFor(to)).filter(Boolean)[0]}
        </p>
      ) : null}
      <BlockedHint error={transition.error} />
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ${task.id} v${task.version}`}
        description="It goes back to draft. The note is recorded on the approval."
        confirmLabel="Reject"
        tone="danger"
        note={{ label: 'What must change', required: true }}
        onConfirm={(note) => transition.mutateAsync({ id: task.id, to: 'draft', note })}
      />
      {packaging ? <CreatePackageDialog task={task} onClose={() => setPackaging(false)} /> : null}
    </div>
  );
}
