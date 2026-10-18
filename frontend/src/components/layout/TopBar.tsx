import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, FlaskConical } from 'lucide-react';
import { useDashboard, useHealth } from '@/api/queries/dashboard';
import { Tooltip } from '@/components/ui/tooltip';
import { copy } from '@/lib/copy';
import { fmtDateTime, fmtDay, tzName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui.store';
import { API_MODE } from '@/api/client';
import { RoleSwitcher } from './RoleSwitcher';

/** Demo clock: the API's "now", advanced locally between polls. */
function useDemoNow(): string | undefined {
  const health = useHealth();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!health.data) return undefined;
  const drift = health.dataUpdatedAt ? Date.now() - health.dataUpdatedAt : 0;
  void tick;
  return new Date(new Date(health.data.now).getTime() + drift).toISOString();
}

function Meta({
  label,
  children,
  tip,
}: {
  label: string;
  children: React.ReactNode;
  tip?: string;
}) {
  const body = (
    <span className="grid text-left leading-tight">
      <span className="text-[0.66rem] font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <span className="font-mono text-[0.8rem] text-ink">{children}</span>
    </span>
  );
  return tip ? (
    <Tooltip content={tip} side="bottom">
      <button type="button" className="cursor-help">
        {body}
      </button>
    </Tooltip>
  ) : (
    body
  );
}

export function TopBar() {
  const setNavOpen = useUiStore((s) => s.setNavOpen);
  const now = useDemoNow();
  const dash = useDashboard().data;
  const hours = dash?.hoursThisWeek;
  return (
    <header
      data-keep-sheet
      className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-rule bg-surface/95 px-4 backdrop-blur-[2px] lg:px-6"
    >
      <button
        className="rounded-md p-1.5 text-ink-2 hover:bg-panel lg:hidden"
        aria-label="Open navigation"
        onClick={() => setNavOpen(true)}
      >
        <Menu className="size-5" />
      </button>
      <p className="hidden min-w-0 truncate text-sm font-semibold text-ink sm:block">
        {copy.app.campaign}
      </p>
      <div className="ml-auto flex items-center gap-5">
        <div className="hidden items-center gap-5 md:flex">
          {now ? (
            <Meta label={copy.app.demoClock} tip={copy.app.demoClockHelp}>
              {fmtDateTime(now)} {tzName(now)}
            </Meta>
          ) : null}
          {hours ? (
            <Link
              to="/week?tab=hours"
              className="rounded-sm hover:bg-panel"
              title="Hours by category and the log"
            >
              <Meta label={copy.app.hours}>
                <span className={cn(hours.used > hours.cap && 'text-bad')}>{hours.used}</span>
                <span className="text-ink-3"> / {hours.cap} h</span>
              </Meta>
            </Link>
          ) : null}
          {dash ? <Meta label={copy.app.checkpoint}>{fmtDay(dash.nextCheckpoint)}</Meta> : null}
          {API_MODE === 'mock' ? (
            <Tooltip content={copy.app.mockHelp} side="bottom">
              <button
                type="button"
                className="inline-flex cursor-help items-center gap-1 rounded-sm border border-dashed border-ink-3/60 px-1.5 py-0.5 text-[0.7rem] font-medium text-ink-2"
              >
                <FlaskConical className="size-3" aria-hidden />
                {copy.app.mockBadge}
              </button>
            </Tooltip>
          ) : null}
        </div>
        <RoleSwitcher />
      </div>
    </header>
  );
}
