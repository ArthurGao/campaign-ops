import { useId, useState } from 'react';
import { HOUR_CATEGORIES, type HourCategory, type WeekView } from '@campaign-ops/core';
import { useLogTime } from '@/api/queries/weeks';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { HoursMeter } from '@/components/shared/HoursMeter';
import { EmptyState, Section } from '@/components/shared/Layout';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';

const label = (c: HourCategory) => copy.week.categories[c];
const h = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, '')} h`;

/** Used hours against the cap; the buffer's share is marked at the right end. */
function BudgetBar({ view }: { view: WeekView }) {
  const { total, cap, overCap, planned } = view.hours;
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-xs text-ink-2">
        <span>
          {h(total)} of {h(cap)} used
          {overCap ? <strong className="ml-2 text-bad">{h(total - cap)} over</strong> : null}
        </span>
        <span>{overCap ? 'Over the weekly budget' : `${h(view.hours.remaining)} left`}</span>
      </div>
      <HoursMeter
        used={total}
        cap={cap}
        buffer={planned.buffer}
        bufferHelp={copy.week.bufferHelp}
      />
    </div>
  );
}

function LogTimeForm({ view }: { view: WeekView }) {
  const id = useId();
  const log = useLogTime();
  const [category, setCategory] = useState<HourCategory>('management');
  const [hours, setHours] = useState('1');
  const [note, setNote] = useState('');
  const future = !view.isCurrent && !view.isPast;
  return (
    <form
      className="grid gap-3 rounded-md border border-rule bg-surface p-4 sm:grid-cols-[minmax(12rem,1fr)_7rem_minmax(12rem,2fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        log.mutate(
          { week: view.week, category, hours: Number(hours), note },
          { onSuccess: () => setNote('') },
        );
      }}
    >
      <Field label="Category" htmlFor={`${id}-c`}>
        <SimpleSelect<HourCategory>
          id={`${id}-c`}
          value={category}
          onChange={setCategory}
          options={HOUR_CATEGORIES.map((c) => ({ value: c, label: label(c) }))}
        />
      </Field>
      <Field label="Hours" htmlFor={`${id}-h`}>
        <Input
          id={`${id}-h`}
          type="number"
          min={0.25}
          max={8}
          step={0.25}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </Field>
      <Field label={category === 'buffer' ? 'What came up' : 'Note'} htmlFor={`${id}-n`}>
        <Input id={`${id}-n`} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ActionButton
        type="submit"
        variant="primary"
        permission="week.edit"
        blockedReason={future ? 'Time is logged once the week has started.' : undefined}
        loading={log.isPending}
      >
        Log time
      </ActionButton>
      <BlockedHint error={log.error} className="sm:col-span-4" />
    </form>
  );
}

export function HoursTab({ view }: { view: WeekView }) {
  const { planned, used } = view.hours;
  return (
    <div className="grid gap-6">
      <Section title="PM hours" id="hours">
        <BudgetBar view={view} />
        <div className="overflow-x-auto rounded-md border border-rule bg-surface">
          <table className="data-table min-w-[36rem]">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="text-right">
                  Planned (week {view.number})
                </th>
                <th scope="col" className="text-right">
                  Used
                </th>
                <th scope="col" className="text-right">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody>
              {HOUR_CATEGORIES.map((c) => {
                const diff = used[c] - planned[c];
                return (
                  <tr key={c} data-category={c}>
                    <th
                      scope="row"
                      className="!bg-transparent !text-[0.8125rem] !font-medium !normal-case !tracking-normal text-ink"
                    >
                      {label(c)}
                      {c === 'buffer' ? (
                        <span className="block text-[0.72rem] font-normal text-ink-3">
                          {copy.week.bufferHelp}
                        </span>
                      ) : null}
                    </th>
                    <td className="text-right font-mono">{planned[c] ? h(planned[c]) : '—'}</td>
                    <td className="text-right font-mono">{used[c] ? h(used[c]) : '—'}</td>
                    <td
                      className={cn(
                        'text-right font-mono',
                        diff > 0 ? 'text-bad' : diff < 0 ? 'text-ink-3' : 'text-ink-2',
                      )}
                    >
                      {diff === 0 ? '0' : `${diff > 0 ? '+' : '−'}${h(Math.abs(diff))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <th
                  scope="row"
                  className="!bg-transparent text-left !text-[0.8125rem] !normal-case !tracking-normal"
                >
                  Total
                </th>
                <td className="text-right font-mono">{h(view.hours.plannedTotal)}</td>
                <td className={cn('text-right font-mono', view.hours.overCap && 'text-bad')}>
                  {h(view.hours.total)}
                </td>
                <td className="text-right font-mono text-ink-2">cap {h(view.hours.cap)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>
      {!view.isPast ? <LogTimeForm view={view} /> : null}
      <Section title="Entries" count={view.entries.length} id="entries">
        {view.entries.length ? (
          <ul className="divide-y divide-rule rounded-md border border-rule bg-surface">
            {[...view.entries].reverse().map((e) => (
              <li
                key={e.id}
                className="grid grid-cols-[5.5rem_minmax(0,14rem)_3.5rem_1fr] max-sm:grid-cols-[5.5rem_minmax(0,1fr)_3.5rem] max-sm:[&>*:last-child]:col-span-3 items-baseline gap-3 px-3 py-2 text-[0.8125rem]"
              >
                <span className="font-mono text-ink-2">{e.date}</span>
                <span className="text-ink">{label(e.category)}</span>
                <span className="text-right font-mono">{h(e.hours)}</span>
                <span className="text-ink-2">{e.note ?? ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No time logged for this week." />
        )}
      </Section>
    </div>
  );
}
