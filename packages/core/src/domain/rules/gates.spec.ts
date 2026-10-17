import { SEED_NOW, find, freshSeed } from '../../testing/fixtures';
import { computeAdGates, deriveLandingPageStatus, unmetGates } from './gates';

describe('ad gates (R3)', () => {
  it('seeded TASK-030 fails only the landing page gate', () => {
    const seed = freshSeed();
    const gates = computeAdGates(find(seed.tasks, 'TASK-030'), { facts: seed.facts, settings: seed.settings, now: SEED_NOW });
    expect(unmetGates(gates)).toEqual(['landingPageReady']);
  });

  it('each gate fails on its own condition', () => {
    const seed = freshSeed();
    const t = { ...find(seed.tasks, 'TASK-030') };
    const ctx = { facts: seed.facts, settings: seed.settings, now: SEED_NOW };
    seed.settings.landingPage.status = 'traffic_ready';
    expect(unmetGates(computeAdGates(t, ctx))).toEqual([]);

    expect(unmetGates(computeAdGates({ ...t, factRefs: ['FS-15'] }, ctx))).toEqual(['productFactsConfirmed']);
    expect(unmetGates(computeAdGates({ ...t, version: 2 }, ctx))).toEqual(['creativeApproved']);
    expect(unmetGates(computeAdGates({ ...t, channel: 'tiktok' }, ctx))).toEqual(['budgetAndMonitoringApproved']);
    seed.settings.people.alertOwnerOutsideHours.name = ' ';
    expect(unmetGates(computeAdGates(t, ctx))).toEqual(['budgetAndMonitoringApproved']);
  });

  it('landing page is traffic-ready only with all four checks', () => {
    const all = { factsConfirmed: true, leadFiresOnce: true, sourceCaptured: true, reachesSales: true };
    expect(deriveLandingPageStatus(all)).toBe('traffic_ready');
    for (const k of Object.keys(all) as (keyof typeof all)[]) {
      expect([k, deriveLandingPageStatus({ ...all, [k]: false })]).toEqual([k, 'not_ready']);
    }
  });
});
