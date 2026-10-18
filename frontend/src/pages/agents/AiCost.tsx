import type { AiCostLine, AiCostView, AiCostWeek } from '@campaign-ops/core';
import { copy } from '@/lib/copy';
import { fmtDay, humanize, num } from '@/lib/format';

const usd = (n: number) => `$${n.toFixed(2)}`;

function LineCells({ l }: { l: AiCostLine }) {
  return (
    <>
      <td className="text-right font-mono">{num(l.runs)}</td>
      <td className="text-right font-mono">{num(l.machineMinutes)} min</td>
      <td className="text-right font-mono">{num(l.tokens)}</td>
      <td className="text-right font-mono">{usd(l.usd)}</td>
    </>
  );
}

const LINE_HEAD = ['Runs', 'Machine time', 'Tokens', 'Model cost (US$)'];

function LineHead() {
  return (
    <>
      {LINE_HEAD.map((h) => (
        <th key={h} scope="col" className="text-right">
          {h}
        </th>
      ))}
    </>
  );
}

/** A week (or the estimate): the run line plus factory credits and the PM's check time. */
function WeekCells({ w }: { w: Omit<AiCostWeek, 'week'> }) {
  return (
    <>
      <LineCells l={w} />
      <td className="text-right font-mono">{num(w.factoryCredits)}</td>
      <td className="text-right font-mono">{w.checkHours} h</td>
    </>
  );
}

/** Source "AI 不是免费的": machine time and cost next to the PM's check time, per week. */
export function AiCost({ cost }: { cost: AiCostView }) {
  const current = cost.weeks.at(-1)?.week;
  return (
    <div className="grid gap-4">
      <p className="max-w-[80ch] text-sm text-ink-2">{copy.aiCost.intro}</p>
      <div className="overflow-x-auto rounded-md border border-rule bg-surface">
        <table className="data-table min-w-[52rem]">
          <thead>
            <tr>
              <th scope="col">Week</th>
              <LineHead />
              <th scope="col" className="text-right">
                Factory credits
              </th>
              <th scope="col" className="text-right">
                PM check time
              </th>
            </tr>
          </thead>
          <tbody>
            {[...cost.weeks].reverse().map((w) => (
              <tr key={w.week}>
                <td className="whitespace-nowrap font-medium text-ink">
                  {fmtDay(w.week)}
                  {w.week === current ? ' (to date)' : ''}
                </td>
                <WeekCells w={w} />
              </tr>
            ))}
          </tbody>
          {cost.perWeek ? (
            <tfoot>
              <tr className="border-t-2 border-rule">
                <td className="font-semibold">Estimate per week</td>
                <WeekCells w={cost.perWeek} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-x-auto rounded-md border border-rule bg-surface">
          <table className="data-table min-w-[32rem]">
            <thead>
              <tr>
                <th scope="col">Agent</th>
                <LineHead />
              </tr>
            </thead>
            <tbody>
              {cost.byAgent.map((a) => (
                <tr key={a.agent}>
                  <td className="font-medium text-ink">{humanize(a.agent)}</td>
                  <LineCells l={a} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="grid content-start gap-1 rounded-md border border-rule bg-surface p-3 text-sm">
          <dt className="text-xs font-semibold text-ink-2">Video factory</dt>
          <dd className="font-mono">
            {num(cost.factory.credits)} of {num(cost.factory.capCredits)} credits
          </dd>
          <dd className="text-ink-2">
            {num(cost.factory.renders)} renders, re-renders capped per brief
          </dd>
        </dl>
      </div>
    </div>
  );
}
