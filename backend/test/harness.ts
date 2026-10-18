import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createValidationPipe } from '../src/common/validation';
import { FixedClock, ManualScheduler, SEED_NOW } from '@campaign-ops/core';
import { CLOCK, SCHEDULER } from '../src/core/core.module';
import type { Role } from '@campaign-ops/core';
import type { AgentRun } from '@campaign-ops/core';

export type Harness = {
  app: INestApplication;
  clock: FixedClock;
  scheduler: ManualScheduler;
  as(role: Role): {
    get(url: string): request.Test;
    post(url: string, body?: object): request.Test;
    patch(url: string, body: object): request.Test;
  };
  /** Advance timers and let resolved adapter promises settle. */
  advance(ms: number): Promise<void>;
  /** Start an agent run and fast-forward until it finishes. */
  runAgent(agent: string, inputs: Record<string, unknown>, trigger?: string): Promise<AgentRun>;
  close(): Promise<void>;
};

const flush = () => new Promise((r) => setImmediate(r));

export async function createHarness(): Promise<Harness> {
  const clock = new FixedClock(SEED_NOW);
  const scheduler = new ManualScheduler(clock);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(SCHEDULER)
    .useValue(scheduler)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  const server = app.getHttpServer();

  const as = (role: Role) => ({
    get: (url: string) => request(server).get(url).set('X-Role', role),
    post: (url: string, body: object = {}) =>
      request(server).post(url).set('X-Role', role).send(body),
    patch: (url: string, body: object) => request(server).patch(url).set('X-Role', role).send(body),
  });

  const advance = async (ms: number) => {
    scheduler.advance(ms);
    await flush();
    await flush();
  };

  return {
    app,
    clock,
    scheduler,
    as,
    advance,
    async runAgent(agent, inputs, trigger) {
      const res = await as('pm')
        .post(`/agents/${agent}/runs`, { inputs, ...(trigger ? { trigger } : {}) })
        .expect(202);
      await advance(10_000);
      const run = await as('pm').get(`/agents/runs/${res.body.runId}`).expect(200);
      return run.body as AgentRun;
    },
    close: () => app.close(),
  };
}
