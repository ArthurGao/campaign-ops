import { catchAppError, find, freshSeed, SEED_NOW } from '../../testing/fixtures';
import {
  assertPlan,
  assertSendable,
  assertTimeEntry,
  campaignWeek,
  isWeekId,
  planItem,
  plannedHours,
  reportNumbers,
  SOURCE_HOURS_PLAN,
  summarizeHours,
  weekOf,
} from './week';
import type { TimeEntry, WeeklyReport } from '../types';

const ctx = { currentWeek: '2026-10-12', firstWeek: '2026-09-28' };
const entry = (category: TimeEntry['category'], hours: number): TimeEntry => ({
  id: 'TIME-9999',
  week: '2026-10-12',
  date: '2026-10-13',
  category,
  hours,
  actor: { role: 'pm', name: 'PM' },
  createdAt: SEED_NOW.toISOString(),
});

describe('weeks in Pacific/Auckland', () => {
  it('names a week by its Monday, on the NZ calendar rather than UTC', () => {
    expect(weekOf(SEED_NOW)).toBe('2026-10-12');
    // Monday 00:30 NZDT is still Sunday in UTC.
    expect(weekOf('2026-10-11T11:30:00Z')).toBe('2026-10-12');
    // Sunday 23:30 NZDT belongs to the week before.
    expect(weekOf('2026-10-11T10:30:00Z')).toBe('2026-10-05');
  });

  it('accepts only Mondays as week ids', () => {
    expect(isWeekId('2026-10-12')).toBe(true);
    expect(isWeekId('2026-10-13')).toBe(false);
    expect(isWeekId('2026-02-30')).toBe(false);
  });

  it('counts campaign weeks from the week the campaign starts', () => {
    const start = '2026-09-27T20:00:00.000Z'; // Mon 28 Sep, 09:00 NZDT
    expect(campaignWeek('2026-09-28', start)).toBe(1);
    expect(campaignWeek('2026-10-12', start)).toBe(3);
  });
});

describe('the 16-hour budget', () => {
  it('follows the source split: 15 h in week 1, 16 h after, 1.5 h buffer every week', () => {
    const totals = SOURCE_HOURS_PLAN.map((p) => Object.values(p).reduce((s, h) => s + h, 0));
    expect(totals).toEqual([15, 16, 16, 16]);
    expect(SOURCE_HOURS_PLAN.map((p) => p.buffer)).toEqual([1.5, 1.5, 1.5, 1.5]);
    expect(plannedHours(3).ads).toBe(3);
    expect(plannedHours(9)).toEqual(plannedHours(4));
  });

  it('sums used hours by category and flags going over the cap', () => {
    const s = summarizeHours([entry('ads', 10), entry('ads', 5.5), entry('buffer', 1)], 3);
    expect(s.used.ads).toBe(15.5);
    expect([s.total, s.remaining, s.overCap]).toEqual([16.5, -0.5, true]);
    expect(summarizeHours([entry('site', 4)], 3).overCap).toBe(false);
  });

  it('logs quarter hours, never for a future week, and buffer time says what came up', () => {
    const ok = { category: 'site' as const, hours: 1.25, date: '2026-10-13' };
    expect(() => assertTimeEntry(ok, '2026-10-12', ctx)).not.toThrow();
    for (const hours of [0, -1, 8.25, 1.1, Number.NaN]) {
      expect(catchAppError(() => assertTimeEntry({ ...ok, hours }, '2026-10-12', ctx)).code).toBe(
        'VALIDATION',
      );
    }
    expect(catchAppError(() => assertTimeEntry(ok, '2026-10-19', ctx)).message).toMatch(/future/);
    expect(catchAppError(() => assertTimeEntry(ok, '2026-09-21', ctx)).message).toMatch(/before/);
    expect(
      catchAppError(() => assertTimeEntry({ ...ok, date: '2026-10-19' }, '2026-10-12', ctx))
        .message,
    ).toMatch(/not in the week/);
    const buffer = { category: 'buffer' as const, hours: 1, date: '2026-10-13' };
    expect(catchAppError(() => assertTimeEntry(buffer, '2026-10-12', ctx)).hint).toMatch(
      /unexpected/,
    );
    expect(() =>
      assertTimeEntry({ ...buffer, note: 'Tracking broke' }, '2026-10-12', ctx),
    ).not.toThrow();
  });
});

describe('the week plan', () => {
  const seed = freshSeed();
  const plan = { currentWeek: '2026-10-12', tasks: seed.tasks };

  it('takes unfinished tasks for this week or a coming one, once each', () => {
    expect(assertPlan(['TASK-021', 'TASK-030', 'TASK-021'], '2026-10-19', plan)).toEqual([
      'TASK-021',
      'TASK-030',
    ]);
    expect(catchAppError(() => assertPlan(['TASK-014'], '2026-10-12', plan)).message).toMatch(
      /already verified/,
    );
    expect(catchAppError(() => assertPlan(['TASK-999'], '2026-10-12', plan)).code).toBe(
      'NOT_FOUND',
    );
    expect(catchAppError(() => assertPlan(['TASK-021'], '2026-10-05', plan)).code).toBe(
      'INVALID_TRANSITION',
    );
  });

  it('says what stops a planned task', () => {
    const view = (id: string) => planItem(find(seed.tasks, id), seed.facts, SEED_NOW);
    expect(view('TASK-021').blocker).toBe('Waiting on FS-04 (client confirms on the Fact Sheet)');
    expect(view('TASK-018').blocker).toBe('Waiting for client approval');
    const gated = planItem(find(seed.tasks, 'TASK-030'), seed.facts, SEED_NOW, {
      productFactsConfirmed: false,
      landingPageReady: false,
      creativeApproved: true,
      budgetAndMonitoringApproved: true,
    });
    expect(gated.blocker).toBe('Ad gates: 2/4 passed');
    expect(view('TASK-027')).toMatchObject({ done: true });
    expect(view('TASK-027').blocker).toBeUndefined();
  });
});

describe('the weekly report', () => {
  const draft: WeeklyReport = {
    id: 'WR-2026-10-12',
    week: '2026-10-12',
    status: 'draft',
    done: '- Something shipped',
    blocked: '',
    next: '- The next thing',
    createdAt: '',
    updatedAt: '',
    events: [],
  };

  it('is sent with done and next filled in, and only once', () => {
    expect(assertSendable(draft, draft.week)).toBe(draft);
    expect(
      catchAppError(() => assertSendable({ ...draft, next: ' ' }, draft.week)).message,
    ).toMatch(/needs next/);
    expect(catchAppError(() => assertSendable(undefined, draft.week)).code).toBe('VALIDATION');
    expect(catchAppError(() => assertSendable({ ...draft, status: 'sent' }, draft.week)).code).toBe(
      'INVALID_TRANSITION',
    );
  });

  it("takes the week's numbers from the funnel and paid channels, CPL as text", () => {
    const seed = freshSeed();
    const n = reportNumbers('2026-10-05', seed.funnel, seed.recon);
    expect(n.paid.map((p) => [p.channel, p.cplText])).toEqual([
      ['google_search', '$66.67'],
      ['meta_ads', 'no valid leads yet, spent $240.00'],
    ]);
    expect(n.visits).toBe(1_480);
  });
});
