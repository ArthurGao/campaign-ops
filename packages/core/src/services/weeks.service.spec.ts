import { FixedClock, ManualScheduler } from '../domain/clock';
import { createCore } from '../create-core';
import { APPROVER, catchAppError, expectCode, PM, SEED_NOW } from '../testing/fixtures';

function setup() {
  const clock = new FixedClock(SEED_NOW);
  const core = createCore({ clock, scheduler: new ManualScheduler() });
  return { core, clock };
}

describe('WeeksService', () => {
  it('opens on the current campaign week with the seeded plan, hours and no report yet', () => {
    const { core } = setup();
    const w = core.weeks.get();
    expect([w.week, w.number, w.isCurrent, w.isPast]).toEqual(['2026-10-12', 3, true, false]);
    expect(w.plan.map((i) => i.taskId)).toEqual([
      'TASK-018',
      'TASK-021',
      'TASK-022',
      'TASK-024',
      'TASK-030',
      'TASK-033',
    ]);
    expect([w.hours.total, w.hours.plannedTotal, w.hours.remaining]).toEqual([9.5, 16, 6.5]);
    expect(w.report).toBeUndefined();
    expect(w.plan.find((i) => i.taskId === 'TASK-030')?.blocker).toBe('Ad gates: 2/4 passed');
    expect(core.dashboard.get().hoursThisWeek).toEqual({ used: 9.5, cap: 16 });
  });

  it('lists the campaign weeks newest first, with the coming week open for planning', () => {
    const { core } = setup();
    expect(core.weeks.list().map((w) => [w.week, w.number, w.reportStatus ?? '-'])).toEqual([
      ['2026-10-19', 4, '-'],
      ['2026-10-12', 3, '-'],
      ['2026-10-05', 2, 'sent'],
      ['2026-09-28', 1, 'sent'],
    ]);
    expect(core.weeks.get('2026-10-05').hours).toMatchObject({ total: 16.5, overCap: true });
  });

  it('logs time for the PM only, and the dashboard follows', () => {
    const { core } = setup();
    const w = core.weeks.logTime('2026-10-12', { category: 'ads', hours: 1.5 }, PM);
    expect(w.hours.used.ads).toBe(3.5);
    expect(w.entries.at(-1)).toMatchObject({ date: '2026-10-15', category: 'ads', hours: 1.5 });
    expect(core.dashboard.get().hoursThisWeek.used).toBe(11);
    expectCode(
      () => core.weeks.logTime('2026-10-12', { category: 'ads', hours: 1 }, APPROVER),
      'FORBIDDEN',
    );
    expect(
      catchAppError(() =>
        core.weeks.logTime('2026-10-12', { category: 'ads', hours: 1, date: '2026-10-20' }, PM),
      ).message,
    ).toMatch(/not in the week/);
  });

  it('plans the coming week, and that plan becomes next in the report draft', () => {
    const { core } = setup();
    core.weeks.setPlan('2026-10-19', ['TASK-019', 'TASK-026'], PM);
    const draft = core.weeks.get().draft;
    expect(draft.next).toEqual([
      "TASK-019 FAQ block: 'Is there a guided China tour from Auckland?'",
      'TASK-026 Guilin river day — 9:16 and 1:1',
    ]);
    expect(draft.blocked).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^TASK-021 .*: /),
        expect.stringMatching(/^E-03 .*\(blocks ads\)$/),
      ]),
    );
    expectCode(() => core.weeks.setPlan('2026-10-05', ['TASK-019'], PM), 'INVALID_TRANSITION');
  });

  it('drafts done lines from what moved this week', () => {
    const { core } = setup();
    core.tasks.transition('TASK-020', { to: 'live' }, { role: 'executor', name: 'Tom Walsh' });
    expect(core.weeks.get().draft.done).toContain(
      'TASK-020 YouTube description — itinerary highlights video: live',
    );
  });

  it('saves a draft, sends it once with a numbers snapshot, and then refuses edits', () => {
    const { core } = setup();
    core.weeks.saveReport('2026-10-12', { done: '- A', blocked: '- B', next: '' }, PM);
    expect(catchAppError(() => core.weeks.sendReport('2026-10-12', PM)).message).toMatch(
      /needs next/,
    );
    core.weeks.saveReport('2026-10-12', { next: '- C' }, PM);
    const sent = core.weeks.sendReport('2026-10-12', PM).report;
    expect(sent).toMatchObject({
      status: 'sent',
      done: '- A',
      blocked: '- B',
      next: '- C',
      sentBy: PM,
    });
    expect(sent?.numbers?.paid.map((p) => p.channel)).toEqual(['google_search', 'meta_ads']);
    expectCode(
      () => core.weeks.saveReport('2026-10-12', { done: '- X' }, PM),
      'INVALID_TRANSITION',
    );
    expectCode(() => core.weeks.sendReport('2026-10-12', PM), 'INVALID_TRANSITION');
    expectCode(() => core.weeks.saveReport('2026-10-05', { done: '- X' }, APPROVER), 'FORBIDDEN');
  });
});
