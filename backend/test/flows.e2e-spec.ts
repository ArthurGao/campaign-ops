import type { AgentRun, PublishPackage, Task } from '@campaign-ops/core';
import { createHarness, type Harness } from './harness';

// Key flows F1–F6 from docs/01-product-spec.md, end to end through the HTTP API.
describe('key flows (e2e)', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await createHarness();
  });

  afterEach(async () => {
    await h.close();
  });

  const decide = (run: AgentRun, index: number, status: 'accepted' | 'rejected' = 'accepted') =>
    h.as('pm').post(`/agents/runs/${run.id}/outputs/${run.outputs[index].id}/decision`, { status });

  it('F1: an unconfirmed fact blocks a draft; after confirmation it goes all the way to verified', async () => {
    const spec = '≤ 80 words, must include departure date, link at end';

    // Outbound refuses to write the departure date while FS-04 is pending.
    const run1 = await h.runAgent('outbound', { mode: 'draft', channel: 'facebook', spec });
    expect(run1.status).toBe('completed');
    expect(run1.outputs.map((o) => o.type)).toEqual(['needs_confirmation']);
    expect(run1.outputs[0].factRefs).toEqual(['FS-04']);

    const accepted = await decide(run1, 0).expect(201);
    expect(accepted.body.createdType).toBe('task');
    const taskId: string = accepted.body.createdId;
    let task: Task = (await h.as('pm').get(`/tasks/${taskId}`).expect(200)).body;
    expect(task).toMatchObject({ status: 'blocked', blockedReason: 'needs_confirmation: FS-04', needsConfirmation: true });

    const stillBlocked = await h.as('pm').post(`/tasks/${taskId}/transition`, { to: 'draft' }).expect(409);
    expect(stillBlocked.body).toMatchObject({ code: 'NEEDS_CONFIRMATION' });

    // The PM cannot confirm facts; the client approver can, with a source.
    await h.as('pm').post('/fact-sheet/FS-04/confirm', { source: 'Client email' }).expect(403);
    await h.as('client_approver').post('/fact-sheet/FS-04/confirm', { source: '' }).expect(409);
    const confirmed = await h.as('client_approver').post('/fact-sheet/FS-04/confirm', { source: 'Client email, 16 Oct 2026' }).expect(201);
    expect(confirmed.body.status).toBe('confirmed');
    task = (await h.as('pm').get(`/tasks/${taskId}`).expect(200)).body;
    expect(task).toMatchObject({ needsConfirmation: false, needsRereview: true, status: 'blocked' });
    expect((await h.as('pm').get('/fact-sheet/versions').expect(200)).body[0]).toMatchObject({
      version: 'FS-v1.4',
      affected: expect.arrayContaining([{ kind: 'task', id: taskId }]),
    });

    // Re-run for the same task: now a draft that cites FS-04; accepting it unblocks the task.
    const run2 = await h.runAgent('outbound', { mode: 'draft', taskId, spec });
    expect(run2.outputs[0]).toMatchObject({ type: 'draft', factRefs: ['FS-04', 'FS-07', 'FS-11'] });
    expect(run2.outputs[0].body).toContain('[← FS-04]');
    expect((await decide(run2, 0).expect(201)).body.createdId).toBe(taskId);
    task = (await h.as('pm').get(`/tasks/${taskId}`).expect(200)).body;
    expect(task.status).toBe('draft');

    await h.as('pm').post(`/tasks/${taskId}/transition`, { to: 'qa' }).expect(201);
    await h.as('pm').post(`/tasks/${taskId}/transition`, { to: 'awaiting_approval' }).expect(409);
    await h
      .as('pm')
      .post(`/tasks/${taskId}/transition`, { to: 'awaiting_approval', qa: { passed: true, checklist: [{ item: 'Spec', ok: true }] } })
      .expect(201);
    task = (await h.as('client_approver').post(`/tasks/${taskId}/transition`, { to: 'approved' }).expect(201)).body;
    expect(task.approval).toMatchObject({ status: 'approved', approvedVersion: task.version });

    // Package → approve → schedule → publish → verify.
    let pkg: PublishPackage = (await h.as('pm').post(`/tasks/${taskId}/create-package`, { assetId: 'VID-0031-4x5-v2' }).expect(201)).body;
    expect(pkg).toMatchObject({ status: 'awaiting_approval', channel: 'facebook_feed', asset: { assetId: 'VID-0031-4x5-v2', version: 'v2' } });
    expect(pkg.link).toContain(`utm_content=${pkg.id.toLowerCase()}`);
    expect(pkg.caption.text).not.toContain('[← FS');

    await h.as('executor').post(`/packages/${pkg.id}/schedule`).expect(409);
    pkg = (await h.as('client_approver').post(`/packages/${pkg.id}/approve`).expect(201)).body;
    pkg = (await h.as('executor').post(`/packages/${pkg.id}/schedule`).expect(201)).body;
    expect(pkg.status).toBe('scheduled');
    const postUrl = `https://facebook.example/demotravelnz/posts/${pkg.id.toLowerCase()}`;
    pkg = (await h.as('executor').post(`/packages/${pkg.id}/published`, { postUrl }).expect(201)).body;
    expect(pkg.status).toBe('published');
    expect((await h.as('pm').get(`/tasks/${taskId}`)).body.status).toBe('live');

    const run3 = await h.runAgent('outbound', { mode: 'verify', packageId: pkg.id });
    expect(run3.outputs[0]).toMatchObject({ type: 'verification', proposal: { result: 'match' } });
    await decide(run3, 0).expect(201);
    expect((await h.as('pm').get(`/packages/${pkg.id}`)).body.status).toBe('verified');
    task = (await h.as('pm').get(`/tasks/${taskId}`)).body;
    expect(task).toMatchObject({ status: 'verified', verification: { result: 'match', runId: run3.id } });
  });

  it('F2: factory round-trip with duplicate check, receipt and QA creating packages', async () => {
    const prefill = (await h.as('pm').post('/tasks/TASK-026/create-brief').expect(201)).body;
    expect(prefill.deliverables).toEqual([
      { channel: 'instagram_reels', ratio: '9:16' },
      { channel: 'facebook_feed', ratio: '1:1' },
    ]);
    const brief = (await h.as('pm').post('/factory/briefs', prefill).expect(201)).body;
    expect(brief).toMatchObject({ id: 'SOC-2027CT-006', status: 'draft' });
    expect((await h.as('pm').post('/factory/briefs', prefill).expect(409)).body.code).toBe('DUPLICATE_BRIEF');

    await h.as('pm').post(`/factory/briefs/${brief.id}/send`).expect(201);
    await h.advance(1_000);
    expect((await h.as('pm').get(`/factory/briefs/${brief.id}`)).body.status).toBe('accepted');
    await h.advance(5_000);
    const delivered = (await h.as('pm').get(`/factory/briefs/${brief.id}`)).body;
    expect(delivered.status).toBe('delivered');
    expect(delivered.receipts[0].assets.map((a: { assetId: string }) => a.assetId)).toEqual(['VID-0034-9x16-v1', 'VID-0034-1x1-v1']);

    const checklist = (await h.as('pm').get('/factory/qa-checklist')).body.map((item: string) => ({ item, ok: true }));
    const noName = await h.as('pm').post(`/factory/briefs/${brief.id}/qa`, { passed: true, checklist }).expect(409);
    expect(noName.body).toMatchObject({ code: 'QA_REQUIRED' });
    expect(noName.body.hint).toContain('reviewer');

    const qa = (await h.as('pm').post(`/factory/briefs/${brief.id}/qa`, { passed: true, checklist, reviewerName: 'Jordan Reid' }).expect(201)).body;
    expect(qa.brief.status).toBe('qa_passed');
    expect(qa.packages.map((p: PublishPackage) => [p.channel, p.asset?.assetId, p.status])).toEqual([
      ['instagram_reels', 'VID-0034-9x16-v1', 'awaiting_approval'],
      ['facebook_feed', 'VID-0034-1x1-v1', 'awaiting_approval'],
    ]);
    expect((await h.as('pm').get('/tasks/TASK-026')).body.status).toBe('qa');
  });

  it('F2b: QA fails when the receipt used a fact outside allowed_facts', async () => {
    const checklist = (await h.as('pm').get('/factory/qa-checklist')).body.map((item: string) => ({ item, ok: true }));
    const res = await h.as('pm').post('/factory/briefs/SOC-2027CT-005/qa', { passed: true, checklist, reviewerName: 'Jordan Reid' }).expect(409);
    expect(res.body.hint).toContain('facts_used outside allowed_facts: FS-15');
    const returned = (await h.as('pm').post('/factory/briefs/SOC-2027CT-005/qa', { passed: false, checklist, notes: 'Remove the price end card' }).expect(201)).body;
    expect(returned.brief).toMatchObject({ status: 'qa_returned', version: 2 });
    expect(returned.brief.receipts).toHaveLength(1);
  });

  it('F3: Feedback proposes pausing Meta ad set B; accepted in scope, applied live, then verified', async () => {
    await h.as('pm').patch('/settings', { landingPage: { checks: { leadFiresOnce: true } } }).expect(200);

    const run = await h.runAgent('feedback', { scope: ['ads', 'funnel', 'reconciliation'] });
    const idx = run.outputs.findIndex((o) => o.type === 'suggestion');
    expect(run.outputs[idx]).toMatchObject({ title: 'Pause Meta ad set B', inScope: true });
    expect(run.outputs[idx].body).toContain('0 valid leads');

    const taskId = (await decide(run, idx).expect(201)).body.createdId;
    let task: Task = (await h.as('pm').get(`/tasks/${taskId}`)).body;
    expect(task).toMatchObject({ type: 'ad_change', status: 'approved', approval: { preApproved: { scopeRef: 'pauseConditions[0]', authorisedBy: 'Morgan Hale' } } });

    task = (await h.as('executor').post(`/tasks/${taskId}/transition`, { to: 'live' }).expect(201)).body;
    expect(task.status).toBe('live');

    const after = await h.runAgent('feedback', { afterLaunchOf: taskId });
    expect(after.trigger).toBe('after_launch');
    expect(after.outputs.map((o) => o.type)).toEqual(['verification']);
    await decide(after, 0).expect(201);
    expect((await h.as('pm').get(`/tasks/${taskId}`)).body.status).toBe('verified');

    const next = await h.runAgent('feedback', { scope: ['ads'] });
    expect(next.outputs.find((o) => o.title.startsWith('Pause Meta ad set B'))).toMatchObject({ type: 'observation' });
  });

  it('F4: editing an approved caption bumps the version, resets approval, and re-approval binds the new version', async () => {
    const edited: PublishPackage = (await h.as('pm').patch('/packages/PUB-2027CT-011', { caption: 'Four cities in 30 seconds. Link in bio.' }).expect(200)).body;
    expect(edited).toMatchObject({ status: 'awaiting_approval', caption: { version: 'CAP-011-v2' }, approval: { status: 'pending' } });
    expect(edited.captionHistory.map((c) => c.version)).toEqual(['CAP-011-v1', 'CAP-011-v2']);
    expect((await h.as('executor').post('/packages/PUB-2027CT-011/schedule').expect(409)).body.code).toBe('APPROVAL_REQUIRED');
    const approved = (await h.as('client_approver').post('/packages/PUB-2027CT-011/approve').expect(201)).body;
    expect(approved.approval).toMatchObject({ approvedCaptionVersion: 'CAP-011-v2', approvedAssetVersion: 'v1' });
    // Same reel already published on instagram_reels by PUB-2027CT-007 (R5).
    expect((await h.as('executor').post('/packages/PUB-2027CT-011/schedule').expect(409)).body.code).toBe('DUPLICATE_PUBLISH');
  });

  it('F4b: a non-substantive edit can be approved by the PM within scope', async () => {
    await h.as('pm').patch('/packages/PUB-2027CT-011', { caption: 'Four cities in 30 seconds! Which one would you visit first? Link in bio.', nonSubstantive: true, scopeRef: 'punctuation' }).expect(200);
    const approved = (await h.as('pm').post('/packages/PUB-2027CT-011/approve').expect(201)).body;
    expect(approved.approval.nonSubstantive).toEqual({ authorisedBy: 'Morgan Hale', scopeRef: 'punctuation' });
    await h.as('pm').patch('/packages/PUB-2027CT-011', { caption: 'New claim.', nonSubstantive: true, scopeRef: 'new claims' }).expect(409);
  });

  it('F5: an ad task cannot go live until all four gates pass', async () => {
    const gates = (await h.as('pm').get('/tasks/TASK-030/gates').expect(200)).body;
    expect(gates).toEqual({ productFactsConfirmed: true, landingPageReady: false, creativeApproved: true, budgetAndMonitoringApproved: true });

    const blocked = await h.as('executor').post('/tasks/TASK-030/transition', { to: 'live' }).expect(409);
    expect(blocked.body).toMatchObject({ code: 'AD_GATES_UNMET', gates: { landingPageReady: false }, hint: 'Unmet: Landing page traffic-ready' });

    // Budget gate: only a client role can change the pre-approved scope.
    await h.as('pm').patch('/settings', { preApprovedScope: { budgetCapCentsByChannel: { google_search: 0 } } }).expect(403);
    await h.as('client_decision_maker').patch('/settings', { preApprovedScope: { budgetCapCentsByChannel: { google_search: 0, meta_ads: 60000, tiktok: 0 } } }).expect(200);
    const both = await h.as('executor').post('/tasks/TASK-030/transition', { to: 'live' }).expect(409);
    expect(both.body.gates).toMatchObject({ landingPageReady: false, budgetAndMonitoringApproved: false });

    await h.as('client_decision_maker').patch('/settings', { preApprovedScope: { budgetCapCentsByChannel: { google_search: 60000, meta_ads: 60000, tiktok: 0 } } }).expect(200);
    const settings = (await h.as('pm').patch('/settings', { landingPage: { checks: { leadFiresOnce: true } } }).expect(200)).body;
    expect(settings.landingPage.status).toBe('traffic_ready');
    expect((await h.as('executor').post('/tasks/TASK-030/transition', { to: 'live' }).expect(201)).body.status).toBe('live');
  });

  it('F6: a channel with spend and zero valid leads has no CPL number', async () => {
    const { rows } = (await h.as('pm').get('/reconciliation?weeks=3').expect(200)).body;
    const weeks = [...new Set(rows.map((r: { weekStart: string }) => r.weekStart))];
    expect(weeks).toHaveLength(3);
    const meta = rows.find((r: { weekStart: string; channel: string }) => r.weekStart === weeks[1] && r.channel === 'meta_ads');
    expect(meta).toMatchObject({ spendCents: 24000, crmValidLeads: 0, paidCpl: null, overReportRatio: null });
  });
});
