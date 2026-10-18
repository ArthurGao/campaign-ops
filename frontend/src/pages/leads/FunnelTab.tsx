import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  FUNNEL_LAYERS,
  FUNNEL_STEPS,
  type FunnelLine,
  type FunnelStepView,
  type FunnelWeekView,
} from '@campaign-ops/core';
import { Section } from '@/components/shared/Layout';
import { SourceLink } from '@/components/shared/SourceLink';
import { SimpleSelect } from '@/components/ui/select';
import { copy } from '@/lib/copy';
import { changeText, fmtDay, humanize, pct } from '@/lib/format';
import { cn } from '@/lib/utils';

function Count({ n }: { n: number | null }) {
  if (n === null) return <span className="text-ink-3">—</span>;
  return <>{n.toLocaleString('en-NZ')}</>;
}

function RateCell({ step, broken }: { step: FunnelStepView; broken: boolean }) {
  if (step.rate === null) return <span className="text-ink-3">—</span>;
  return (
    <span className="grid justify-items-end leading-tight">
      <span className={cn(step.lowSample && 'text-ink-3', broken && 'font-semibold text-bad')}>
        {pct(step.rate)}
      </span>
      {step.lowSample ? (
        <span className="text-[0.7rem] text-ink-3">{copy.funnel.lowSample}</span>
      ) : step.change !== null ? (
        <span className={cn('text-[0.7rem]', step.fell ? 'text-bad' : 'text-ink-3')}>
          {changeText(step.change)}
        </span>
      ) : null}
    </span>
  );
}

function BreakCell({ line }: { line: FunnelLine }) {
  if (!line.breakPoint) return <span className="text-ink-3">{copy.funnel.noBreak}</span>;
  return (
    <span className="grid max-w-[16rem] gap-0.5 leading-snug">
      <span className="font-semibold text-bad">{copy.funnel.steps[line.breakPoint]}</span>
      <span className="text-[0.75rem] text-ink-2">{copy.funnel.check[line.breakPoint]}</span>
    </span>
  );
}

function FunnelTable({
  first,
  rows,
}: {
  first: string;
  rows: { key: string; label: ReactNode; line: FunnelLine }[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[56rem]">
        <thead>
          <tr>
            <th scope="col">{first}</th>
            <th scope="col" className="text-right">
              {copy.funnel.layers.impressions}
            </th>
            {/* Reading order: impressions, rate, visits, rate, valid leads, rate, deposits. */}
            {FUNNEL_STEPS.flatMap((s) => [
              <th key={`${s}-rate`} scope="col" className="text-right text-ink-3">
                {copy.funnel.steps[s]}
              </th>,
              <th key={s} scope="col" className="text-right">
                {copy.funnel.layers[FUNNEL_LAYERS[s][1]]}
              </th>,
            ])}
            <th scope="col">Break point</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, line }) => (
            <tr key={key} className={cn(line.breakPoint && 'bg-bad-soft/40')}>
              <td className="whitespace-nowrap font-medium text-ink">{label}</td>
              <td className="text-right font-mono">
                <Count n={line.impressions} />
              </td>
              {FUNNEL_STEPS.flatMap((s) => {
                const layer = FUNNEL_LAYERS[s][1];
                return [
                  <td key={`${s}-rate`} className="text-right font-mono text-[0.78rem]">
                    <RateCell step={line.steps[s]} broken={line.breakPoint === s} />
                  </td>,
                  <td
                    key={s}
                    className={cn(
                      'text-right font-mono',
                      layer === 'validLeads' && 'font-semibold',
                    )}
                  >
                    <Count n={line[layer]} />
                  </td>,
                ];
              })}
              <td>
                <BreakCell line={line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Source week-4 review: look at the funnel layer by layer and find where it breaks. */
export function FunnelTab({ weeks }: { weeks: FunnelWeekView[] }) {
  const [picked, setPicked] = useState<string>();
  const week = weeks.find((w) => w.weekStart === picked) ?? weeks.at(-1);
  // Newest first; the latest week is still in progress.
  const listed = [...weeks].reverse().map((w, i) => ({
    w,
    label: `${fmtDay(w.weekStart)}${i === 0 ? ` (${copy.funnel.partial})` : ''}`,
  }));

  return (
    <div className="grid gap-6">
      <p className="max-w-[80ch] text-sm text-ink-2">
        {copy.funnel.intro} <SourceLink anchor="term-funnel" what="the four funnel layers" />
      </p>
      <Section title="By week, all channels">
        <FunnelTable
          first="Week"
          rows={listed.map(({ w, label }) => ({ key: w.weekStart, label, line: w.total }))}
        />
      </Section>
      {week ? (
        <Section
          title="By channel"
          actions={
            <div className="flex items-center gap-3">
              <SimpleSelect
                value={week.weekStart}
                onChange={setPicked}
                options={listed.map(({ w, label }) => ({ value: w.weekStart, label }))}
                className="w-56"
                label="Week"
              />
              <Link
                to="/leads?tab=reconciliation"
                className="text-xs font-medium text-accent hover:underline"
              >
                Spend and CPL →
              </Link>
            </div>
          }
        >
          <FunnelTable
            first="Channel"
            rows={week.channels.map((c) => ({
              key: c.channel,
              label: humanize(c.channel),
              line: c,
            }))}
          />
        </Section>
      ) : null}
    </div>
  );
}
