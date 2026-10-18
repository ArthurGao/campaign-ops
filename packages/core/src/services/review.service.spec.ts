import { FixedClock, ManualScheduler } from '../domain/clock';
import { createCore } from '../create-core';
import { APPROVER, catchAppError, expectCode, PM, SEED_NOW } from '../testing/fixtures';

function setup() {
  const clock = new FixedClock(SEED_NOW);
  const core = createCore({ clock, scheduler: new ManualScheduler() });
  return { core, clock };
}

const DAY = 86_400_000;

describe('ReviewService', () => {
  it('opens on the full weeks with suggestions and no review yet', () => {
    const { core } = setup();
    const v = core.review.get();
    expect(v.weeks).toEqual(['2026-09-28', '2026-10-05']);
    expect(v.channels.map((c) => [c.channel, c.suggestion])).toEqual([
      ['google_search', 'scale'],
      ['meta_ads', 'wait'],
      ['organic_search', 'keep'],
      ['organic_social', 'keep'],
      ['tiktok', 'stop'],
      ['direct', 'keep'],
    ]);
    expect(v.totals).toEqual({ spendCents: 84_000, validLeads: 15, deposits: 2, paidCpl: 10_500 });
    expect(v.review).toBeUndefined();
  });

  it('only the PM writes and sends it; unknown decisions are refused', () => {
    const { core } = setup();
    expectCode(() => core.review.save({ nextPhase: 'x' }, APPROVER), 'FORBIDDEN');
    expectCode(() => core.review.send(APPROVER), 'FORBIDDEN');
    const e = catchAppError(() =>
      core.review.save(
        { decisions: [{ channel: 'meta_ads', decision: 'double' as 'keep', note: '' }] },
        PM,
      ),
    );
    expect([e.code, e.status, e.message]).toEqual([
      'VALIDATION',
      400,
      'meta_ads: double is not a review decision.',
    ]);
  });

  it('saves a draft, sends once with a snapshot, and keeps the reviewed weeks after time moves on', () => {
    const { core, clock } = setup();
    const decisions = core.review
      .get()
      .channels.map((c) => ({ channel: c.channel, decision: c.suggestion, note: '' }));
    core.review.save({ decisions }, PM);
    expect(core.review.save({ nextPhase: 'Move 1 h from site to ads.' }, PM).review).toMatchObject({
      status: 'draft',
      decisions,
      nextPhase: 'Move 1 h from site to ads.',
    });

    const sent = core.review.send(PM);
    expect(sent.review?.status).toBe('sent');
    expect(sent.review?.numbers?.weeks).toEqual(['2026-09-28', '2026-10-05']);
    expect(sent.review?.numbers?.channels.find((c) => c.channel === 'google_search')).toMatchObject(
      {
        spendCents: 38_000,
        validLeads: 5,
      },
    );
    expectCode(() => core.review.send(PM), 'INVALID_TRANSITION');
    expectCode(() => core.review.save({ nextPhase: 'later' }, PM), 'INVALID_TRANSITION');

    clock.advance(7 * DAY);
    expect(core.review.get().weeks).toEqual(['2026-09-28', '2026-10-05']);
    // A later correction to the data does not change what the client was sent.
    for (const r of core.store.data.funnel) if (r.channel === 'google_search') r.validLeads += 10;
    expect(core.review.get().channels.find((c) => c.channel === 'google_search')?.validLeads).toBe(
      5,
    );
  });
});
