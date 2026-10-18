import { Link } from 'react-router-dom';
import { useFactIndex, useFactUsages } from '@/api/queries/facts';
import { EmptyState, Section } from '@/components/shared/Layout';
import { RichText } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SkeletonRows } from '@/components/ui/skeleton';

function Rereview({ on }: { on: boolean }) {
  return on ? (
    <span className="rounded-sm bg-warn-soft px-1.5 py-px text-[0.7rem] font-semibold text-warn">
      Re-review
    </span>
  ) : null;
}

/** "Where is this used?" — drafts, briefs and packages citing the entry. */
export function UsagesDrawer({ factId, onClose }: { factId: string | null; onClose(): void }) {
  const { data, isLoading } = useFactUsages(factId ?? undefined);
  const fact = useFactIndex().get(factId ?? '');
  const total = data ? data.tasks.length + data.briefs.length + data.packages.length : 0;
  return (
    <Sheet open={!!factId} onOpenChange={(o) => !o && onClose()}>
      {factId ? (
        <SheetContent
          title={`Where is ${factId} used?`}
          description={fact ? <RichText text={`${fact.label}: ${fact.statement}`} /> : undefined}
        >
          <div className="grid gap-6 p-5">
            {isLoading || !data ? (
              <SkeletonRows rows={4} />
            ) : total === 0 ? (
              <EmptyState
                title={`Nothing cites ${factId} yet.`}
                body="Changing it will not flag any work for re-review."
              />
            ) : (
              <>
                <Section title="Tasks" count={data.tasks.length}>
                  <ul className="divide-y divide-rule">
                    {data.tasks.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <Link
                          to={`/tasks?task=${t.id}`}
                          className="font-mono text-accent hover:underline"
                        >
                          {t.id}
                        </Link>
                        <span className="min-w-0 flex-1">{t.title}</span>
                        <Rereview on={t.needsRereview} />
                        <StatusChip status={t.status} />
                      </li>
                    ))}
                  </ul>
                </Section>
                <Section title="Video briefs" count={data.briefs.length}>
                  <ul className="divide-y divide-rule">
                    {data.briefs.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <Link
                          to={`/factory/${b.id}`}
                          className="font-mono text-accent hover:underline"
                        >
                          {b.id}
                        </Link>
                        <span className="min-w-0 flex-1">{b.objective}</span>
                        <Rereview on={b.needsRereview} />
                        <StatusChip status={b.status} />
                      </li>
                    ))}
                  </ul>
                </Section>
                <Section title="Publish packages" count={data.packages.length}>
                  <ul className="divide-y divide-rule">
                    {data.packages.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <Link
                          to={`/publish/${p.id}`}
                          className="font-mono text-accent hover:underline"
                        >
                          {p.id}
                        </Link>
                        <span className="min-w-0 flex-1">{p.channel.replace(/_/g, ' ')}</span>
                        <Rereview on={p.needsRereview} />
                        <StatusChip status={p.status} />
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            )}
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
