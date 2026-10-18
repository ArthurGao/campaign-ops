import { SEED_NOW } from '../domain/clock';
import { AGENT_IDS, PACKAGE_STATUSES, TASK_STATUSES, TASK_TYPES } from '../domain/enums';
import { needsConfirmation } from '../domain/rules/facts';
import { buildSeed } from './index';

// Encodes the "Seed coverage (minimum)" list in CLAUDE.md and the headline records in
// docs/05-frontend.md, plus referential integrity, so the demo script cannot silently break.
describe('seed', () => {
  const seed = buildSeed();
  const byId = <T extends { id: string }>(items: T[], id: string): T => {
    const found = items.find((i) => i.id === id);
    if (!found) throw new Error(`missing ${id}`);
    return found;
  };

  it('is deterministic', () => {
    expect(buildSeed()).toEqual(seed);
  });

  describe('fact sheet', () => {
    const external = seed.facts.filter((f) => f.page === 'external');
    const internal = seed.facts.filter((f) => f.page === 'internal');

    it('has ≥ 6 external entries covering every required status and ≥ 4 internal entries', () => {
      expect(external.length).toBeGreaterThanOrEqual(6);
      expect(new Set(external.map((f) => f.status))).toEqual(
        new Set(['confirmed', 'pending', 'assumption', 'confirmed_with_expiry', 'superseded']),
      );
      expect(internal.length).toBeGreaterThanOrEqual(4);
    });

    it('has the headline entries', () => {
      expect(byId(seed.facts, 'FS-04')).toMatchObject({ page: 'external', status: 'pending' });
      expect(byId(seed.facts, 'FS-07')).toMatchObject({ page: 'external', status: 'confirmed' });
      expect(byId(seed.facts, 'FS-11')).toMatchObject({ page: 'external', status: 'confirmed' });
      expect(byId(seed.facts, 'FS-12')).toMatchObject({ page: 'external', status: 'assumption' });
      expect(byId(seed.facts, 'FS-15')).toMatchObject({ page: 'external', status: 'pending' });
      const visa = byId(seed.facts, 'FS-09');
      expect(visa.status).toBe('confirmed_with_expiry');
      expect(visa.source).toBe('https://example.govt.nz/visa');
      expect(visa.publicNote).toMatch(/subject to official information at departure/i);
      expect((new Date(visa.expiresAt!).getTime() - SEED_NOW.getTime()) / 86_400_000).toBe(30);
      expect(internal.map((f) => [f.id, f.status])).toEqual([
        ['FS-20', 'pending'],
        ['FS-21', 'assumption'],
        ['FS-22', 'pending'],
        ['FS-23', 'assumption'],
        ['FS-24', 'assumption'],
      ]);
    });

    it('has a version history whose latest version is the current one, with at least one before/after change', () => {
      expect(seed.factVersions.at(-1)?.version).toBe(seed.factSheetVersion);
      expect(seed.factVersions.some((v) => v.changes.some((c) => c.before))).toBe(true);
    });
  });

  describe('evidence', () => {
    it('has ≥ 8 items across sources with exactly 2 blocking', () => {
      expect(seed.evidence.length).toBeGreaterThanOrEqual(8);
      expect(new Set(seed.evidence.map((e) => e.source))).toEqual(
        new Set(['site', 'tracking', 'channels', 'seo', 'geo', 'sales']),
      );
      expect(seed.evidence.filter((e) => e.blocks !== 'none').map((e) => e.id)).toEqual([
        'E-03',
        'E-07',
      ]);
    });

    it('has the two headline example items', () => {
      expect(byId(seed.evidence, 'E-03')).toMatchObject({
        source: 'tracking',
        blocks: 'ads',
        priority: 'P0',
        isExample: true,
      });
      expect(byId(seed.evidence, 'E-07')).toMatchObject({
        source: 'site',
        blocks: 'traffic',
        priority: 'P0',
        isExample: true,
      });
    });
  });

  describe('tasks', () => {
    it('covers every type and every status', () => {
      expect(new Set(seed.tasks.map((t) => t.type))).toEqual(new Set(TASK_TYPES));
      expect(new Set(seed.tasks.map((t) => t.status))).toEqual(new Set(TASK_STATUSES));
    });

    it('has the headline tasks', () => {
      expect(byId(seed.tasks, 'TASK-021')).toMatchObject({
        type: 'social_post',
        channel: 'facebook',
        status: 'blocked',
        blockedReason: 'needs_confirmation: FS-04',
        needsConfirmation: true,
      });
      expect(byId(seed.tasks, 'TASK-018')).toMatchObject({
        type: 'site_change',
        status: 'awaiting_approval',
      });
      expect(byId(seed.tasks, 'TASK-030')).toMatchObject({
        type: 'ad_copy',
        channel: 'google_search',
        status: 'approved',
      });
      expect(byId(seed.tasks, 'TASK-011')).toMatchObject({
        type: 'video_brief',
        status: 'approved',
        linkedBriefId: 'SOC-2027CT-003',
      });
    });

    it('stores needsConfirmation consistent with the fact sheet at seed time', () => {
      for (const t of seed.tasks) {
        expect([t.id, t.needsConfirmation]).toEqual([
          t.id,
          needsConfirmation(t.factRefs, seed.facts, SEED_NOW),
        ]);
      }
    });

    it('never references an internal fact', () => {
      const internalIds = new Set(seed.facts.filter((f) => f.page === 'internal').map((f) => f.id));
      const refs = [
        ...seed.tasks.flatMap((t) => t.factRefs),
        ...seed.packages.flatMap((p) => p.factRefs),
      ];
      expect(refs.filter((r) => internalIds.has(r))).toEqual([]);
    });
  });

  describe('agent runs', () => {
    it('has one completed run per agent with 3–6 outputs, one failed and one queued', () => {
      for (const agent of AGENT_IDS) {
        const counts = seed.runs
          .filter((r) => r.agent === agent && r.status === 'completed')
          .map((r) => r.outputs.length);
        expect([agent, counts.some((n) => n >= 3 && n <= 6)]).toEqual([agent, true]);
      }
      expect(seed.runs.filter((r) => r.status === 'failed').map((r) => r.id)).toEqual(['RUN-0010']);
      expect(seed.runs.filter((r) => r.status === 'queued').map((r) => r.id)).toEqual(['RUN-0011']);
    });

    it('has the headline runs', () => {
      expect(byId(seed.runs, 'RUN-0003')).toMatchObject({ agent: 'audit', status: 'completed' });
      expect(
        byId(seed.runs, 'RUN-0007').outputs.filter((o) => o.type === 'needs_confirmation'),
      ).toHaveLength(1);
      expect(
        byId(seed.runs, 'RUN-0009').outputs.find((o) => o.type === 'suggestion'),
      ).toMatchObject({
        title: 'Pause Meta ad set B',
        inScope: true,
      });
      expect(byId(seed.runs, 'RUN-0010')).toMatchObject({
        agent: 'audit',
        error: 'No URL provided',
      });
      expect(byId(seed.runs, 'RUN-0011')).toMatchObject({ agent: 'feedback' });
    });

    it('records createdId for every accepted output that created a record, and it exists', () => {
      const ids = new Set([...seed.evidence, ...seed.tasks, ...seed.packages].map((x) => x.id));
      const created = seed.runs
        .flatMap((r) => r.outputs)
        .flatMap((o) => (o.decision?.createdId ? [o.decision.createdId] : []));
      expect(created.length).toBeGreaterThan(5);
      expect(created.filter((id) => !ids.has(id))).toEqual([]);
    });
  });

  describe('video factory', () => {
    it('has the delivered brief with receipt, one in production, and receipts with credits and license proof', () => {
      const soc3 = byId(seed.briefs, 'SOC-2027CT-003');
      const v1 = soc3.receipts[0];
      expect(v1.version).toBe('v1');
      expect(v1.assets.map((a) => a.assetId)).toEqual([
        'VID-0031-4x5-v1',
        'VID-0031-9x16-v1',
        'VID-0031-16x9-v1',
      ]);
      expect(v1.factsUsed).toEqual(['FS-07', 'FS-11']);
      expect(v1.creditsUsed).toBe(12);
      expect(soc3.costCap.maxCredits).toBe(20);
      expect(v1.musicLicense.proof).toMatch(/^https:\/\//);
      expect(byId(seed.briefs, 'SOC-2027CT-004').status).toBe('in_production');
      expect(seed.briefs.some((b) => b.status === 'delivered' && b.receipts.length > 0)).toBe(true);
    });
  });

  describe('publish packages', () => {
    it('has one package per status', () => {
      expect(new Set(seed.packages.map((p) => p.status))).toEqual(new Set(PACKAGE_STATUSES));
    });

    it('has the headline packages', () => {
      expect(byId(seed.packages, 'PUB-2027CT-012')).toMatchObject({
        channel: 'facebook_feed',
        status: 'awaiting_approval',
        asset: { assetId: 'VID-0031-4x5-v2', version: 'v2' },
        caption: { version: 'CAP-012-v1' },
      });
      expect(byId(seed.packages, 'PUB-2027CT-008').status).toBe('mismatch');
    });

    it('binds every approved-or-later package to its current versions (I-P1)', () => {
      for (const p of seed.packages.filter((x) => x.status !== 'awaiting_approval')) {
        expect([p.id, p.approval.approvedAssetVersion, p.approval.approvedCaptionVersion]).toEqual([
          p.id,
          p.asset?.version,
          p.caption.version,
        ]);
      }
    });

    it('only uses assets that passed QA or come from older factory jobs', () => {
      const unpassed = new Set(
        seed.briefs
          .filter((b) => b.status !== 'qa_passed')
          .flatMap((b) => b.receipts.flatMap((r) => r.assets.map((a) => a.assetId))),
      );
      expect(
        seed.packages.filter((p) => p.asset && unpassed.has(p.asset.assetId)).map((p) => p.id),
      ).toEqual([]);
    });
  });

  describe('leads', () => {
    const visible = seed.leads.filter((l) => !l.mergedInto);

    it('has ≥ 12 visible leads mixing the required sources', () => {
      expect(visible.length).toBeGreaterThanOrEqual(12);
      const mediums = new Set(visible.map((l) => l.source.utmMedium));
      for (const m of [
        'paid_social',
        'organic_search',
        'organic_social',
        'lead_ads',
        'phone',
        'dm',
      ]) {
        expect([m, mediums.has(m as never)]).toEqual([m, true]);
      }
    });

    it('has a merged duplicate, a lost-after-valid lead, related leads and attribution cases', () => {
      expect(byId(seed.leads, 'L-0019').mergedInto).toBe('L-0014');
      expect(byId(seed.leads, 'L-0014').mergedFrom).toEqual(['L-0019']);
      expect(byId(seed.leads, 'L-0015')).toMatchObject({ everValid: true, stage: 'lost' });
      expect(byId(seed.leads, 'L-0012')).toMatchObject({
        validity: { value: 'valid' },
        stage: 'deposit_paid',
        order: { people: 2 },
      });
      expect(byId(seed.leads, 'L-0013').validity).toMatchObject({
        value: 'invalid',
        reason: 'wants independent travel',
      });
      expect(byId(seed.leads, 'L-0016').relatedLeadIds).toEqual(['L-0017']);
      expect(byId(seed.leads, 'L-0018').adDetail.resolution).toBe('matched_from_platform');
      expect(
        visible.some((l) => l.source.utmMedium === 'phone' && l.adDetail.resolution === 'unknown'),
      ).toBe(true);
    });
  });

  describe('reconciliation', () => {
    it('has 3 weeks × 6 channels, and week 2 meta_ads has spend but 0 valid leads', () => {
      expect(new Set(seed.recon.map((r) => r.weekStart)).size).toBe(3);
      expect(seed.recon).toHaveLength(18);
      const week2 = [...new Set(seed.recon.map((r) => r.weekStart))][1];
      expect(
        seed.recon.find((r) => r.weekStart === week2 && r.channel === 'meta_ads'),
      ).toMatchObject({ crmValidLeads: 0 });
      expect(
        seed.recon.find((r) => r.weekStart === week2 && r.channel === 'meta_ads')!.spendCents,
      ).toBeGreaterThan(0);
    });
  });

  describe('settings', () => {
    it('allows non-substantive PM approval, names an alert owner, and has 3 of 4 landing checks on', () => {
      expect(seed.settings.preApprovedScope.pmMayApproveNonSubstantive).toBe(true);
      expect(seed.settings.preApprovedScope.nonSubstantiveList).toEqual([
        'typos',
        'punctuation',
        'schedule time within the same day',
      ]);
      expect(seed.settings.people.alertOwnerOutsideHours.name).not.toBe('');
      expect(Object.values(seed.settings.landingPage.checks).filter(Boolean)).toHaveLength(3);
      expect(seed.settings.landingPage.status).toBe('not_ready');
    });
  });

  describe('integrity and placeholders', () => {
    it('only references existing records', () => {
      const facts = new Set(seed.facts.map((f) => f.id));
      const tasks = new Set(seed.tasks.map((t) => t.id));
      const briefs = new Set(seed.briefs.map((b) => b.id));
      const pkgs = new Set(seed.packages.map((p) => p.id));
      const missing = [
        ...seed.tasks.flatMap((t) => t.factRefs.filter((f) => !facts.has(f))),
        ...seed.tasks.flatMap((t) =>
          t.linkedBriefId && !briefs.has(t.linkedBriefId) ? [t.linkedBriefId] : [],
        ),
        ...seed.tasks.flatMap((t) =>
          t.linkedPackageId && !pkgs.has(t.linkedPackageId) ? [t.linkedPackageId] : [],
        ),
        ...seed.packages.flatMap((p) => (tasks.has(p.sourceTaskId) ? [] : [p.sourceTaskId])),
        ...seed.briefs.flatMap((b) => (tasks.has(b.taskId) ? [] : [b.taskId])),
        ...seed.evidence.flatMap((e) =>
          e.convertedTaskId && !tasks.has(e.convertedTaskId) ? [e.convertedTaskId] : [],
        ),
      ];
      expect(missing).toEqual([]);
    });

    it('contains no Chinese text and only placeholder hosts', () => {
      const json = JSON.stringify(seed);
      expect(json).not.toMatch(/[一-鿿]/);
      const hosts = new Set([...json.matchAll(/https?:\/\/([^/"?]+)/g)].map((m) => m[1]));
      const foreign = [...hosts].filter((h) => !/(^|\.)example(\.com|\.govt\.nz)?$/.test(h));
      expect(foreign).toEqual([]);
    });

    it('never shows money for TBC values: orders carry no amount', () => {
      expect(seed.leads.filter((l) => l.order?.amountCents !== undefined)).toEqual([]);
    });
  });
});
