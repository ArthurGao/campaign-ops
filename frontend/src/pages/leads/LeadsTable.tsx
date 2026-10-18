import { Link2 } from 'lucide-react';
import type { Lead } from '@campaign-ops/core';
import { Placeholder } from '@/components/shared/Placeholder';
import { StatusChip } from '@/components/shared/StatusChip';
import { fmtDateTime, fmtDate, humanize, minutesText } from '@/lib/format';
import { cn } from '@/lib/utils';

const responseMinutes = (l: Lead) =>
  l.firstResponseAt
    ? Math.round(
        (new Date(l.firstResponseAt).getTime() - new Date(l.receivedAt).getTime()) / 60_000,
      )
    : undefined;

function AdDetail({ l }: { l: Lead }) {
  const a = l.adDetail;
  if (a.resolution === 'unknown')
    return <span className="italic text-ink-3">unknown — not inferred</span>;
  const parts = [
    a.campaignId,
    a.adId,
    a.utmContent,
    a.utmTerm && `“${a.utmTerm}”`,
    a.landingPageVersion && `LP ${a.landingPageVersion}`,
  ].filter(Boolean);
  return (
    <span className="grid gap-0.5">
      <span className="font-mono text-[0.72rem]">{parts.join(' · ')}</span>
      {a.resolution === 'matched_from_platform' ? (
        <span className="text-[0.7rem] text-warn">matched from platform, not captured</span>
      ) : null}
    </span>
  );
}

export function LeadsTable({ leads, onOpen }: { leads: Lead[]; onOpen(id: string): void }) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="data-table min-w-[64rem] [&_td]:px-2 [&_th]:px-2">
        <thead>
          <tr>
            <th scope="col">Lead</th>
            <th scope="col">Received</th>
            <th scope="col">Enquiry</th>
            <th scope="col">Source · self-reported</th>
            <th scope="col">Ad detail</th>
            <th scope="col" className="text-right">
              First response
            </th>
            <th scope="col">Owner</th>
            <th scope="col" className="min-w-[8.5rem]">
              Validity
            </th>
            <th scope="col">Stage</th>
            <th scope="col">Order</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const rm = responseMinutes(l);
            return (
              <tr key={l.id}>
                <td>
                  <button
                    onClick={() => onOpen(l.id)}
                    className="font-mono text-accent hover:underline"
                  >
                    {l.id}
                  </button>
                  {l.mergedFrom?.length ? (
                    <span className="block text-[0.7rem] text-ink-3">
                      merged {l.mergedFrom.join(', ')}
                    </span>
                  ) : null}
                  {l.relatedLeadIds?.length ? (
                    <span
                      className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-ink-2"
                      title="Same contact, different travel need — kept separate"
                    >
                      <Link2 className="size-3" aria-hidden /> {l.relatedLeadIds.join(', ')}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap font-mono text-[0.75rem]">
                  {fmtDateTime(l.receivedAt)}
                </td>
                <td className="min-w-[9rem]">
                  <span className="block">{l.enquiry.tour}</span>
                  <span className="text-[0.75rem] text-ink-2">
                    {l.enquiry.travelDate ?? <Placeholder>[month TBC]</Placeholder>} ·{' '}
                    {l.enquiry.people ?? '?'} pax
                  </span>
                </td>
                <td>
                  <span className="block">{l.source.channelLabel}</span>
                  <span className="font-mono text-[0.7rem] text-ink-3">
                    {[l.source.utmSource, l.source.utmMedium, l.source.utmCampaign]
                      .filter(Boolean)
                      .join(' / ')}
                  </span>
                  {l.selfReportedSource ? (
                    <span className="mt-0.5 block text-[0.72rem] text-ink-2">
                      Says: “{l.selfReportedSource}”
                    </span>
                  ) : null}
                </td>
                <td className="min-w-[9rem]">
                  <AdDetail l={l} />
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap text-right font-mono text-[0.75rem]',
                    rm !== undefined && rm > 240 && 'text-bad',
                  )}
                >
                  {rm !== undefined ? minutesText(rm) : <span className="text-bad">no reply</span>}
                </td>
                <td className="whitespace-nowrap text-[0.8rem]">{l.owner}</td>
                <td>
                  <StatusChip status={l.validity.value} />
                  {l.validity.decidedAt ? (
                    <span className="mt-0.5 block whitespace-nowrap font-mono text-[0.68rem] text-ink-3">
                      {fmtDate(l.validity.decidedAt)}
                    </span>
                  ) : null}
                  {l.validity.reason ? (
                    <span
                      className="line-clamp-2 block text-[0.72rem] text-ink-2"
                      title={l.validity.reason}
                    >
                      {l.validity.reason}
                    </span>
                  ) : null}
                  {l.everValid && l.validity.value !== 'valid' ? (
                    <span className="block text-[0.68rem] text-ok">counted valid before</span>
                  ) : null}
                </td>
                <td>
                  <span className="whitespace-nowrap text-[0.8rem]">{humanize(l.stage)}</span>
                  {l.lostReason ? (
                    <span className="block text-[0.72rem] text-ink-2">{l.lostReason}</span>
                  ) : null}
                </td>
                <td className="min-w-[5.5rem] text-[0.8rem]">
                  {l.order ? (
                    <>
                      {l.order.people} pax ·{' '}
                      {l.order.amountCents !== undefined ? (
                        `$${(l.order.amountCents / 100).toFixed(2)}`
                      ) : (
                        <Placeholder>[price TBC]</Placeholder>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
