import { ExternalLink } from '@/components/shared/ExternalLink';
import type { Brief, Receipt } from '@campaign-ops/core';
import { FactChip } from '@/components/shared/FactChip';
import { JsonPeek } from '@/components/shared/JsonPeek';
import { Facts } from '@/components/shared/Layout';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ReceiptView({ brief, receipt }: { brief: Brief; receipt: Receipt }) {
  const outside = receipt.factsUsed.filter((f) => !brief.allowedFacts.includes(f));
  const over = receipt.creditsUsed > brief.costCap.maxCredits;
  const pct = Math.min(100, (receipt.creditsUsed / brief.costCap.maxCredits) * 100);
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-md border border-rule">
        <table className="data-table min-w-[36rem]">
          <thead>
            <tr>
              <th scope="col">Asset</th>
              <th scope="col">Ratio</th>
              <th scope="col">Length</th>
              <th scope="col">Checksum</th>
            </tr>
          </thead>
          <tbody>
            {receipt.assets.map((a) => (
              <tr key={a.assetId}>
                <td>
                  <ExternalLink href={a.url} className="font-mono">
                    {a.assetId}
                  </ExternalLink>
                </td>
                <td className="font-mono">{a.ratio}</td>
                <td className="font-mono">{a.durationSec} s</td>
                <td className="font-mono text-ink-2">{a.checksum}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Facts
        rows={[
          ['Delivered', <span className="font-mono">{fmtDateTime(receipt.deliveredAt)}</span>],
          [
            'Facts used',
            <span className="flex flex-wrap items-center gap-1.5">
              {receipt.factsUsed.map((f) => (
                <FactChip key={f} id={f} />
              ))}
              {outside.length ? (
                <span className="text-xs font-semibold text-bad">
                  {outside.join(', ')} outside allowed facts
                </span>
              ) : (
                <span className="text-xs text-ok">⊆ allowed facts</span>
              )}
            </span>,
          ],
          [
            'Music licence',
            receipt.musicLicense.proof ? (
              <ExternalLink href={receipt.musicLicense.proof}>Licence proof</ExternalLink>
            ) : (
              <span className="font-semibold text-bad">Missing</span>
            ),
          ],
          [
            'Credits',
            <span className="grid max-w-64 gap-1">
              <span className={cn('font-mono', over && 'font-semibold text-bad')}>
                {receipt.creditsUsed} / {brief.costCap.maxCredits}
              </span>
              <span className="h-1.5 overflow-hidden rounded-sm bg-panel" aria-hidden>
                <span
                  className={cn('block h-full', over ? 'bg-bad' : 'bg-rail-2')}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </span>,
          ],
          [
            'Render attempts',
            <span className="font-mono">
              {receipt.renderAttempts} (max re-renders {brief.costCap.maxRerenders})
            </span>,
          ],
          [
            'Issues',
            receipt.issues.length ? (
              <span className="text-warn">{receipt.issues.join('; ')}</span>
            ) : (
              '—'
            ),
          ],
        ]}
      />
      <JsonPeek value={receipt} label={`Receipt ${receipt.version} JSON`} />
    </div>
  );
}
