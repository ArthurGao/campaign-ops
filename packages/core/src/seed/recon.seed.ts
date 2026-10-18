import type { ReconChannel } from '../domain/enums';
import type { FunnelWeek, ReconRow } from '../domain/types';
import { at } from './time';

/** Week starts are Mondays 00:00 Pacific/Auckland; SEED_NOW is Thursday of the third week. */
const WEEKS = [at(-17, '00:00'), at(-10, '00:00'), at(-3, '00:00')];

type Raw = [channel: ReconChannel, spendCents: number, platform: number, crmValid: number];

// Seeded weekly aggregates (docs/decisions.md D-26). Week 2 meta_ads: spend > 0, 0 valid leads.
const RAW: Raw[][] = [
  [
    ['google_search', 18_000, 4, 2],
    ['meta_ads', 22_000, 9, 3],
    ['organic_search', 0, 3, 2],
    ['organic_social', 0, 2, 1],
    ['tiktok', 0, 0, 0],
    ['direct', 0, 1, 1],
  ],
  [
    ['google_search', 20_000, 5, 3],
    ['meta_ads', 24_000, 8, 0],
    ['organic_search', 0, 3, 2],
    ['organic_social', 0, 1, 1],
    ['tiktok', 0, 0, 0],
    ['direct', 0, 1, 0],
  ],
  [
    ['google_search', 9_000, 2, 1],
    ['meta_ads', 11_000, 6, 1],
    ['organic_search', 0, 2, 1],
    ['organic_social', 0, 1, 0],
    ['tiktok', 0, 0, 0],
    ['direct', 0, 0, 0],
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

export function funnelSeed(): FunnelWeek[] {
  const valid = RAW.map((week) => week.reduce((sum, [, , , crm]) => sum + crm, 0));
  return [
    { weekStart: WEEKS[0], impressions: 41_000, visits: 1_350, validLeads: valid[0], deposits: 1 },
    { weekStart: WEEKS[1], impressions: 46_000, visits: 1_480, validLeads: valid[1], deposits: 1 },
    { weekStart: WEEKS[2], impressions: 23_000, visits: 760, validLeads: valid[2], deposits: 0 },
  ];
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
