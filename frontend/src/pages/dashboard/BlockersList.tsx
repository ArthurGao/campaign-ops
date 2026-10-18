import { Link } from 'react-router-dom';
import type { DashboardResponse } from '@campaign-ops/core';
import { FactRefs } from '@/components/shared/FactChip';
import { EmptyState } from '@/components/shared/Layout';
import { RichText } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { humanize } from '@/lib/format';

/** Evidence that blocks traffic / ads / measurement, and work stuck on unconfirmed facts. */
export function BlockersList({ blockers }: { blockers: DashboardResponse['blockers'] }) {
  if (!blockers.length)
    return (
      <EmptyState
        title="Nothing is blocked."
        body="No blocking evidence and no task waiting on an unconfirmed fact."
      />
    );
  return (
    <ul className="divide-y divide-rule rounded-md border border-rule bg-surface">
      {blockers.map((b) =>
        b.kind === 'evidence' ? (
          <li key={b.item.id} className="grid gap-1 px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-sm bg-bad px-1.5 py-px font-semibold uppercase tracking-wide text-white">
                Blocks {b.item.blocks}
              </span>
              <span className="font-mono text-ink-2">{b.item.id}</span>
              <span className="font-mono text-ink-3">{b.item.priority}</span>
              <StatusChip status={b.item.status} />
              {b.item.convertedTaskId ? (
                <Link
                  to={`/tasks?task=${b.item.convertedTaskId}`}
                  className="font-mono text-accent hover:underline"
                >
                  {b.item.convertedTaskId}
                </Link>
              ) : null}
            </div>
            <Link
              to={`/evidence?focus=${b.item.id}`}
              className="font-medium text-ink hover:text-accent"
            >
              {b.item.finding}
            </Link>
            <p className="text-[0.8125rem] text-ink-2">{b.item.impact}</p>
          </li>
        ) : (
          <li key={b.item.id} className="grid gap-1 px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-sm bg-warn px-1.5 py-px font-semibold uppercase tracking-wide text-white">
                Needs confirmation
              </span>
              <span className="font-mono text-ink-2">{b.item.id}</span>
              <StatusChip status={b.item.status} />
              <span className="text-ink-3">{humanize(b.item.type)}</span>
            </div>
            <Link
              to={`/tasks?task=${b.item.id}`}
              className="font-medium text-ink hover:text-accent"
            >
              <RichText text={b.item.title} />
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-2">
              Waiting on <FactRefs ids={b.item.factRefs} />
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
