import type { Task } from '@campaign-ops/core';
import { Facts } from '@/components/shared/Layout';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { fmtDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

/** The approval record: who approved which version, and under what authority. */
export function ApprovalTab({ task }: { task: Task }) {
  const a = task.approval;
  const current = a?.status === 'approved' && a.approvedVersion === task.version;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-2">Current</span>
        <VersionBadge>v{task.version}</VersionBadge>
        <span className="text-ink-2">· Approved</span>
        {a?.status === 'approved' ? (
          <VersionBadge tone={current ? 'approved' : 'stale'}>v{a.approvedVersion}</VersionBadge>
        ) : (
          <span className="text-ink-3">none</span>
        )}
        {a?.status === 'approved' && !current ? (
          <span className="text-xs font-medium text-warn">
            Changed since approval — needs approval again
          </span>
        ) : null}
      </div>
      {a ? (
        <Facts
          rows={[
            [
              'Decision',
              <span
                className={cn('font-semibold', a.status === 'approved' ? 'text-ok' : 'text-bad')}
              >
                {a.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>,
            ],
            ['By', `${a.approver.name} (${ROLE_LABELS[a.approver.role]})`],
            ['At', <span className="font-mono">{fmtDateTime(a.at)}</span>],
            ...(a.note
              ? ([['Note', <span className="italic">“{a.note}”</span>]] as [
                  string,
                  React.ReactNode,
                ][])
              : []),
            ...(a.nonSubstantive
              ? ([
                  [
                    'Authority',
                    `Non-substantive edit (${a.nonSubstantive.scopeRef}), within scope signed by ${a.nonSubstantive.authorisedBy}`,
                  ],
                ] as [string, React.ReactNode][])
              : []),
            ...(a.preApproved
              ? ([
                  [
                    'Authority',
                    `Pre-approved scope ${a.preApproved.scopeRef}, signed by ${a.preApproved.authorisedBy}`,
                  ],
                ] as [string, React.ReactNode][])
              : []),
          ]}
        />
      ) : (
        <p className="text-sm text-ink-3">
          {task.status === 'awaiting_approval'
            ? 'Waiting for the client.'
            : 'Not sent for approval yet.'}
        </p>
      )}
      {task.pendingNonSubstantive ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-strong">
          Marked non-substantive ({task.pendingNonSubstantive.scopeRef}) by{' '}
          {task.pendingNonSubstantive.markedBy.name}: the PM may approve this version.
        </p>
      ) : null}
      {task.type === 'ad_change' && task.status === 'awaiting_approval' ? (
        <p className="text-sm text-ink-2">
          Ad changes outside the pre-approved scope need the client decision maker.
        </p>
      ) : null}
    </div>
  );
}
