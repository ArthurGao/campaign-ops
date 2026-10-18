import { HOUR_CATEGORIES, PAID_RECON_CHANNELS, type HourCategory } from '../enums';
import { AppError } from '../errors';
import type {
  AdGates,
  FactEntry,
  FunnelWeek,
  HoursSummary,
  PlanItemView,
  ReconRow,
  ReportNumbers,
  Task,
  TimeEntry,
  WeekId,
  WeeklyReport,
} from '../types';
import { unusableRefs } from './facts';
import { cplText } from './recon';

const TZ = 'Pacific/Auckland';
const DAY_MS = 86_400_000;

/** The PM's weekly budget (source workflow: "每周 16 小时左右"). */
export const WEEKLY_HOURS_CAP = 16;
/** One entry covers at most a working day; hours go in quarter steps. */
export const MAX_ENTRY_HOURS = 8;

type Plan = Record<HourCategory, number>;
const plan = (...h: number[]): Plan =>
  Object.fromEntries(HOUR_CATEGORIES.map((c, i) => [c, h[i] ?? 0])) as Plan;

/**
 * Source plan, weeks 1–4 ("后面三周怎么调"), in HOUR_CATEGORIES order: management, audit, site,
 * social, seo_geo, ads, review, buffer. Week 5 onward keeps the week-4 split.
 */
export const SOURCE_HOURS_PLAN: readonly Plan[] = [
  plan(6, 3, 2.5, 1, 0, 0, 1, 1.5),
  plan(4, 1.5, 2.5, 3, 2, 1, 0.5, 1.5),
  plan(3.5, 1, 1, 3, 1.5, 3, 1.5, 1.5),
  plan(3, 1, 1, 2.5, 1.5, 2.5, 3, 1.5),
];

const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
});
const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function local(instant: Date): { date: string; weekday: number } {
  const p = Object.fromEntries(dateParts.formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: WEEKDAY[p.weekday] };
}

/** Calendar date in Pacific/Auckland: '2026-10-15'. */
export function nzDate(instant: Date | string): string {
  return local(new Date(instant)).date;
}

/** Calendar arithmetic on 'YYYY-MM-DD' (no time zone involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday (Pacific/Auckland) of the week an instant falls in. */
export function weekOf(instant: Date | string): WeekId {
  const { date, weekday } = local(new Date(instant));
  return addDays(date, -weekday);
}

/** A real calendar date that is a Monday (a date's weekday does not depend on the time zone). */
export function isWeekId(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    addDays(value, 0) === value &&
    new Date(`${value}T00:00:00Z`).getUTCDay() === 1
  );
}

/** Campaign week number, 1 for the week the campaign starts in. */
export function campaignWeek(week: WeekId, campaignStart: string): number {
  const first = weekOf(campaignStart);
  const days = (Date.parse(`${week}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY_MS;
  return Math.floor(days / 7) + 1;
}

export function plannedHours(weekNumber: number): Plan {
  const i = Math.min(Math.max(weekNumber, 1), SOURCE_HOURS_PLAN.length) - 1;
  return { ...SOURCE_HOURS_PLAN[i] };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The hours summary for one week, from all time entries (Week screen and Dashboard). */
export function weekHours(
  entries: readonly TimeEntry[],
  week: WeekId,
  campaignStart: string,
): HoursSummary {
  return summarizeHours(
    entries.filter((e) => e.week === week),
    campaignWeek(week, campaignStart),
  );
}

/** Report lines as the markdown bullets the report fields hold. */
export function bullets(lines: readonly string[]): string {
  return lines.map((l) => `- ${l}`).join('\n');
}

export function summarizeHours(entries: readonly TimeEntry[], weekNumber: number): HoursSummary {
  const planned = plannedHours(weekNumber);
  const used = plan();
  for (const e of entries) used[e.category] = round(used[e.category] + e.hours);
  const total = round(entries.reduce((s, e) => s + e.hours, 0));
  return {
    cap: WEEKLY_HOURS_CAP,
    planned,
    used,
    total,
    plannedTotal: round(Object.values(planned).reduce((s, h) => s + h, 0)),
    remaining: round(WEEKLY_HOURS_CAP - total),
    overCap: total > WEEKLY_HOURS_CAP,
  };
}

function invalid(message: string, hint?: string): AppError {
  return new AppError('VALIDATION', message, hint, 400);
}

/** Time can be logged for the campaign's weeks up to the current one, in quarter hours. */
export function assertTimeEntry(
  input: { category: HourCategory; hours: number; note?: string; date: string },
  week: WeekId,
  ctx: { currentWeek: WeekId; firstWeek: WeekId },
): void {
  if (!HOUR_CATEGORIES.includes(input.category))
    throw invalid(`Unknown category: ${input.category}.`);
  const h = input.hours;
  if (!Number.isFinite(h) || h <= 0 || h > MAX_ENTRY_HOURS || Math.round(h * 4) !== h * 4) {
    throw invalid(
      `Hours must be between 0.25 and ${MAX_ENTRY_HOURS}, in quarter hours.`,
      'Log each working session separately.',
    );
  }
  if (week > ctx.currentWeek) throw invalid('Time cannot be logged for a future week.');
  if (week < ctx.firstWeek) throw invalid('That week is before the campaign started.');
  if (input.date < week || input.date > addDays(week, 6)) {
    throw invalid(`${input.date} is not in the week of ${week}.`);
  }
  if (input.category === 'buffer' && !input.note?.trim()) {
    throw invalid(
      'Buffer time needs a note.',
      'Say what came up: the buffer is for the unexpected, not for new work.',
    );
  }
}

/** Plans are set for the current or a coming week, from tasks that are not finished. */
export function assertPlan(
  taskIds: readonly string[],
  week: WeekId,
  ctx: { currentWeek: WeekId; tasks: readonly Task[] },
): string[] {
  if (week < ctx.currentWeek) {
    throw new AppError(
      'INVALID_TRANSITION',
      `The week of ${week} is over; its plan is kept as it was.`,
      'Plan the current or next week instead.',
    );
  }
  const ids = [...new Set(taskIds)];
  for (const id of ids) {
    const task = ctx.tasks.find((t) => t.id === id);
    if (!task) throw new AppError('NOT_FOUND', `Task ${id} does not exist.`, undefined, 404);
    if (task.status === 'verified') {
      throw new AppError(
        'INVALID_TRANSITION',
        `${id} is already verified.`,
        'Plan work that still has a step left.',
      );
    }
  }
  return ids;
}

/**
 * What stops a planned task from moving, in words. `gates` is passed for an approved ad task that
 * still has to pass the launch gates (spend-reducing changes skip them, D-32).
 */
export function planItem(
  task: Task,
  facts: readonly FactEntry[],
  now: Date,
  gates?: AdGates,
): PlanItemView {
  const blocker = blockerOf(task, unusableRefs(task.factRefs, facts, now), gates);
  return {
    taskId: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    owner: task.owner,
    ...(blocker ? { blocker } : {}),
    done: task.status === 'live' || task.status === 'verified',
  };
}

function blockerOf(task: Task, missing: string[], gates?: AdGates): string | undefined {
  if (missing.length) return `Waiting on ${missing.join(', ')} (client confirms on the Fact Sheet)`;
  if (task.status === 'blocked') return task.blockedReason ?? 'Blocked';
  if (task.status === 'awaiting_approval') return 'Waiting for client approval';
  const passed = gates && Object.values(gates).filter(Boolean).length;
  if (gates && passed !== undefined && passed < 4) return `Ad gates: ${passed}/4 passed`;
  return undefined;
}

/** A draft is written for a week that has started, and only until it is sent. */
export function assertReportWritable(
  report: WeeklyReport | undefined,
  week: WeekId,
  currentWeek: WeekId,
): void {
  if (week > currentWeek) throw invalid('A report covers a week that has started.');
  assertReportEditable(report);
}

export function assertReportEditable(report: WeeklyReport | undefined): void {
  if (report?.status === 'sent') {
    throw new AppError(
      'INVALID_TRANSITION',
      `The report for the week of ${report.week} was sent; it is not edited afterwards.`,
      'Put corrections in next week’s report.',
    );
  }
}

export function assertSendable(report: WeeklyReport | undefined, week: WeekId): WeeklyReport {
  if (!report) {
    throw new AppError(
      'VALIDATION',
      `There is no report for the week of ${week} yet.`,
      'Save a draft first.',
      400,
    );
  }
  assertReportEditable(report);
  const empty = (['done', 'next'] as const).filter((k) => !report[k].trim());
  if (empty.length) {
    throw new AppError(
      'VALIDATION',
      `The report needs ${empty.join(' and ')} before it is sent.`,
      'Done, blocked, next: the client reads all three.',
      400,
    );
  }
  return report;
}

/** The week's numbers from the CRM-side data: funnel and paid spend per channel. */
export function reportNumbers(
  week: WeekId,
  funnel: readonly FunnelWeek[],
  recon: readonly ReconRow[],
): ReportNumbers {
  const f = funnel.find((x) => weekOf(x.weekStart) === week);
  const paid = recon
    .filter(
      (r) =>
        weekOf(r.weekStart) === week &&
        (PAID_RECON_CHANNELS as readonly string[]).includes(r.channel) &&
        r.spendCents > 0,
    )
    .map((r) => ({
      channel: r.channel,
      spendCents: r.spendCents,
      validLeads: r.crmValidLeads,
      cplText: cplText(r.spendCents, r.crmValidLeads),
    }));
  return {
    ...(f ? { visits: f.visits, validLeads: f.validLeads, deposits: f.deposits } : {}),
    paid,
  };
}
