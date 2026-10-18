import { FUNNEL_STEPS, type FunnelStep } from '../enums';
import type {
  FunnelCounts,
  FunnelLine,
  FunnelRow,
  FunnelStepView,
  FunnelWeek,
  FunnelWeekView,
} from '../types';

/** A rate on fewer than this many people is shown but not compared (source: small samples, no conclusions). */
export const MIN_FUNNEL_BASE = 10;
/** A step counts as the break point when its rate fell at least this much against the week before. */
export const BREAK_POINT_DROP = 0.2;

/** Each step's [base layer, next layer]; the UI reads the same map for its columns. */
export const FUNNEL_LAYERS: Record<FunnelStep, [keyof FunnelCounts, keyof FunnelCounts]> = {
  click: ['impressions', 'visits'],
  enquiry: ['visits', 'validLeads'],
  booking: ['validLeads', 'deposits'],
};

function rate(c: FunnelCounts, step: FunnelStep): { rate: number | null; lowSample: boolean } {
  const [from, to] = FUNNEL_LAYERS[step];
  const base = c[from];
  if (!base) return { rate: null, lowSample: true };
  return { rate: (c[to] ?? 0) / base, lowSample: base < MIN_FUNNEL_BASE };
}

function stepView(c: FunnelCounts, step: FunnelStep, prev?: FunnelCounts): FunnelStepView {
  const now = rate(c, step);
  const before = prev && rate(prev, step);
  // lowSample is also true when there is no rate, so both rates exist and the old one is not 0.
  const change =
    !now.lowSample && before && !before.lowSample && before.rate
      ? now.rate! / before.rate - 1
      : null;
  return { ...now, change, fell: change !== null && change <= -BREAK_POINT_DROP };
}

/** One week's layers, step rates and break point; `prev` is the same line a week earlier. */
export function funnelLine(c: FunnelCounts, prev?: FunnelCounts): FunnelLine {
  const steps = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, stepView(c, s, prev)])) as Record<
    FunnelStep,
    FunnelStepView
  >;
  const fallen = FUNNEL_STEPS.filter((s) => steps[s].fell);
  const breakPoint = fallen.sort((a, b) => steps[a].change! - steps[b].change!)[0] ?? null;
  const { impressions, visits, validLeads, deposits } = c;
  return { impressions, visits, validLeads, deposits, steps, breakPoint };
}

function sum(rows: readonly FunnelRow[]): Omit<FunnelWeek, 'weekStart'> {
  return rows.reduce(
    (t, r) => ({
      impressions: t.impressions + (r.impressions ?? 0),
      visits: t.visits + r.visits,
      validLeads: t.validLeads + r.validLeads,
      deposits: t.deposits + r.deposits,
    }),
    { impressions: 0, visits: 0, validLeads: 0, deposits: 0 },
  );
}

function byWeek(rows: readonly FunnelRow[]): [string, FunnelRow[]][] {
  const weeks = new Map<string, FunnelRow[]>();
  for (const r of rows) {
    const week = weeks.get(r.weekStart) ?? [];
    week.push(r);
    weeks.set(r.weekStart, week);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** All channels added up per week, oldest first (the Dashboard funnel and the weekly report). */
export function funnelTotals(rows: readonly FunnelRow[]): FunnelWeek[] {
  return byWeek(rows).map(([weekStart, week]) => ({ weekStart, ...sum(week) }));
}

/** The last `weeks` weeks, oldest first; each is compared with the week before it, shown or not. */
export function funnelWeeks(rows: readonly FunnelRow[], weeks = 3): FunnelWeekView[] {
  const all = byWeek(rows);
  const totals = all.map(([, week]) => sum(week));
  return all
    .map(([weekStart, week], i) => {
      const prev = all[i - 1]?.[1];
      return {
        weekStart,
        total: funnelLine(totals[i], totals[i - 1]),
        channels: week.map((r) => ({
          channel: r.channel,
          ...funnelLine(
            r,
            prev?.find((p) => p.channel === r.channel),
          ),
        })),
      };
    })
    .slice(-Math.max(1, weeks));
}
