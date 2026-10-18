import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReconRow } from '@campaign-ops/core';
import { fmtDay, humanize } from '@/lib/format';

const PAID = ['google_search', 'meta_ads'];

/** Platform-reported vs CRM valid per paid channel per week. CRM is the ledger. */
export function ReconChart({ rows }: { rows: ReconRow[] }) {
  const data = rows
    .filter((r) => PAID.includes(r.channel))
    .map((r) => ({
      label: `${fmtDay(r.weekStart)} · ${humanize(r.channel)}`,
      platform: r.platformReportedConversions,
      crm: r.crmValidLeads,
    }));
  return (
    <figure className="rounded-md border border-rule bg-surface p-3">
      <figcaption className="mb-2 text-xs text-ink-2">
        Paid channels: what the platform claims vs valid leads in the CRM
      </figcaption>
      <div
        className="h-64"
        role="img"
        aria-label="Bar chart of platform-reported conversions and CRM valid leads per paid channel per week"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--color-rule)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--color-ink-3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-rule)' }}
              interval={0}
              height={42}
              angle={-12}
              textAnchor="end"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--color-ink-3)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-panel)' }}
              contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: 'var(--color-rule)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(v: string) => <span style={{ color: 'var(--color-ink-2)' }}>{v}</span>}
            />
            <Bar
              dataKey="platform"
              name="Platform-reported"
              fill="var(--color-chart-previous)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="crm"
              name="CRM valid leads"
              fill="var(--color-rail-2)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
