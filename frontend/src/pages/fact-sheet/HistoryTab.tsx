import { Link } from 'react-router-dom';
import type { FactChange, FactSheetVersion } from '@campaign-ops/core';
import { useFactVersions } from '@/api/queries/facts';
import { usePatchPackage } from '@/api/queries/packages';
import { usePatchTask, useTasks } from '@/api/queries/tasks';
import { usePackages } from '@/api/queries/packages';
import { ActionButton } from '@/components/shared/ActionButton';
import { FactChip } from '@/components/shared/FactChip';
import { StatusChip } from '@/components/shared/StatusChip';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { VersionDiff } from '@/components/shared/VersionDiff';
import { SkeletonRows } from '@/components/ui/skeleton';
import { RichText } from '@/components/shared/Placeholder';
import { fmtDateTime, humanize, plural } from '@/lib/format';

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  statement: 'Statement',
  source: 'Source',
  expiresAt: 'Expires',
  supersededBy: 'Superseded by',
  label: 'Label',
  publicNote: 'Public note',
  purpose: 'Purpose',
  confirmedBy: 'Confirmed by',
};

/** Status values read as words; everything else (URLs, ids, dates) is shown as recorded. */
function show(key: string, value: unknown): React.ReactNode {
  if (key === 'status') return humanize(String(value));
  if (key === 'expiresAt') return fmtDateTime(String(value));
  return <RichText text={String(value)} />;
}

function Change({ c }: { c: FactChange }) {
  const keys = Object.keys(c.after) as (keyof typeof c.after)[];
  return (
    <li className="grid gap-1.5 py-2.5 sm:grid-cols-[6rem_1fr]">
      <FactChip id={c.factId} className="self-start justify-self-start" />
      <div className="grid gap-1 text-sm">
        {keys.map((k) => {
          const before = c.before?.[k];
          const after = c.after[k];
          if (k === 'statement' && typeof before === 'string' && typeof after === 'string') {
            return <VersionDiff key={k} before={before} after={after} />;
          }
          return (
            <p key={k} className="text-ink-2">
              <span className="text-ink-3">{FIELD_LABELS[k] ?? humanize(String(k))}: </span>
              {before !== undefined ? (
                <>
                  <span className="line-through decoration-ink-3/60">{show(k, before)}</span> →{' '}
                </>
              ) : null}
              <span className="font-medium text-ink">{show(k, after)}</span>
            </p>
          );
        })}
      </div>
    </li>
  );
}

/** I-F3: items a change flagged, with the PM's "re-reviewed" action that clears the flag. */
function Affected({ v }: { v: FactSheetVersion }) {
  const tasks = useTasks().data ?? [];
  const packages = usePackages().data ?? [];
  const patchTask = usePatchTask();
  const patchPackage = usePatchPackage();
  if (!v.affected.length)
    return <p className="text-xs text-ink-3">No work cited the changed entries.</p>;
  return (
    <ul className="grid gap-1.5">
      {v.affected.map((a) => {
        const item =
          a.kind === 'task'
            ? tasks.find((t) => t.id === a.id)
            : a.kind === 'package'
              ? packages.find((p) => p.id === a.id)
              : undefined;
        const flagged = item?.needsRereview ?? false;
        const href =
          a.kind === 'task'
            ? `/tasks?task=${a.id}`
            : a.kind === 'package'
              ? `/publish/${a.id}`
              : `/factory/${a.id}`;
        return (
          <li key={`${a.kind}-${a.id}`} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-16 text-xs text-ink-3">{humanize(a.kind)}</span>
            <Link to={href} className="font-mono text-accent hover:underline">
              {a.id}
            </Link>
            {item ? <StatusChip status={item.status} /> : null}
            {flagged ? (
              <>
                <span className="rounded-sm bg-warn-soft px-1.5 py-px text-[0.7rem] font-semibold text-warn">
                  Needs re-review
                </span>
                {a.kind !== 'brief' ? (
                  <ActionButton
                    size="sm"
                    variant="ghost"
                    permission="task.edit"
                    loading={patchTask.isPending || patchPackage.isPending}
                    onClick={() =>
                      a.kind === 'task'
                        ? patchTask.mutate({ id: a.id, needsRereview: false })
                        : patchPackage.mutate({ id: a.id, needsRereview: false })
                    }
                  >
                    Mark re-reviewed
                  </ActionButton>
                ) : null}
              </>
            ) : item ? (
              <span className="text-xs text-ok">Re-reviewed</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function HistoryTab() {
  const { data, isLoading } = useFactVersions();
  if (isLoading || !data) return <SkeletonRows rows={6} />;
  return (
    <ol className="grid gap-4">
      {data.map((v, i) => (
        <li key={v.version} className="rounded-md border border-rule bg-surface">
          <header className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-2.5">
            <VersionBadge tone={i === 0 ? 'approved' : 'plain'}>{v.version}</VersionBadge>
            {i === 0 ? <span className="text-xs font-semibold text-ok">Current</span> : null}
            <span className="font-mono text-xs text-ink-2">{fmtDateTime(v.at)}</span>
            <span className="text-xs text-ink-2">by {v.actor.name}</span>
            <span className="ml-auto text-xs text-ink-3">
              {plural(v.changes.length, 'entry', 'entries')} changed
            </span>
          </header>
          <div className="grid gap-3 px-4 py-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(14rem,1fr)]">
            <ul className="divide-y divide-rule">
              {v.changes.map((c) => (
                <Change key={c.factId} c={c} />
              ))}
            </ul>
            <div className="grid content-start gap-2 border-rule py-2.5 lg:border-l lg:pl-4">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-2">
                Flagged for re-review
              </p>
              <Affected v={v} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
