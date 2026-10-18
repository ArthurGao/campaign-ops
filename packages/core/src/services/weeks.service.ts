import type { Clock } from '../domain/clock';
import { AppError, notFound, requireRole } from '../domain/errors';
import type { HourCategory, Role } from '../domain/enums';
import { requiresAdGates } from '../domain/rules/gates';
import {
  addDays,
  assertPlan,
  assertReportWritable,
  assertSendable,
  assertTimeEntry,
  campaignWeek,
  isWeekId,
  nzDate,
  planItem,
  reportNumbers,
  summarizeHours,
  weekOf,
} from '../domain/rules/week';
import type {
  Actor,
  PlanItemView,
  ReportDraft,
  TimeEntry,
  WeekId,
  WeeklyReport,
  WeekSummary,
  WeekView,
} from '../domain/types';
import { replaceById, stamp } from '../common/audit';
import type { MemoryStore } from '../store/memory.store';
import type { TasksService } from './tasks.service';

export type LogTimeInput = { category: HourCategory; hours: number; note?: string; date?: string };
export type SaveReportInput = { done?: string; blocked?: string; next?: string };

const PM_ONLY: readonly Role[] = ['pm'];

/**
 * The weekly loop from the source workflow: a plan picked from the board on Monday, the PM's
 * 16 hours against the source split, and a one-page report to the client (done, blocked, next).
 * Every method takes a Monday 'YYYY-MM-DD' or 'current'.
 */
export class WeeksService {
  constructor(
    private readonly store: MemoryStore,
    private readonly tasks: Pick<TasksService, 'find' | 'gates'>,
    private readonly clock: Clock,
  ) {}

  private get data() {
    return this.store.data;
  }

  current(): WeekId {
    return weekOf(this.clock.now());
  }

  private firstWeek(): WeekId {
    return weekOf(this.data.settings.campaign.startDate);
  }

  private number(week: WeekId): number {
    return campaignWeek(week, this.data.settings.campaign.startDate);
  }

  /** 'current' → this week; anything else must be a campaign Monday. */
  private resolve(week: string): WeekId {
    if (week === 'current') return this.current();
    if (!isWeekId(week)) {
      throw new AppError(
        'VALIDATION',
        `${week} is not a week.`,
        'Use the Monday: YYYY-MM-DD.',
        400,
      );
    }
    if (week < this.firstWeek()) throw notFound('Week', week);
    return week;
  }

  private entries(week: WeekId): TimeEntry[] {
    return this.data.timeEntries.filter((e) => e.week === week);
  }

  private planIds(week: WeekId): string[] {
    return this.data.weekPlans.find((p) => p.week === week)?.taskIds ?? [];
  }

  private report(week: WeekId): WeeklyReport | undefined {
    return this.data.weeklyReports.find((r) => r.week === week);
  }

  /** Campaign weeks so far, plus the coming one (plans are made ahead); newest first. */
  list(): WeekSummary[] {
    const current = this.current();
    const out: WeekSummary[] = [];
    let number = 1;
    for (let w = this.firstWeek(); w <= addDays(current, 7); w = addDays(w, 7), number++) {
      const status = this.report(w)?.status;
      out.push({
        week: w,
        number,
        isCurrent: w === current,
        ...(status ? { reportStatus: status } : {}),
      });
    }
    return out.reverse();
  }

  get(param = 'current'): WeekView {
    const week = this.resolve(param);
    const now = this.clock.now();
    const current = this.current();
    const number = this.number(week);
    const entries = this.entries(week).sort((a, b) => a.date.localeCompare(b.date));
    const report = this.report(week);
    const plan = this.planItems(week, now);
    return {
      week,
      number,
      isCurrent: week === current,
      isPast: week < current,
      plan,
      hours: summarizeHours(entries, number),
      entries,
      ...(report ? { report } : {}),
      draft: this.draft(week, plan),
      numbers: reportNumbers(week, this.data.funnel, this.data.recon),
    };
  }

  private planItems(week: WeekId, now: Date): PlanItemView[] {
    return this.planIds(week).flatMap((id) => {
      const t = this.tasks.find(id);
      if (!t) return [];
      const gates =
        t.status === 'approved' && requiresAdGates(t) ? this.tasks.gates(id) : undefined;
      return [planItem(t, this.data.facts, now, gates)];
    });
  }

  /** Suggested report lines from what the week's records say happened. */
  private draft(week: WeekId, plan: PlanItemView[]): ReportDraft {
    const inWeek = (at: string) => weekOf(at) === week;
    const done = [
      ...this.data.tasks.flatMap((t) =>
        t.events
          .filter((e) => inWeek(e.at) && /→ (approved|live|verified)$/.test(e.action))
          .map((e) => `${t.id} ${t.title}: ${e.action.split('→ ')[1]}`),
      ),
      ...this.data.packages.flatMap((p) =>
        p.publishLog
          .filter((e) => inWeek(e.at) && (e.action === 'published' || e.action === 'verified'))
          .map((e) => `${p.id} on ${p.channel}: ${e.action}`),
      ),
      ...this.data.factVersions
        .filter((v) => inWeek(v.at))
        .map(
          (v) =>
            `${v.version}: ${v.changes.map((c) => c.factId).join(', ')} updated on the Fact Sheet`,
        ),
    ];
    const blocked = [
      ...plan
        .filter((i) => i.blocker && !i.done)
        .map((i) => `${i.taskId} ${i.title}: ${i.blocker}`),
      ...this.data.evidence
        .filter((e) => e.blocks !== 'none' && e.status === 'open')
        .map((e) => `${e.id} ${e.finding} (blocks ${e.blocks})`),
    ];
    // Next week's plan if there is one; otherwise this week's unfinished items carry over.
    const following = this.planIds(addDays(week, 7)).flatMap((id) => {
      const t = this.tasks.find(id);
      return t ? [`${t.id} ${t.title}`] : [];
    });
    const next = following.length
      ? following
      : plan.filter((i) => !i.done).map((i) => `${i.taskId} ${i.title}`);
    return { done: [...new Set(done)], blocked, next };
  }

  setPlan(param: string, taskIds: string[], actor: Actor): WeekView {
    const week = this.resolve(param);
    requireRole(actor, PM_ONLY, 'plan the week');
    const ids = assertPlan(taskIds, week, { currentWeek: this.current(), tasks: this.data.tasks });
    const now = this.clock.now();
    const detail = `${ids.length} task${ids.length === 1 ? '' : 's'}`;
    const plans = this.data.weekPlans;
    const i = plans.findIndex((p) => p.week === week);
    if (i >= 0) plans[i] = stamp({ ...plans[i], taskIds: ids }, now, actor, 'planned', detail);
    else {
      const at = now.toISOString();
      const events = [{ at, actor, action: 'planned', detail }];
      plans.push({ week, taskIds: ids, createdAt: at, updatedAt: at, events });
    }
    return this.get(week);
  }

  logTime(param: string, input: LogTimeInput, actor: Actor): WeekView {
    const week = this.resolve(param);
    requireRole(actor, PM_ONLY, 'log time');
    const now = this.clock.now();
    const date = input.date ?? (week === this.current() ? nzDate(now) : addDays(week, 4));
    assertTimeEntry({ ...input, date }, week, {
      currentWeek: this.current(),
      firstWeek: this.firstWeek(),
    });
    this.data.timeEntries.push({
      id: this.store.nextId(
        'TIME-',
        4,
        this.data.timeEntries.map((e) => e.id),
      ),
      week,
      date,
      category: input.category,
      hours: input.hours,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      actor,
      createdAt: now.toISOString(),
    });
    return this.get(week);
  }

  saveReport(param: string, input: SaveReportInput, actor: Actor): WeekView {
    const week = this.resolve(param);
    requireRole(actor, PM_ONLY, 'write the weekly report');
    const before = this.report(week);
    assertReportWritable(before, week, this.current());
    const now = this.clock.now();
    const at = now.toISOString();
    const text = (k: keyof SaveReportInput) => input[k] ?? before?.[k] ?? '';
    const fields = { done: text('done'), blocked: text('blocked'), next: text('next') };
    if (before) {
      replaceById(
        this.data.weeklyReports,
        stamp({ ...before, ...fields }, now, actor, 'draft saved'),
      );
    } else {
      this.data.weeklyReports.push({
        id: `WR-${week}`,
        week,
        status: 'draft',
        ...fields,
        createdAt: at,
        updatedAt: at,
        events: [{ at, actor, action: 'draft saved' }],
      });
    }
    return this.get(week);
  }

  sendReport(param: string, actor: Actor): WeekView {
    const week = this.resolve(param);
    requireRole(actor, PM_ONLY, 'send the weekly report');
    const report = assertSendable(this.report(week), week);
    const now = this.clock.now();
    replaceById(
      this.data.weeklyReports,
      stamp(
        {
          ...report,
          status: 'sent' as const,
          numbers: reportNumbers(week, this.data.funnel, this.data.recon),
          sentAt: now.toISOString(),
          sentBy: actor,
        },
        now,
        actor,
        'sent',
        'to the client',
      ),
    );
    return this.get(week);
  }
}
