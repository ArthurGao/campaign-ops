import {
  FixedClock,
  ManualScheduler,
  SEED_NOW,
  type AgentRun,
  type Task,
} from '@campaign-ops/core';
import { MockServer } from './server';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('in-browser mock API (standalone frontend, D-04)', () => {
  let clock: FixedClock;
  let scheduler: ManualScheduler;
  let server: MockServer;

  const call = async (role: string, method: string, url: string, body?: unknown) =>
    server.handle(method, url, body, role);
  const runAgent = async (agent: string, inputs: Record<string, unknown>) => {
    const started = await call('pm', 'POST', `/agents/${agent}/runs`, { inputs });
    expect(started.status).toBe(202);
    scheduler.advance(10_000);
    await new Promise((r) => setTimeout(r, 0));
    return (await call('pm', 'GET', `/agents/runs/${(started.body as { runId: string }).runId}`))
      .body as AgentRun;
  };

  beforeEach(() => {
    clock = new FixedClock(SEED_NOW);
    scheduler = new ManualScheduler(clock);
    server = new MockServer({ clock, scheduler });
  });

  it('returns the same error shapes as the backend: 403, 404, 400, 409 with gates', async () => {
    expect(await call('executor', 'POST', '/tasks', { type: 'social_post', title: 'x' })).toEqual({
      status: 403,
      body: { code: 'FORBIDDEN', message: 'Your role cannot do this.', hint: 'Requires: pm' },
      text: undefined,
    });
    expect((await call('pm', 'GET', '/nope')).status).toBe(404);
    expect((await call('admin', 'GET', '/tasks')).status).toBe(400);
    const gated = await call('executor', 'POST', '/tasks/TASK-030/transition', { to: 'live' });
    expect(gated).toMatchObject({
      status: 409,
      body: { code: 'AD_GATES_UNMET', gates: { landingPageReady: false } },
    });
  });

  it('F1: needs_confirmation → blocked task → client confirms → draft unblocks it', async () => {
    const spec = '≤ 80 words, must include departure date, link at end';
    const run1 = await runAgent('outbound', { mode: 'draft', channel: 'facebook', spec });
    expect(run1.outputs.map((o) => o.type)).toEqual(['needs_confirmation']);
    const decided = await call(
      'pm',
      'POST',
      `/agents/runs/${run1.id}/outputs/${run1.outputs[0].id}/decision`,
      { status: 'accepted' },
    );
    const taskId = (decided.body as { createdId: string }).createdId;
    expect(((await call('pm', 'GET', `/tasks/${taskId}`)).body as Task).status).toBe('blocked');

    expect(
      (
        await call('client_approver', 'POST', '/fact-sheet/FS-04/confirm', {
          source: 'Client email',
        })
      ).status,
    ).toBe(201);
    const run2 = await runAgent('outbound', { mode: 'draft', taskId, spec });
    await call('pm', 'POST', `/agents/runs/${run2.id}/outputs/${run2.outputs[0].id}/decision`, {
      status: 'accepted',
    });
    const task = (await call('pm', 'GET', `/tasks/${taskId}`)).body as Task;
    expect(task).toMatchObject({ status: 'draft', factRefs: ['FS-04', 'FS-07', 'FS-11'] });
  });

  it('F5: with date, price and seats confirmed, flipping the fourth landing check lets the ad go live', async () => {
    for (const id of ['FS-04', 'FS-15', 'FS-16']) {
      expect(
        (
          await call('client_approver', 'POST', `/fact-sheet/${id}/confirm`, {
            source: 'Client email',
          })
        ).status,
      ).toBe(201);
    }
    await call('pm', 'PATCH', '/settings', { landingPage: { checks: { leadFiresOnce: true } } });
    expect(
      (await call('executor', 'POST', '/tasks/TASK-030/transition', { to: 'live' })).status,
    ).toBe(201);
  });

  it('responses are copies: mutating one never leaks into the store', async () => {
    const res = await call('pm', 'GET', '/tasks/TASK-030');
    (res.body as Task).status = 'verified';
    expect(((await call('pm', 'GET', '/tasks/TASK-030')).body as Task).status).toBe('approved');
  });

  it('serves the de-identified CSV as text', async () => {
    const res = await call('pm', 'GET', '/leads/export');
    expect(res.text).toBe(true);
    expect(String(res.body).split('\n')[0]).toMatch(/^id,receivedAt,tour/);
    expect(String(res.body)).not.toMatch(/@example\.com/);
  });

  it('persists demo state across a reload and fails runs interrupted mid-flight', async () => {
    const storage = memoryStorage();
    const first = new MockServer({ clock, scheduler, storage });
    await first.handle(
      'POST',
      '/fact-sheet/FS-04/confirm',
      { source: 'Client email' },
      'client_approver',
    );
    const started = (
      await first.handle(
        'POST',
        '/agents/audit/runs',
        { inputs: { siteUrl: 'https://demo-travel.example' } },
        'pm',
      )
    ).body as { runId: string };

    const reloaded = new MockServer({
      clock: new FixedClock(SEED_NOW),
      scheduler: new ManualScheduler(),
      storage,
    });
    const fact = (
      (await reloaded.handle('GET', '/fact-sheet/external', undefined, 'pm')).body as {
        entries: { id: string; status: string }[];
      }
    ).entries.find((e) => e.id === 'FS-04');
    expect(fact?.status).toBe('confirmed');
    const run = (await reloaded.handle('GET', `/agents/runs/${started.runId}`, undefined, 'pm'))
      .body as AgentRun;
    expect(run).toMatchObject({
      status: 'failed',
      error: 'Interrupted by a page reload. Run it again.',
    });
    expect(
      ((await reloaded.handle('GET', '/agents/runs/RUN-0011', undefined, 'pm')).body as AgentRun)
        .status,
    ).toBe('queued');

    await reloaded.handle('POST', '/settings/reset-demo', {}, 'sales');
    const saved = JSON.parse(storage.getItem('campaign-ops:demo-state') ?? '{}') as {
      data?: { facts: { id: string; status: string }[] };
    };
    expect(saved.data?.facts.find((f) => f.id === 'FS-04')?.status).toBe('pending');
  });
});
