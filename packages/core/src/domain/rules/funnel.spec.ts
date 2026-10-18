import { freshSeed } from '../../testing/fixtures';
import type { FunnelCounts } from '../types';
import { funnelLine, funnelTotals, funnelWeeks } from './funnel';

const counts = (impressions: number | null, visits: number, validLeads: number, deposits = 0) =>
  ({ impressions, visits, validLeads, deposits }) satisfies FunnelCounts;

describe('funnel by layer (source week-4 review: find the break point)', () => {
  it('rates are next layer ÷ this layer', () => {
    const line = funnelLine(counts(40_000, 1_200, 12, 3));
    expect(line.steps.click.rate).toBeCloseTo(0.03);
    expect(line.steps.enquiry.rate).toBeCloseTo(0.01);
    expect(line.steps.booking.rate).toBeCloseTo(0.25);
  });

  it('a missing or zero layer gives no rate, never 0 / ∞ / NaN', () => {
    const line = funnelLine(counts(null, 0, 0));
    expect(line.steps.click).toEqual({ rate: null, lowSample: true, change: null, fell: false });
    expect(line.steps.enquiry.rate).toBeNull();
    expect(line.steps.booking.rate).toBeNull();
  });

  it('flags a rate whose base is under 10 as a small sample and does not compare it', () => {
    const line = funnelLine(counts(40_000, 1_200, 6, 0), counts(40_000, 1_200, 9, 3));
    expect(line.steps.booking).toEqual({ rate: 0, lowSample: true, change: null, fell: false });
  });

  it('change is relative to the week before', () => {
    const line = funnelLine(counts(40_000, 1_200, 6), counts(40_000, 1_200, 12));
    expect(line.steps.enquiry.change).toBeCloseTo(-0.5);
    expect(line.steps.click.change).toBeCloseTo(0);
  });

  it('the break point is the step that fell most, and only a fall of 20% or more counts', () => {
    expect(funnelLine(counts(40_000, 1_000, 6), counts(40_000, 1_200, 12)).breakPoint).toBe(
      'enquiry',
    );
    expect(funnelLine(counts(40_000, 1_100, 11), counts(40_000, 1_200, 12)).breakPoint).toBeNull();
    expect(funnelLine(counts(40_000, 1_200, 12)).breakPoint).toBeNull();
    // Clicks fell 25%, enquiries 33%: the bigger fall is the break point.
    expect(funnelLine(counts(40_000, 900, 6), counts(40_000, 1_200, 12)).breakPoint).toBe(
      'enquiry',
    );
  });

  it('totals per week keep the dashboard numbers', () => {
    const totals = funnelTotals(freshSeed().funnel);
    expect(totals.map((w) => [w.impressions, w.visits, w.validLeads, w.deposits])).toEqual([
      [41_000, 1_350, 9, 1],
      [46_000, 1_480, 6, 1],
      [23_000, 760, 3, 0],
    ]);
  });

  it('valid leads per channel are the CRM numbers the reconciliation uses', () => {
    const seed = freshSeed();
    const key = (r: { weekStart: string; channel: string }) => `${r.weekStart}|${r.channel}`;
    const recon = new Map(seed.recon.map((r) => [key(r), r.crmValidLeads]));
    expect(seed.funnel.map((r) => [key(r), r.validLeads])).toEqual(
      seed.funnel.map((r) => [key(r), recon.get(key(r))]),
    );
  });

  it('seeded week 2: the total breaks at enquiry, and so does Meta (spend, no valid leads)', () => {
    const [, week2, week3] = funnelWeeks(freshSeed().funnel, 3);
    expect(week2.total.breakPoint).toBe('enquiry');
    expect(week2.total.steps.enquiry.change).toBeCloseTo(6 / 1_480 / (9 / 1_350) - 1);
    const meta = week2.channels.find((c) => c.channel === 'meta_ads')!;
    expect([meta.steps.enquiry.rate, meta.breakPoint]).toEqual([0, 'enquiry']);
    // Each channel is compared with its own week before.
    const organic = week2.channels.find((c) => c.channel === 'organic_search')!;
    expect(organic.steps.enquiry.change).toBeCloseTo(2 / 190 / (2 / 180) - 1);
    expect(week3.total.breakPoint).toBeNull();
  });

  it('returns the last N weeks, oldest first, and compares the first with the week before it', () => {
    const weeks = funnelWeeks(freshSeed().funnel, 2);
    expect(weeks.map((w) => w.total.visits)).toEqual([1_480, 760]);
    expect(weeks[0].total.steps.enquiry.change).not.toBeNull();
  });
});
