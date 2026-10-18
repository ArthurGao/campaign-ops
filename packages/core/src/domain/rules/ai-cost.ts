import { AGENT_IDS } from '../enums';
import type {
  AgentRun,
  AiCostLine,
  AiCostView,
  AiCostWeek,
  Brief,
  TimeEntry,
  WeekId,
} from '../types';
import { weekOf, weekRange } from './week';

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

function line(runs: readonly AgentRun[]): AiCostLine {
  const started = runs.filter((r) => r.startedAt);
  const minutes = started.reduce(
    (n, r) =>
      n + (r.finishedAt ? (Date.parse(r.finishedAt) - Date.parse(r.startedAt!)) / 60_000 : 0),
    0,
  );
  return {
    runs: started.length,
    machineMinutes: round(minutes, 1),
    tokens: started.reduce((n, r) => n + (r.costEstimate?.tokens ?? 0), 0),
    usd: round(
      started.reduce((n, r) => n + (r.costEstimate?.usd ?? 0), 0),
      2,
    ),
  };
}

/**
 * Source "AI 不是免费的": machine time, tokens and cost per week and per agent, factory credits,
 * and the PM's check time ("Audit and AI checks" hours). The full weeks' average is the estimate.
 */
export function aiCost(input: {
  runs: readonly AgentRun[];
  briefs: readonly Brief[];
  timeEntries: readonly TimeEntry[];
  firstWeek: WeekId;
  currentWeek: WeekId;
}): AiCostView {
  const { runs, briefs, timeEntries, firstWeek, currentWeek } = input;
  const receipts = briefs.flatMap((b) => b.receipts);
  const weeks: AiCostWeek[] = weekRange(firstWeek, currentWeek).map((w) => ({
    week: w,
    ...line(runs.filter((r) => r.startedAt && weekOf(r.startedAt) === w)),
    factoryCredits: receipts
      .filter((r) => weekOf(r.deliveredAt) === w)
      .reduce((n, r) => n + r.creditsUsed, 0),
    checkHours: timeEntries
      .filter((e) => e.week === w && e.category === 'audit')
      .reduce((n, e) => n + e.hours, 0),
  }));

  const full = weeks.filter((w) => w.week < currentWeek);
  const avg = (k: keyof Omit<AiCostWeek, 'week'>, digits: number) =>
    round(full.reduce((n, w) => n + w[k], 0) / full.length, digits);
  return {
    weeks,
    byAgent: AGENT_IDS.map((agent) => ({ agent, ...line(runs.filter((r) => r.agent === agent)) })),
    factory: {
      credits: receipts.reduce((n, r) => n + r.creditsUsed, 0),
      capCredits: briefs.reduce((n, b) => n + b.costCap.maxCredits, 0),
      renders: receipts.reduce((n, r) => n + r.renderAttempts, 0),
    },
    perWeek: full.length
      ? {
          runs: avg('runs', 1),
          machineMinutes: avg('machineMinutes', 1),
          tokens: avg('tokens', 0),
          usd: avg('usd', 2),
          factoryCredits: avg('factoryCredits', 1),
          checkHours: avg('checkHours', 2),
        }
      : null,
  };
}
