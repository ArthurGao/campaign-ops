import {
  AppError,
  createCore,
  DEFAULT_ACTOR_NAMES,
  DemoClock,
  ROLES,
  SEED_VERSION,
  TimerScheduler,
  type Core,
  type CoreOptions,
  type Role,
  type Scheduler,
  type Seed,
} from '@campaign-ops/core';
import { matchPattern, ROUTES } from './routes';

export type MockResponse = { status: number; body: unknown; text?: boolean };

export type MockServerOptions = CoreOptions & {
  /** Simulated network latency (ms); 0 in tests. */
  latencyMs?: number;
  /** Where demo state survives reloads; omit to keep state in memory only. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

const STORAGE_KEY = 'campaign-ops:demo-state';
const SEEDED_RUNS = new Set(['RUN-0011']);
type Saved = { seedVersion: string; resetAt: number; data: Seed };

/**
 * The documented REST API, served inside the browser by the shared core (docs/decisions.md D-04).
 * Same paths, roles, invariants, 409 payloads and agent timers as the NestJS backend.
 */
export class MockServer {
  readonly core: Core;
  private readonly latencyMs: number;
  private readonly storage?: MockServerOptions['storage'];

  constructor(opts: MockServerOptions = {}) {
    this.latencyMs = opts.latencyMs ?? 0;
    this.storage = opts.storage;
    const inner = opts.scheduler ?? new TimerScheduler();
    // Agent runs and factory jobs change state from timers: save after each one settles.
    const scheduler: Scheduler = {
      schedule: (ms, task) =>
        inner.schedule(ms, () => (task(), setTimeout(() => this.persist(), 0))),
      cancelAll: () => inner.cancelAll(),
    };
    this.core = createCore({ ...opts, clock: opts.clock ?? new DemoClock(), scheduler });
    this.restore();
  }

  async handle(
    method: string,
    url: string,
    body: unknown,
    role: string | undefined,
    actorName?: string,
  ): Promise<MockResponse> {
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    const res = this.dispatch(method.toUpperCase(), url, body, role, actorName);
    if (method.toUpperCase() !== 'GET') this.persist();
    // Serialise like HTTP would, so callers never hold references into the store.
    return res.text
      ? res
      : { ...res, body: res.body === undefined ? undefined : JSON.parse(JSON.stringify(res.body)) };
  }

  private dispatch(
    method: string,
    url: string,
    body: unknown,
    roleHeader: string | undefined,
    actorName?: string,
  ): MockResponse {
    try {
      const role = (roleHeader ?? 'pm') as Role;
      if (!ROLES.includes(role)) {
        throw new AppError(
          'VALIDATION',
          `Unknown role "${roleHeader}".`,
          `X-Role must be one of ${ROLES.join(', ')}.`,
          400,
        );
      }
      const actor = { role, name: actorName?.trim() || DEFAULT_ACTOR_NAMES[role] };
      const u = new URL(url, 'http://mock.local');
      const path = u.pathname.replace(/\/+$/, '') || '/';
      for (const route of ROUTES) {
        if (route.method !== method) continue;
        const params = matchPattern(route.pattern, path);
        if (!params) continue;
        if (route.roles && !route.roles.includes(role)) {
          throw new AppError(
            'FORBIDDEN',
            'Your role cannot do this.',
            `Requires: ${route.roles.join(' or ')}`,
            403,
          );
        }
        const result = route.handler(this.core, {
          params,
          query: u.searchParams,
          body: (body ?? {}) as Record<string, unknown>,
          actor,
        });
        if (path === '/settings/reset-demo') this.storage?.removeItem(STORAGE_KEY);
        return { status: route.status ?? 200, body: result, text: route.text };
      }
      throw new AppError('NOT_FOUND', `${method} ${path} is not an API endpoint.`, undefined, 404);
    } catch (e) {
      if (e instanceof AppError) {
        return {
          status: e.status,
          body: {
            code: e.code,
            message: e.message,
            ...(e.hint ? { hint: e.hint } : {}),
            ...e.extra,
          },
        };
      }
      console.error('[mock-api]', e);
      return {
        status: 500,
        body: { code: 'INTERNAL', message: e instanceof Error ? e.message : 'Unexpected error.' },
      };
    }
  }

  /** Save the whole demo state; called after every write and by the timer callbacks' poll. */
  persist(): void {
    if (!this.storage) return;
    const clock = this.core.clock;
    const saved: Saved = {
      seedVersion: SEED_VERSION,
      resetAt: clock instanceof DemoClock ? clock.resetAt : Date.now(),
      data: this.core.store.data,
    };
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Quota or privacy mode: the demo keeps working in memory.
    }
  }

  private restore(): void {
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Saved;
      if (saved.seedVersion !== SEED_VERSION) return;
      this.core.store.reset(saved.data);
      if (this.core.clock instanceof DemoClock) this.core.clock.restore(saved.resetAt);
      // Timers do not survive a reload: interrupted agent runs fail visibly; factory jobs resume.
      const at = this.core.clock.now().toISOString();
      for (const r of this.core.store.data.runs) {
        if ((r.status === 'queued' || r.status === 'running') && !SEEDED_RUNS.has(r.id)) {
          Object.assign(r, {
            status: 'failed',
            finishedAt: at,
            error: 'Interrupted by a page reload. Run it again.',
          });
        }
      }
      const seededBriefs = new Set(['SOC-2027CT-003', 'SOC-2027CT-004', 'SOC-2027CT-005']);
      this.core.factory.resumeInFlight(
        this.core.store.data.briefs.filter((b) => !seededBriefs.has(b.id)).map((b) => b.id),
      );
    } catch {
      this.storage?.removeItem(STORAGE_KEY);
    }
  }
}
