import type { ReconChannelSummary, ReconRow } from '@campaign-ops/core';
import { fmtDay, humanize, money, noValidLeadsText } from '@/lib/format';
import { cn } from '@/lib/utils';

/** UX rule 7: a channel with spend and zero valid leads says so instead of showing 0, ∞ or NaN. */
export function CplCell({ spendCents, cpl }: { spendCents: number; cpl?: number | null }) {
  if (cpl === undefined) return <span className="text-ink-3">no paid spend</span>;
  if (cpl === null)
    return <span className="font-medium text-bad">{noValidLeadsText(spendCents)}</span>;
  return <span className="font-mono">{money(cpl)}</span>;
}

/** Platform-reported ÷ CRM valid; > 1.3 is flagged. */
export function RatioCell({ ratio }: { ratio?: number | null }) {
  if (ratio === undefined) return <span className="text-ink-3">—</span>;
  if (ratio === null) return <span className="text-bad">platform only</span>;
  return (
    <span className={cn('font-mono', ratio > 1.3 && 'font-semibold text-warn')}>
      {ratio.toFixed(2)}×{ratio > 1.3 ? <span className="sr-only"> (over-reporting)</span> : null}
    </span>
  );
}

export function ReconTable({ rows }: { rows: ReconRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[48rem]">
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Channel</th>
            <th scope="col" className="text-right">
              Spend
            </th>
            <th scope="col" className="text-right">
              Platform conversions
            </th>
            <th scope="col" className="text-right">
              CRM valid leads
            </th>
            <th scope="col">Paid CPL</th>
            <th scope="col">Over-report</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const firstOfWeek = i === 0 || rows[i - 1].weekStart !== r.weekStart;
            return (
              <tr
                key={`${r.weekStart}-${r.channel}`}
                className={cn(firstOfWeek && i > 0 && 'border-t-2 border-rule')}
              >
                <td className="whitespace-nowrap font-mono text-[0.78rem]">
                  {firstOfWeek ? fmtDay(r.weekStart) : ''}
                </td>
                <td>{humanize(r.channel)}</td>
                <td className="text-right font-mono">
                  {r.spendCents ? money(r.spendCents) : <span className="text-ink-3">—</span>}
                </td>
                <td className="text-right font-mono">{r.platformReportedConversions}</td>
                <td className="text-right font-mono font-semibold">{r.crmValidLeads}</td>
                <td>
                  <CplCell spendCents={r.spendCents} cpl={r.paidCpl} />
                </td>
                <td>
                  <RatioCell ratio={r.overReportRatio} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReconSummary({ byChannel }: { byChannel: ReconChannelSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[40rem]">
        <thead>
          <tr>
            <th scope="col">Channel (3 weeks)</th>
            <th scope="col" className="text-right">
              Spend
            </th>
            <th scope="col" className="text-right">
              Platform
            </th>
            <th scope="col" className="text-right">
              CRM valid
            </th>
            <th scope="col">Paid CPL</th>
            <th scope="col">Over-report</th>
          </tr>
        </thead>
        <tbody>
          {byChannel.map((c) => (
            <tr key={c.channel}>
              <td>{humanize(c.channel)}</td>
              <td className="text-right font-mono">{c.spendCents ? money(c.spendCents) : '—'}</td>
              <td className="text-right font-mono">{c.platformReportedConversions}</td>
              <td className="text-right font-mono font-semibold">{c.crmValidLeads}</td>
              <td>
                <CplCell spendCents={c.spendCents} cpl={c.paidCpl} />
              </td>
              <td>
                <RatioCell ratio={c.overReportRatio} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
