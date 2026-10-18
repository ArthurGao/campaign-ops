import { createHarness, type Harness } from './harness';

describe('API invariants and error shape (e2e)', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await createHarness();
  });

  afterEach(async () => {
    await h.close();
  });

  it('403 carries { code, message, hint: Requires: … }', async () => {
    const res = await h
      .as('executor')
      .post('/tasks', { type: 'social_post', title: 'x' })
      .expect(403);
    expect(res.body).toEqual({
      code: 'FORBIDDEN',
      message: expect.any(String),
      hint: 'Requires: pm',
    });
  });

  it('400 for an unknown role and for invalid bodies', async () => {
    await h.app.getHttpServer();
    const unknown = await h.as('pm').get('/tasks').set('X-Role', 'admin').expect(400);
    expect(unknown.body.code).toBe('VALIDATION');
    const bad = await h.as('pm').post('/tasks', { type: 'banner', title: '' }).expect(400);
    expect(bad.body.code).toBe('VALIDATION');
  });

  it('404 with NOT_FOUND', async () => {
    expect((await h.as('pm').get('/tasks/TASK-999').expect(404)).body.code).toBe('NOT_FOUND');
  });

  it('I-F1: the external endpoint never returns internal entries', async () => {
    const { entries } = (await h.as('pm').get('/fact-sheet/external').expect(200)).body;
    expect(entries.length).toBe(9);
    expect(entries.filter((e: { page: string }) => e.page !== 'external')).toEqual([]);
    const all = (await h.as('pm').get('/fact-sheet?page=internal').expect(200)).body.entries;
    expect(all.map((e: { id: string }) => e.id)).toEqual([
      'FS-20',
      'FS-21',
      'FS-22',
      'FS-23',
      'FS-24',
    ]);
  });

  it('I-A3: the Outbound input snapshot contains external facts only', async () => {
    const run = await h.runAgent('outbound', {
      mode: 'draft',
      channel: 'instagram',
      spec: 'short caption',
    });
    const entries = (run.inputs.factSheet as { entries: { id: string; page: string }[] }).entries;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter((e) => e.page !== 'external')).toEqual([]);
    expect(JSON.stringify(run)).not.toMatch(/FS-2[0-4]/);
  });

  it('run lifecycle: queued → running → completed, polling-friendly', async () => {
    const { runId } = (
      await h
        .as('pm')
        .post('/agents/audit/runs', {
          inputs: { siteUrl: 'https://demo-travel.example', scope: ['seo'] },
        })
        .expect(202)
    ).body;
    expect((await h.as('pm').get(`/agents/runs/${runId}`)).body.status).toBe('queued');
    await h.advance(500);
    expect((await h.as('pm').get(`/agents/runs/${runId}`)).body.status).toBe('running');
    await h.advance(3_000);
    const run = (await h.as('pm').get(`/agents/runs/${runId}`)).body;
    expect(run.status).toBe('completed');
    expect(run.outputs.map((o: { title: string }) => o.title)).toEqual([
      'China Tour page has no structured data',
    ]);
  });

  it('Audit run without a URL fails with "No URL provided"', async () => {
    const run = await h.runAgent('audit', { siteUrl: '' });
    expect(run).toMatchObject({ status: 'failed', error: 'No URL provided', outputs: [] });
  });

  it('I-A1: an output can be decided once; rejected outputs stay in history', async () => {
    const run = (await h.as('pm').get('/agents/runs/RUN-0003')).body;
    const out = run.outputs.find((o: { decision?: unknown }) => !o.decision);
    const rejected = await h
      .as('pm')
      .post(`/agents/runs/RUN-0003/outputs/${out.id}/decision`, {
        status: 'rejected',
        note: 'Known; on the sales list',
      })
      .expect(201);
    expect(rejected.body.createdType).toBe('none');
    const again = await h
      .as('pm')
      .post(`/agents/runs/RUN-0003/outputs/${out.id}/decision`, { status: 'accepted' })
      .expect(409);
    expect(again.body.code).toBe('INVALID_TRANSITION');
    const kept = (await h.as('pm').get('/agents/runs/RUN-0003')).body.outputs.find(
      (o: { id: string }) => o.id === out.id,
    );
    expect(kept.decision).toMatchObject({ status: 'rejected', note: 'Known; on the sales list' });
  });

  it('agents never change state themselves: a completed run leaves tasks untouched until a decision', async () => {
    const before = (await h.as('pm').get('/tasks')).body.length;
    await h.runAgent('feedback', {});
    expect((await h.as('pm').get('/tasks')).body.length).toBe(before);
  });

  it('page lock: a second change on the same page cannot go live', async () => {
    await h
      .as('client_approver')
      .post('/tasks/TASK-018/transition', { to: 'approved' })
      .expect(201);
    const res = await h
      .as('executor')
      .post('/tasks/TASK-018/transition', { to: 'live' })
      .expect(409);
    expect(res.body).toMatchObject({ code: 'PAGE_LOCKED' });
    expect(res.body.hint).toContain('TASK-016');
  });

  it('R6 / I-L3: de-identified export strips contacts; merge only for the same travel need', async () => {
    const csv = await h.as('pm').get('/leads/export').expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).not.toMatch(/@example\.com|\+64|Demo Lead/);
    expect((await h.as('pm').get('/leads/merge-suggestions')).body).toEqual([
      expect.objectContaining({ leadId: 'L-0026', intoId: 'L-0025' }),
    ]);
    expect(
      (await h.as('sales').post('/leads/L-0017/merge', { intoId: 'L-0016' }).expect(409)).body.code,
    ).toBe('INVALID_TRANSITION');
    await h.as('pm').post('/leads/L-0026/merge', { intoId: 'L-0025' }).expect(403);
    await h.as('sales').post('/leads/L-0026/merge', { intoId: 'L-0025' }).expect(201);
    expect((await h.as('pm').get('/leads/merge-suggestions')).body).toEqual([]);
  });

  it('the PM confirms official-source facts only, and only with an expiry', async () => {
    const expiresAt = '2026-12-31T00:00:00.000Z';
    expect(
      (
        await h
          .as('pm')
          .post('/fact-sheet/FS-09/confirm', { source: 'https://example.govt.nz/visa' })
          .expect(409)
      ).body.code,
    ).toBe('VALIDATION');
    const ok = await h
      .as('pm')
      .post('/fact-sheet/FS-09/confirm', { source: 'https://example.govt.nz/visa', expiresAt })
      .expect(201);
    expect(ok.body).toMatchObject({ status: 'confirmed_with_expiry', confirmedBy: { role: 'pm' } });
    const denied = await h
      .as('pm')
      .post('/fact-sheet/FS-04/confirm', { source: 'x', expiresAt })
      .expect(403);
    expect(denied.body.hint).toBe('Requires: client_approver or client_decision_maker');
  });

  it('reset-demo restores the seed', async () => {
    await h.as('client_approver').post('/fact-sheet/FS-04/confirm', { source: 'x' }).expect(201);
    await h.as('sales').post('/settings/reset-demo').expect(201);
    expect(
      (await h.as('pm').get('/fact-sheet/external')).body.entries.find(
        (e: { id: string }) => e.id === 'FS-04',
      ).status,
    ).toBe('pending');
  });

  it('dashboard answers the three questions', async () => {
    const d = (await h.as('pm').get('/dashboard').expect(200)).body;
    expect(d.threeQuestions.canSell).toMatchObject({ usable: 4, total: 8 });
    expect(d.threeQuestions.canCatch.landingPageStatus).toBe('not_ready');
    expect(d.blockers.map((b: { item: { id: string } }) => b.item.id)).toEqual([
      'E-03',
      'E-07',
      'TASK-021',
    ]);
    expect(d.awaitingApproval).toEqual({ tasks: 2, packages: 1 });
    expect(d.hoursThisWeek).toEqual({ used: 9.5, cap: 16 });
    expect(d.nextCheckpoint).toBe('2026-10-25T20:00:00.000Z');
  });
});
