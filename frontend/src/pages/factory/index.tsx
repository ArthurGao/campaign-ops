import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useBriefs } from '@/api/queries/factory';
import { useTasks } from '@/api/queries/tasks';
import { ActionButton } from '@/components/shared/ActionButton';
import { EmptyState, PageHeader } from '@/components/shared/Layout';
import { StatusChip } from '@/components/shared/StatusChip';
import { SimpleSelect } from '@/components/ui/select';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { fmtDay } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BriefForm } from './BriefForm';
import { BriefView } from './BriefView';

export default function FactoryPage() {
  const { briefId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: briefs, isLoading } = useBriefs();
  const tasks = useTasks().data ?? [];
  const newFrom = params.get('newFrom');
  const candidates = tasks.filter(
    (t) =>
      t.type === 'video_brief' &&
      !(briefs ?? []).some((b) => b.taskId === t.id && b.status !== 'cancelled'),
  );
  const selected = briefs?.find((b) => b.id === briefId);

  return (
    <>
      <PageHeader
        title={copy.pages.factory.title}
        steps={[5, 6]}
        lede={copy.pages.factory.lede}
        actions={
          <div className="flex items-center gap-2">
            <SimpleSelect
              value={undefined}
              onChange={(id) => setParams({ newFrom: id })}
              options={candidates.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))}
              placeholder={
                candidates.length ? 'New brief from task…' : 'No video tasks without a brief'
              }
              disabled={!candidates.length}
              className="w-64"
              label="New brief from a video task"
            />
            <ActionButton
              variant="primary"
              permission="factory.write"
              blockedReason={
                candidates.length ? undefined : 'Every video_brief task already has a brief.'
              }
              onClick={() => setParams({ newFrom: candidates[0]?.id ?? '' })}
            >
              <Plus /> New brief
            </ActionButton>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <nav aria-label="Briefs" className="grid content-start gap-2">
          {isLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            briefs?.map((b) => {
              const last = b.receipts.at(-1);
              return (
                <Link
                  key={b.id}
                  to={`/factory/${b.id}`}
                  aria-current={b.id === briefId ? 'page' : undefined}
                  className={cn(
                    'grid gap-1.5 rounded-md border bg-surface px-3 py-2.5 hover:border-ink-3/60',
                    b.id === briefId ? 'border-accent ring-1 ring-accent/30' : 'border-rule',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{b.id}</span>
                    <StatusChip
                      status={b.status}
                      pulse={['submitted', 'accepted', 'in_production'].includes(b.status)}
                      className="ml-auto"
                    />
                  </span>
                  <span className="line-clamp-2 text-[0.8125rem] text-ink-2">{b.objective}</span>
                  <span className="flex flex-wrap gap-x-3 font-mono text-[0.7rem] text-ink-3">
                    <span>{b.taskId}</span>
                    <span>{b.deliverables.map((d) => d.ratio).join(' · ')}</span>
                    <span>due {fmtDay(b.deadline)}</span>
                    {last ? (
                      <span>
                        credits {last.creditsUsed}/{b.costCap.maxCredits}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })
          )}
        </nav>
        <div className="min-w-0">
          {newFrom ? (
            <BriefForm taskId={newFrom} onCancel={() => setParams({})} />
          ) : selected ? (
            <BriefView brief={selected} />
          ) : briefId && !isLoading ? (
            <EmptyState title={`${briefId} not found.`} />
          ) : (
            <EmptyState
              title="Pick a brief"
              body="Receipts, QA and the JSON exactly as sent to the factory appear here."
              action={
                briefs?.[0] ? (
                  <button
                    className="text-sm text-accent underline"
                    onClick={() => navigate(`/factory/${briefs[0].id}`)}
                  >
                    Open {briefs[0].id}
                  </button>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
