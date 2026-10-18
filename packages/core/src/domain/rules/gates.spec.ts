import { SEED_NOW, confirmCoreProductFacts, find, freshSeed } from '../../testing/fixtures';
import { computeAdGates, deriveLandingPageStatus, unmetGates } from './gates';

describe('ad gates (R3)', () => {
  it('seeded TASK-030 fails the product gate (date, price, seats pending) and the landing page gate', () => {
    const seed = freshSeed();
    const gates = computeAdGates(find(seed.tasks, 'TASK-030'), {
      facts: seed.facts,
      settings: seed.settings,
      now: SEED_NOW,
    });
    expect(unmetGates(gates)).toEqual(['productFactsConfirmed', 'landingPageReady']);
  });

  it('each gate fails on its own condition', () => {
    const seed = freshSeed();
    const t = { ...find(seed.tasks, 'TASK-030') };
    const ctx = { facts: seed.facts, settings: seed.settings, now: SEED_NOW };
    seed.settings.landingPage.status = 'traffic_ready';
    confirmCoreProductFacts(seed);
    expect(unmetGates(computeAdGates(t, ctx))).toEqual([]);

    expect(unmetGates(computeAdGates({ ...t, factRefs: ['FS-12'] }, ctx))).toEqual([
      'productFactsConfirmed',
    ]);
    expect(unmetGates(computeAdGates({ ...t, version: 2 }, ctx))).toEqual(['creativeApproved']);
    expect(unmetGates(computeAdGates({ ...t, channel: 'tiktok' }, ctx))).toEqual([
      'budgetAndMonitoringApproved',
    ]);
    seed.settings.people.alertOwnerOutsideHours.name = ' ';
    expect(unmetGates(computeAdGates(t, ctx))).toEqual(['budgetAndMonitoringApproved']);
  });

  it('landing page is traffic-ready only with all four checks', () => {
    const all = {
      factsConfirmed: true,
      leadFiresOnce: true,
      sourceCaptured: true,
      reachesSales: true,
    };
    expect(deriveLandingPageStatus(all)).toBe('traffic_ready');
    for (const k of Object.keys(all) as (keyof typeof all)[]) {
      expect([k, deriveLandingPageStatus({ ...all, [k]: false })]).toEqual([k, 'not_ready']);
    }
  });
});

describe('product facts gate follows the source workflow (date, price, seats, inclusions)', () => {
  const confirm = (seed: ReturnType<typeof freshSeed>, ...ids: string[]) =>
    ids.forEach((id) =>
      Object.assign(find(seed.facts, id), { status: 'confirmed', source: 'Client email' }),
    );

  it('fails while any core product fact is unconfirmed, even if the ad cites only confirmed facts', () => {
    const seed = freshSeed();
    seed.settings.landingPage.status = 'traffic_ready';
    const t = find(seed.tasks, 'TASK-030');
    expect(t.factRefs).toEqual(['FS-07', 'FS-11']);
    const gates = computeAdGates(t, { facts: seed.facts, settings: seed.settings, now: SEED_NOW });
    expect(unmetGates(gates)).toEqual(['productFactsConfirmed']);
  });

  it('passes once FS-04, FS-11, FS-15 and FS-16 are all publicly usable', () => {
    const seed = freshSeed();
    seed.settings.landingPage.status = 'traffic_ready';
    expect(seed.facts.filter((f) => f.productCore).map((f) => f.id)).toEqual([
      'FS-04',
      'FS-11',
      'FS-15',
      'FS-16',
    ]);
    confirm(seed, 'FS-04', 'FS-15');
    const ctx = { facts: seed.facts, settings: seed.settings, now: SEED_NOW };
    expect(unmetGates(computeAdGates(find(seed.tasks, 'TASK-030'), ctx))).toEqual([
      'productFactsConfirmed',
    ]);
    confirm(seed, 'FS-16');
    expect(unmetGates(computeAdGates(find(seed.tasks, 'TASK-030'), ctx))).toEqual([]);
  });
});
