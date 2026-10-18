import { useSearchParams } from 'react-router-dom';
import { useWeek, useWeeks } from '@/api/queries/weeks';
import { PageHeader } from '@/components/shared/Layout';
import { StatusChip } from '@/components/shared/StatusChip';
import { SimpleSelect } from '@/components/ui/select';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { copy } from '@/lib/copy';
import { fmtDay } from '@/lib/format';
import { HoursTab } from './HoursTab';
import { PlanTab } from './PlanTab';
import { ReportTab } from './ReportTab';

const weekLabel = (w: { week: string; number: number; isCurrent: boolean }) =>
  `Week ${w.number} · ${fmtDay(`${w.week}T00:00:00Z`)}${w.isCurrent ? ' · now' : ''}`;

export default function WeekPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'plan';
  const weeks = useWeeks().data;
  const { data: view } = useWeek(params.get('week') ?? 'current');
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHeader
        title={copy.pages.week.title}
        steps={[10]}
        lede={copy.pages.week.lede}
        meta={view?.report ? <StatusChip status={view.report.status} /> : null}
        actions={
          weeks && view ? (
            <SimpleSelect
              label="Week"
              value={view.week}
              onChange={(w) => set('week', weeks.find((x) => x.week === w)?.isCurrent ? null : w)}
              options={weeks.map((w) => ({ value: w.week, label: weekLabel(w) }))}
              className="w-72"
            />
          ) : null
        }
      />
      {!view ? (
        <SkeletonRows rows={8} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => set('tab', v === 'plan' ? null : v)}>
          <TabsList>
            <TabsTrigger value="plan">
              Plan <span className="font-mono text-xs text-ink-3">{view.plan.length}</span>
            </TabsTrigger>
            <TabsTrigger value="hours">
              Hours{' '}
              <span
                className={
                  view.hours.overCap ? 'font-mono text-xs text-bad' : 'font-mono text-xs text-ink-3'
                }
              >
                {view.hours.total}/{view.hours.cap}
              </span>
            </TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>
          <TabsContent value="plan">
            <PlanTab view={view} />
          </TabsContent>
          <TabsContent value="hours">
            <HoursTab view={view} />
          </TabsContent>
          <TabsContent value="report">
            <ReportTab view={view} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
