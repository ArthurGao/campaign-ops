import { Link } from 'react-router-dom';
import type { AgentRun } from '@campaign-ops/core';
import { StatusChip } from '@/components/shared/StatusChip';
import { fmtDateTime, humanize } from '@/lib/format';

const duration = (r: AgentRun) =>
  r.startedAt && r.finishedAt
    ? `${Math.max(1, Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))} s`
    : '—';

export function RunsTable({ runs }: { runs: AgentRun[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[52rem]">
        <thead>
          <tr>
            <th scope="col">Run</th>
            <th scope="col">Agent</th>
            <th scope="col">Trigger</th>
            <th scope="col">Status</th>
            <th scope="col">Started</th>
            <th scope="col">Duration</th>
            <th scope="col">Outputs</th>
            <th scope="col" className="text-right">
              Cost (mock)
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const waiting = r.outputs.filter((o) => !o.decision).length;
            const scheduled =
              typeof r.inputs.scheduledFor === 'string'
                ? (r.inputs.scheduledFor as string)
                : undefined;
            return (
              <tr key={r.id}>
                <td>
                  <Link
                    to={`/agents/runs/${r.id}`}
                    className="font-mono text-accent hover:underline"
                  >
                    {r.id}
                  </Link>
                </td>
                <td>{humanize(r.agent)}</td>
                <td className="text-ink-2">{humanize(r.trigger)}</td>
                <td>
                  <StatusChip status={r.status} pulse={r.status === 'running'} />
                  {r.error ? (
                    <span className="mt-0.5 block text-xs text-bad">{r.error}</span>
                  ) : null}
                </td>
                <td className="font-mono text-[0.78rem]">
                  {r.startedAt
                    ? fmtDateTime(r.startedAt)
                    : scheduled
                      ? `due ${fmtDateTime(scheduled)}`
                      : '—'}
                </td>
                <td className="font-mono text-[0.78rem]">{duration(r)}</td>
                <td>
                  <span className="font-mono">{r.outputs.length}</span>
                  {waiting ? (
                    <span className="ml-2 rounded-sm bg-accent-soft px-1.5 py-px text-[0.7rem] font-semibold text-accent-strong">
                      {waiting} to review
                    </span>
                  ) : null}
                </td>
                <td className="text-right font-mono text-[0.78rem] text-ink-2">
                  {r.costEstimate
                    ? `${r.costEstimate.tokens.toLocaleString('en-NZ')} tok · $${r.costEstimate.usd.toFixed(2)}`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
