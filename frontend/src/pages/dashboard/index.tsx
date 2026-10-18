import { Link } from 'react-router-dom';
import { HoursMeter } from '@/components/shared/HoursMeter';
import { useDashboard } from '@/api/queries/dashboard';
import { Section, PageHeader } from '@/components/shared/Layout';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { fmtDay, relDays } from '@/lib/format';
import { AdGatesPanel } from './AdGatesPanel';
import { BlockersList } from './BlockersList';
import { FunnelChart } from './FunnelChart';
import { ThreeQuestionTiles } from './ThreeQuestionTiles';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  return (
    <>
      <PageHeader
        title={copy.pages.dashboard.title}
        lede={copy.pages.dashboard.lede}
        meta={data ? <VersionBadge label="Fact Sheet">{data.factSheetVersion}</VersionBadge> : null}
      />
      {isLoading || !data ? (
        <SkeletonRows rows={10} />
      ) : (
        <div className="grid gap-8">
          <ThreeQuestionTiles q={data.threeQuestions} />
          <AdGatesPanel />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
            <Section title="Blockers" count={data.blockers.length} id="blockers">
              <BlockersList blockers={data.blockers} />
            </Section>
            <div className="grid content-start gap-8">
              <Section
                title="Awaiting client approval"
                count={data.awaitingApprovalCount}
                id="approvals"
              >
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
                  {[
                    { n: data.awaitingApproval.tasks, label: 'Tasks', to: '/tasks' },
                    {
                      n: data.awaitingApproval.packages,
                      label: 'Publish packages',
                      to: '/publish',
                    },
                  ].map((x) => (
                    <Link
                      key={x.label}
                      to={x.to}
                      className="grid gap-0.5 bg-surface px-3 py-2.5 hover:bg-ground"
                    >
                      <dt className="text-xs text-ink-2">{x.label}</dt>
                      <dd className="font-mono text-xl font-semibold text-ink">{x.n}</dd>
                    </Link>
                  ))}
                </dl>
              </Section>
              <Section title="Checkpoint and hours" id="checkpoint">
                <div className="grid gap-3 text-sm">
                  <p>
                    Next two-week checkpoint{' '}
                    <strong className="font-mono font-semibold">
                      {fmtDay(data.nextCheckpoint)}
                    </strong>{' '}
                    <span className="text-ink-3">({relDays(data.nextCheckpoint, data.now)})</span>.
                    Adjustments wait for it unless a stop-loss or wrong public information needs
                    action now.
                  </p>
                  <div className="grid gap-1.5">
                    <div className="flex justify-between text-xs text-ink-2">
                      <Link to="/week?tab=hours" className="text-accent hover:underline">
                        PM hours this week
                      </Link>
                      <span className="font-mono text-ink">
                        {data.hoursThisWeek.used} / {data.hoursThisWeek.cap} h
                      </span>
                    </div>
                    <HoursMeter used={data.hoursThisWeek.used} cap={data.hoursThisWeek.cap} />
                  </div>
                </div>
              </Section>
            </div>
          </div>
          <Section
            title="Funnel: this week vs last week"
            id="funnel"
            actions={
              <Link
                to="/leads?tab=funnel"
                className="text-xs font-medium text-accent hover:underline"
              >
                By layer and channel →
              </Link>
            }
          >
            <FunnelChart thisWeek={data.funnel.thisWeek} lastWeek={data.funnel.lastWeek} />
          </Section>
        </div>
      )}
    </>
  );
}
