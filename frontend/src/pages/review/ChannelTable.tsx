import {
  REVIEW_DECISIONS,
  type ReconChannel,
  type ReviewChannelView,
  type ReviewDecision,
  type ReviewView,
} from '@campaign-ops/core';
import { StatusChip } from '@/components/shared/StatusChip';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { copy } from '@/lib/copy';
import { humanize, money } from '@/lib/format';
import { CplCell, RatioCell } from '../leads/ReconTable';

export type Decision = { decision: ReviewDecision; note: string };
export type Decisions = Partial<Record<ReconChannel, Decision>>;

const decisionLabel = (d: ReviewDecision) => copy.review.decisions[d];

function Suggested({ c }: { c: ReviewChannelView }) {
  return (
    <span className="grid justify-items-start gap-1">
      <StatusChip status={c.suggestion} label={decisionLabel(c.suggestion)} />
      <span className="text-[0.75rem] leading-snug text-ink-2">{c.reason}</span>
    </span>
  );
}

/** One row per channel over the review weeks; the PM's decision and note sit next to the rule's call. */
export function ChannelTable({
  view,
  decisions,
  onChange,
}: {
  view: ReviewView;
  decisions: Decisions;
  /** Omitted when the review is read-only (sent, or the role cannot edit). */
  onChange?: (channel: ReconChannel, next: Decision) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[72rem]">
        <thead>
          <tr>
            <th scope="col">Channel</th>
            <th scope="col" className="text-right">
              Spend
            </th>
            <th scope="col" className="text-right">
              Valid leads
            </th>
            <th scope="col" className="text-right">
              Deposits
            </th>
            <th scope="col">Paid CPL</th>
            <th scope="col">Over-report</th>
            <th scope="col">Break point</th>
            <th scope="col">Suggested</th>
            <th scope="col">Decision</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {view.channels.map((c) => {
            const d = decisions[c.channel];
            const label = humanize(c.channel);
            return (
              <tr key={c.channel} id={`review-${c.channel}`}>
                <td className="whitespace-nowrap font-medium text-ink">{label}</td>
                <td className="text-right font-mono">
                  {c.spendCents ? money(c.spendCents) : <span className="text-ink-3">—</span>}
                </td>
                <td className="text-right font-mono font-semibold">{c.validLeads}</td>
                <td className="text-right font-mono">{c.deposits}</td>
                <td>
                  <CplCell spendCents={c.spendCents} cpl={c.paidCpl} />
                </td>
                <td>
                  <RatioCell ratio={c.overReportRatio} />
                </td>
                <td>
                  {c.breakPoint ? (
                    <span className="text-bad">{copy.funnel.steps[c.breakPoint]}</span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="max-w-[16rem]">
                  <Suggested c={c} />
                </td>
                <td>
                  {onChange ? (
                    <SimpleSelect
                      value={d?.decision}
                      onChange={(v) => onChange(c.channel, { decision: v, note: d?.note ?? '' })}
                      options={REVIEW_DECISIONS.map((v) => ({ value: v, label: decisionLabel(v) }))}
                      className="w-28"
                      label={`Decision for ${label}`}
                    />
                  ) : d ? (
                    <StatusChip status={d.decision} label={decisionLabel(d.decision)} />
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="min-w-[14rem]">
                  {onChange ? (
                    <Input
                      value={d?.note ?? ''}
                      onChange={(e) =>
                        onChange(c.channel, {
                          decision: d?.decision ?? c.suggestion,
                          note: e.target.value,
                        })
                      }
                      aria-label={`Note for ${label}`}
                      placeholder="Optional"
                    />
                  ) : (
                    <span className="text-sm text-ink-2">{d?.note || '—'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-rule">
            <td className="font-semibold">All channels</td>
            <td className="text-right font-mono">{money(view.totals.spendCents)}</td>
            <td className="text-right font-mono font-semibold">{view.totals.validLeads}</td>
            <td className="text-right font-mono">{view.totals.deposits}</td>
            <td>
              <CplCell spendCents={view.totals.spendCents} cpl={view.totals.paidCpl} />
            </td>
            <td colSpan={5} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
