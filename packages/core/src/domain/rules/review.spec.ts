import { catchAppError as thrown, find, freshSeed, PM, SEED_NOW } from '../../testing/fixtures';
import type { CampaignReview, ReviewChannelDecision, ReviewView } from '../types';
import {
  assertReviewSendable,
  assumptionCheck,
  buildReview,
  MIN_REVIEW_LEADS,
  reviewWeeks,
} from './review';
import { weekOf } from './week';

const seed = freshSeed();
const current = weekOf(SEED_NOW);
const view = (weeks = reviewWeeks(seed.funnel, current)) =>
  buildReview({
    weeks,
    recon: seed.recon,
    funnel: seed.funnel,
    facts: seed.facts,
    settings: seed.settings,
  });

const channel = (v: ReviewView, c: string) => v.channels.find((x) => x.channel === c)!;

describe('campaign review (source week 4: scale what works, stop what does not)', () => {
  it('covers full weeks only; the running week is left out', () => {
    expect(reviewWeeks(seed.funnel, current)).toEqual(['2026-09-28', '2026-10-05']);
    expect(view().bigCallsAllowed).toBe(true);
    expect(view(['2026-10-05']).bigCallsAllowed).toBe(false);
  });

  it('adds each channel up over the review weeks', () => {
    const google = channel(view(), 'google_search');
    expect([google.spendCents, google.validLeads, google.visits, google.deposits]).toEqual([
      38_000, 5, 900, 2,
    ]);
    expect(google.paidCpl).toBe(7_600);
    expect(channel(view(), 'meta_ads').overReportRatio).toBeCloseTo(17 / 3, 2);
  });

  it('suggests stop for spend without valid leads, and for a channel with no visits', () => {
    expect(channel(view(['2026-10-05']), 'meta_ads')).toMatchObject({
      suggestion: 'stop',
      reason: 'Spent $240.00 with no valid leads.',
    });
    expect(channel(view(), 'tiktok')).toMatchObject({
      suggestion: 'stop',
      reason: 'No visits in 2 weeks.',
    });
  });

  it(`suggests wait for a paid channel under ${MIN_REVIEW_LEADS} valid leads`, () => {
    expect(channel(view(), 'meta_ads')).toMatchObject({
      suggestion: 'wait',
      reason: 'Only 3 valid leads: too few to judge the CPL.',
    });
  });

  it('suggests scale for the paid channel with the lowest CPL, and only with two full weeks', () => {
    expect(channel(view(), 'google_search')).toMatchObject({
      suggestion: 'scale',
      reason: 'Lowest paid CPL: $76.00 over 5 valid leads.',
    });
    // One week with enough leads is still one week: keep, not scale.
    const funnel = seed.funnel.map((r) =>
      r.channel === 'google_search' && weekOf(r.weekStart) === '2026-10-05'
        ? { ...r, validLeads: 6 }
        : r,
    );
    const oneWeek = buildReview({
      weeks: ['2026-10-05'],
      recon: seed.recon,
      funnel,
      facts: seed.facts,
      settings: seed.settings,
    });
    expect(channel(oneWeek, 'google_search')).toMatchObject({
      suggestion: 'keep',
      reason: 'CPL $33.33 over 6 valid leads.',
    });
  });

  it('keeps organic channels that bring valid leads', () => {
    expect(channel(view(), 'organic_search')).toMatchObject({
      suggestion: 'keep',
      reason: '4 valid leads without spend.',
    });
  });

  it('carries the break point of the last review week', () => {
    expect(channel(view(), 'meta_ads').breakPoint).toBe('enquiry');
  });

  it('checks the close-rate assumption against the real rate when the sample allows', () => {
    const check = assumptionCheck(find(seed.facts, 'FS-23'), 15, 2);
    expect(check).toMatchObject({ factId: 'FS-23', validLeads: 15, deposits: 2, enough: true });
    expect(check.rate).toBeCloseTo(2 / 15);
    expect(assumptionCheck(find(seed.facts, 'FS-23'), 6, 1).enough).toBe(false);
    expect(view().assumption).toMatchObject({ validLeads: 15, deposits: 2 });
  });

  describe('sending', () => {
    const decide = (
      v: ReviewView,
      over: Partial<Record<string, ReviewChannelDecision['decision']>> = {},
    ) =>
      v.channels.map((c) => ({
        channel: c.channel,
        decision: over[c.channel] ?? c.suggestion,
        note: '',
      }));
    const draft = (decisions: ReviewChannelDecision[], nextPhase = 'Move 2 h from site to ads.') =>
      ({
        id: 'REV-1',
        status: 'draft',
        decisions,
        nextPhase,
        createdAt: '',
        updatedAt: '',
        events: [],
      }) satisfies CampaignReview;

    it('needs a decision for every channel and a next phase', () => {
      const v = view();
      expect(thrown(() => assertReviewSendable(undefined, v)).code).toBe('VALIDATION');
      expect(thrown(() => assertReviewSendable(draft(decide(v).slice(1)), v)).message).toBe(
        'Decide every channel before sending: google_search.',
      );
      expect(thrown(() => assertReviewSendable(draft(decide(v), ' '), v)).message).toBe(
        'The review needs the next phase before it is sent.',
      );
      expect(assertReviewSendable(draft(decide(v)), v).status).toBe('draft');
    });

    it('refuses to scale on under two full weeks of data', () => {
      const v = view(['2026-10-05']);
      const e = thrown(() => assertReviewSendable(draft(decide(v, { google_search: 'scale' })), v));
      expect([e.code, e.message]).toEqual([
        'VALIDATION',
        'Under two full weeks of data: scale google_search at the next review.',
      ]);
      expect(
        assertReviewSendable(draft(decide(v, { meta_ads: 'stop' })), v).decisions,
      ).toHaveLength(6);
    });

    it('is sent once', () => {
      const v = view();
      const sent = { ...draft(decide(v)), status: 'sent' as const, sentAt: '', sentBy: PM };
      expect(thrown(() => assertReviewSendable(sent, v)).code).toBe('INVALID_TRANSITION');
    });
  });
});
