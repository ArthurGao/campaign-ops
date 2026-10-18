import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PACKAGE_STATUSES } from '@campaign-ops/core';
import { usePackages, usePublishLog } from '@/api/queries/packages';
import { EmptyState, PageHeader, Section } from '@/components/shared/Layout';
import { StatusChip } from '@/components/shared/StatusChip';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { fmtDateTime, humanize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PackageView } from './PackageView';

function PublishLog() {
  const { data } = usePublishLog();
  if (!data) return <SkeletonRows rows={5} />;
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[44rem]">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Package</th>
            <th scope="col">Action</th>
            <th scope="col">Asset · channel</th>
            <th scope="col">By</th>
            <th scope="col">Note / URL</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i}>
              <td className="whitespace-nowrap font-mono text-[0.78rem]">{fmtDateTime(e.at)}</td>
              <td>
                <Link
                  to={`/publish/${e.packageId}`}
                  className="font-mono text-accent hover:underline"
                >
                  {e.packageId}
                </Link>
              </td>
              <td>
                <StatusChip
                  status={e.action === 'taken_down' ? 'cancelled' : e.action}
                  label={humanize(e.action)}
                />
              </td>
              <td className="font-mono text-[0.78rem]">
                {e.assetId ?? 'text'} · {e.channel}
              </td>
              <td>{e.actor.name}</td>
              <td className="max-w-[22rem] break-words text-[0.8rem] text-ink-2">
                {e.note ?? e.postUrl ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PublishPage() {
  const { packageId } = useParams();
  const [params, setParams] = useSearchParams();
  const { data, isLoading } = usePackages();
  const status = params.get('status');
  const list = (data ?? [])
    .filter((p) => !status || p.status === status)
    .sort((a, b) => b.id.localeCompare(a.id));
  const selected = data?.find((p) => p.id === packageId);
  return (
    <>
      <PageHeader title={copy.pages.publish.title} steps={[7, 8]} lede={copy.pages.publish.lede} />
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {[undefined, ...PACKAGE_STATUSES].map((s) => {
          const n = (data ?? []).filter((p) => !s || p.status === s).length;
          const on = (status ?? undefined) === s;
          return (
            <button
              key={s ?? 'all'}
              aria-pressed={on}
              onClick={() => setParams(s ? { status: s } : {}, { replace: true })}
              className={cn(
                'rounded-sm border px-2 py-1 text-xs font-medium',
                on
                  ? 'border-accent bg-accent-soft text-accent-strong'
                  : 'border-rule bg-surface text-ink-2 hover:border-ink-3',
              )}
            >
              {s ? humanize(s) : 'All'} <span className="font-mono text-ink-3">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <nav aria-label="Packages" className="grid content-start gap-2">
          {isLoading ? (
            <SkeletonRows rows={5} />
          ) : (
            list.map((p) => (
              <Link
                key={p.id}
                to={`/publish/${p.id}${status ? `?status=${status}` : ''}`}
                aria-current={p.id === packageId ? 'page' : undefined}
                className={cn(
                  'grid gap-1 rounded-md border bg-surface px-3 py-2.5 hover:border-ink-3/60',
                  p.id === packageId ? 'border-accent ring-1 ring-accent/30' : 'border-rule',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{p.id}</span>
                  <StatusChip status={p.status} className="ml-auto" />
                </span>
                <span className="text-[0.8125rem] text-ink-2">{humanize(p.channel)}</span>
                <span className="flex flex-wrap gap-1">
                  <VersionBadge label="asset">{p.asset?.version ?? '—'}</VersionBadge>
                  <VersionBadge label="caption">{p.caption.version}</VersionBadge>
                  {p.takenDown ? (
                    <span className="text-[0.7rem] font-semibold text-ink">taken down</span>
                  ) : null}
                </span>
              </Link>
            ))
          )}
        </nav>
        <div className="min-w-0">
          {selected ? (
            <PackageView pkg={selected} />
          ) : packageId && !isLoading ? (
            <EmptyState title={`${packageId} not found.`} />
          ) : (
            <Section title="Publish log" id="log">
              <PublishLog />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
