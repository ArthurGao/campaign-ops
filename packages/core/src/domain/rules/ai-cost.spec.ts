import { freshSeed, PM } from '../../testing/fixtures';
import type { AgentRun, Brief, TimeEntry } from '../types';
import { aiCost } from './ai-cost';

// Monday 5 Oct and Monday 12 Oct 2026, Pacific/Auckland (UTC+13).
const W1 = '2026-10-05';
const W2 = '2026-10-12';

const run = (agent: AgentRun['agent'], startedAt: string, minutes: number, tokens: number) =>
  ({
    id: `RUN-${startedAt}`,
    agent,
    trigger: 'manual',
    inputs: {},
    status: 'completed',
    startedAt,
    finishedAt: new Date(new Date(startedAt).getTime() + minutes * 60_000).toISOString(),
    costEstimate: { tokens, usd: tokens / 100_000 },
    outputs: [],
    requestedBy: PM,
    createdAt: startedAt,
    updatedAt: startedAt,
    events: [],
  }) satisfies AgentRun;

const brief = (credits: number[], cap: number) =>
  ({
    costCap: { maxRerenders: 2, maxCredits: cap },
    receipts: credits.map((c, i) => ({
      version: `v${i + 1}`,
      deliveredAt: '2026-10-06T23:00:00.000Z', // Wed 7 Oct NZ
      assets: [],
      factsUsed: [],
      musicLicense: { status: 'licensed' },
      creditsUsed: c,
      renderAttempts: 1,
      issues: [],
    })),
  }) as unknown as Brief;

const check = (week: string, hours: number, category: TimeEntry['category'] = 'audit') =>
  ({ id: 'T', week, date: week, category, hours, actor: PM, createdAt: '' }) satisfies TimeEntry;

describe('AI cost (source: AI is not free — record real usage, estimate from it)', () => {
  const view = aiCost({
    runs: [
      run('audit', '2026-10-05T01:00:00.000Z', 12, 40_000),
      run('outbound', '2026-10-07T01:00:00.000Z', 3, 6_000),
      run('feedback', '2026-10-13T01:00:00.000Z', 1.5, 20_000),
      {
        ...run('audit', '2026-10-14T01:00:00.000Z', 0, 0),
        status: 'queued',
        startedAt: undefined,
        finishedAt: undefined,
        costEstimate: undefined,
      },
    ],
    briefs: [brief([12, 15], 20), brief([], 10)],
    timeEntries: [check(W1, 1.5), check(W1, 0.5), check(W1, 3, 'site'), check(W2, 1)],
    firstWeek: W1,
    currentWeek: W2,
  });

  it('adds runs, machine time, tokens and cost per week; queued runs have none yet', () => {
    expect(view.weeks.map((w) => [w.week, w.runs, w.machineMinutes, w.tokens, w.usd])).toEqual([
      [W1, 2, 15, 46_000, 0.46],
      [W2, 1, 1.5, 20_000, 0.2],
    ]);
  });

  it('counts factory credits by delivery week and PM check time from "Audit and AI checks"', () => {
    expect(view.weeks.map((w) => [w.factoryCredits, w.checkHours])).toEqual([
      [27, 2],
      [0, 1],
    ]);
    expect(view.factory).toEqual({ credits: 27, capCredits: 30, renders: 2 });
  });

  it('splits the totals by agent', () => {
    expect(view.byAgent.map((a) => [a.agent, a.runs, a.tokens])).toEqual([
      ['audit', 1, 40_000],
      ['outbound', 1, 6_000],
      ['feedback', 1, 20_000],
    ]);
  });

  it('estimates the weeks ahead from full weeks only', () => {
    expect(view.perWeek).toMatchObject({
      runs: 2,
      tokens: 46_000,
      factoryCredits: 27,
      checkHours: 2,
    });
    expect(
      aiCost({ runs: [], briefs: [], timeEntries: [], firstWeek: W2, currentWeek: W2 }).perWeek,
    ).toBeNull();
  });

  it('reads the seed without gaps: every campaign week up to now', () => {
    const seed = freshSeed();
    const v = aiCost({
      runs: seed.runs,
      briefs: seed.briefs,
      timeEntries: seed.timeEntries,
      firstWeek: '2026-09-28',
      currentWeek: W2,
    });
    expect(v.weeks.map((w) => w.week)).toEqual(['2026-09-28', W1, W2]);
    expect(v.weeks.reduce((n, w) => n + w.tokens, 0)).toBe(
      seed.runs.reduce((n, r) => n + (r.startedAt ? (r.costEstimate?.tokens ?? 0) : 0), 0),
    );
  });
});
