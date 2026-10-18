import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { FunnelWeek } from '@campaign-ops/core';
import { fmtDay } from '@/lib/format';

const LAYERS: { key: keyof Omit<FunnelWeek, 'weekStart'>; label: string }[] = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'visits', label: 'Visits' },
  { key: 'validLeads', label: 'Valid leads (CRM)' },
  { key: 'deposits', label: 'Deposits' },
];

/** Four small multiples, each on its own scale (impressions and deposits differ by 10⁴). No pie charts. */
export function FunnelChart({
  thisWeek,
  lastWeek,
}: {
  thisWeek: FunnelWeek;
  lastWeek: FunnelWeek;
}) {
  return (
    <figure className="grid gap-3">
      <figcaption className="flex flex-wrap gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[1px] bg-chart-previous" aria-hidden /> Last week (from{' '}
          {fmtDay(lastWeek.weekStart)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[1px] bg-rail-2" aria-hidden /> This week to date (from{' '}
          {fmtDay(thisWeek.weekStart)})
        </span>
      </figcaption>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-4">
        {LAYERS.map(({ key, label }) => {
          const data = [
            { name: 'Last', v: lastWeek[key], fill: 'var(--color-chart-previous)' },
            { name: 'This', v: thisWeek[key], fill: 'var(--color-rail-2)' },
          ];
          return (
            <div key={key} className="bg-surface px-3 pb-1 pt-2.5">
              <p className="text-xs font-semibold text-ink">{label}</p>
              <div
                className="h-28"
                role="img"
                aria-label={`${label}: last week ${lastWeek[key]}, this week ${thisWeek[key]}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    margin={{ top: 18, right: 4, bottom: 0, left: 4 }}
                    barCategoryGap="22%"
                  >
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={{ stroke: 'var(--color-rule)' }}
                      tick={{ fontSize: 11, fill: 'var(--color-ink-3)' }}
                    />
                    <YAxis hide domain={[0, 'dataMax']} />
                    <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      <LabelList
                        dataKey="v"
                        position="top"
                        formatter={(v: number) => v.toLocaleString('en-NZ')}
                        style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          fill: 'var(--color-ink)',
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
