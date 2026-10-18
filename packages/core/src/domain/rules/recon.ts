import { PAID_RECON_CHANNELS, type ReconChannel } from '../enums';
import type { ReconChannelSummary, ReconRow } from '../types';
import { formatNzd } from './money';

/**
 * R6 paid CPL = spend ÷ de-duplicated valid leads.
 * undefined: no spend (not a paid channel this week); null: spend but zero valid leads.
 */
export function paidCpl(spendCents: number, validLeads: number): number | null | undefined {
  if (spendCents <= 0) return undefined;
  if (validLeads === 0) return null;
  return Math.round(spendCents / validLeads);
}

/** Platform-reported ÷ CRM valid. null when the CRM has none but the platform reports some. */
export function overReportRatio(
  platformReported: number,
  validLeads: number,
): number | null | undefined {
  if (validLeads === 0) return platformReported > 0 ? null : undefined;
  return Math.round((platformReported / validLeads) * 100) / 100;
}

export function cplText(spendCents: number, validLeads: number): string {
  const cpl = paidCpl(spendCents, validLeads);
  if (cpl === undefined) return 'no paid spend';
  if (cpl === null) return `no valid leads yet, spent ${formatNzd(spendCents)}`;
  return formatNzd(cpl);
}

export function withDerived(row: ReconRow): ReconRow {
  return {
    ...row,
    paidCpl: paidCpl(row.spendCents, row.crmValidLeads),
    overReportRatio: overReportRatio(row.platformReportedConversions, row.crmValidLeads),
  };
}

export function summarize(rows: readonly ReconRow[]): {
  byChannel: ReconChannelSummary[];
  totals: Omit<ReconChannelSummary, 'channel'>;
} {
  const byChannel = new Map<string, ReconChannelSummary>();
  for (const r of rows) {
    const s = byChannel.get(r.channel) ?? {
      channel: r.channel,
      spendCents: 0,
      platformReportedConversions: 0,
      crmValidLeads: 0,
    };
    s.spendCents += r.spendCents;
    s.platformReportedConversions += r.platformReportedConversions;
    s.crmValidLeads += r.crmValidLeads;
    byChannel.set(r.channel, s);
  }
  const channels = [...byChannel.values()].map((s) => ({
    ...s,
    paidCpl: paidCpl(s.spendCents, s.crmValidLeads),
    overReportRatio: overReportRatio(s.platformReportedConversions, s.crmValidLeads),
  }));
  const t = channels.reduce(
    (acc, s) => ({
      spendCents: acc.spendCents + s.spendCents,
      platformReportedConversions: acc.platformReportedConversions + s.platformReportedConversions,
      crmValidLeads: acc.crmValidLeads + s.crmValidLeads,
    }),
    { spendCents: 0, platformReportedConversions: 0, crmValidLeads: 0 },
  );
  // Total paid CPL only counts valid leads attributed to paid channels.
  const paid = channels.filter((s) =>
    (PAID_RECON_CHANNELS as readonly ReconChannel[]).includes(s.channel),
  );
  const paidValid = paid.reduce((n, s) => n + s.crmValidLeads, 0);
  return {
    byChannel: channels,
    totals: {
      ...t,
      paidCpl: paidCpl(t.spendCents, paidValid),
      overReportRatio: overReportRatio(t.platformReportedConversions, t.crmValidLeads),
    },
  };
}
