import type { ReconChannel } from '../domain/enums';
import type { FunnelRow, ReconRow } from '../domain/types';
import { at } from './time';

/** Week starts are Mondays 00:00 Pacific/Auckland; SEED_NOW is Thursday of the third week. */
const WEEKS = [at(-17, '00:00'), at(-10, '00:00'), at(-3, '00:00')];

type Raw = [
  channel: ReconChannel,
  spendCents: number,
  platform: number,
  crmValid: number,
  impressions: number | null,
  visits: number,
  deposits: number,
];

// Seeded weekly aggregates (docs/decisions.md D-26, D-39), one table so the reconciliation and the
// funnel agree on CRM valid leads. Week 2 meta_ads: spend, 700 visits, 0 valid leads. Direct has
// no impressions. Totals per week: 41k / 1,350 / 9 / 1, 46k / 1,480 / 6 / 1, 23k / 760 / 3 / 0.
const RAW: Raw[][] = [
  [
    ['google_search', 18_000, 4, 2, 6_000, 420, 1],
    ['meta_ads', 22_000, 9, 3, 24_000, 600, 0],
    ['organic_search', 0, 3, 2, 8_000, 180, 0],
    ['organic_social', 0, 2, 1, 3_000, 70, 0],
    ['tiktok', 0, 0, 0, 0, 0, 0],
    ['direct', 0, 1, 1, null, 80, 0],
  ],
  [
    ['google_search', 20_000, 5, 3, 7_000, 480, 1],
    ['meta_ads', 24_000, 8, 0, 27_000, 700, 0],
    ['organic_search', 0, 3, 2, 8_500, 190, 0],
    ['organic_social', 0, 1, 1, 3_500, 60, 0],
    ['tiktok', 0, 0, 0, 0, 0, 0],
    ['direct', 0, 1, 0, null, 50, 0],
  ],
  [
    ['google_search', 9_000, 2, 1, 3_500, 230, 0],
    ['meta_ads', 11_000, 6, 1, 13_000, 380, 0],
    ['organic_search', 0, 2, 1, 4_800, 100, 0],
    ['organic_social', 0, 1, 0, 1_700, 25, 0],
    ['tiktok', 0, 0, 0, 0, 0, 0],
    ['direct', 0, 0, 0, null, 25, 0],
  ],
];

/** Raw rows; paidCpl and overReportRatio are computed by domain/rules/recon.ts when served. */
export function reconSeed(): ReconRow[] {
  return RAW.flatMap((week, i) =>
    week.map(([channel, spendCents, platformReportedConversions, crmValidLeads]) => ({
      weekStart: WEEKS[i],
      channel,
      spendCents,
      platformReportedConversions,
      crmValidLeads,
    })),
  );
}

/** Per channel and week by funnel layer; rates and break points come from domain/rules/funnel.ts. */
export function funnelSeed(): FunnelRow[] {
  return RAW.flatMap((week, i) =>
    week.map(([channel, , , validLeads, impressions, visits, deposits]) => ({
      weekStart: WEEKS[i],
      channel,
      impressions,
      visits,
      validLeads,
      deposits,
    })),
  );
}

export type AdSetReport = {
  campaignId: string;
  name: string;
  channel: 'meta_ads' | 'google_search';
  spendCentsLast10Days: number;
  status: 'active' | 'paused';
};

/** Mock ad-platform report for the last 10 days (Feedback agent input). */
export function adSetsSeed(): AdSetReport[] {
  return [
    {
      campaignId: 'META-CT27-A',
      name: 'Meta ad set A',
      channel: 'meta_ads',
      spendCentsLast10Days: 21_300,
      status: 'active',
    },
    {
      campaignId: 'META-CT27-B',
      name: 'Meta ad set B',
      channel: 'meta_ads',
      spendCentsLast10Days: 18_640,
      status: 'active',
    },
    {
      campaignId: 'GS-CT27-NB',
      name: 'Google Search non-brand',
      channel: 'google_search',
      spendCentsLast10Days: 24_500,
      status: 'active',
    },
  ];
}
