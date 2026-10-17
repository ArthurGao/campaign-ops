import type { AdGates, ErrorCode } from '@campaign-ops/core';
import { useRoleStore } from '@/store/role.store';
import type { MockServer } from './mock/server';

/** Error body every blocked action returns: { code, message, hint } (+ gates for AD_GATES_UNMET). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'INTERNAL' | 'NETWORK',
    message: string,
    readonly hint?: string,
    readonly gates?: AdGates,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3400';

let mockServer: Promise<MockServer> | undefined;

/** Lazily start the in-browser API (code-split, so http mode never ships it). */
export function getMockServer(): Promise<MockServer> {
  mockServer ??= import('./mock/server').then(
    ({ MockServer }) => new MockServer({ latencyMs: 120, storage: typeof localStorage === 'undefined' ? undefined : localStorage }),
  );
  return mockServer;
}

/** Test hook: swap the in-browser server (e.g. one with a manual scheduler). */
export function setMockServer(server: MockServer): void {
  mockServer = Promise.resolve(server);
}

function toError(status: number, body: unknown): ApiError {
  const b = (body ?? {}) as { code?: ApiError['code']; message?: string; hint?: string; gates?: AdGates };
  return new ApiError(status, b.code ?? 'INTERNAL', b.message ?? `Request failed (${status})`, b.hint, b.gates);
}

export async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, opts: { text?: boolean } = {}): Promise<T> {
  const { role, actorName } = useRoleStore.getState();
  if (API_MODE === 'mock') {
    const server = await getMockServer();
    const res = await server.handle(method, path, body, role, actorName);
    if (res.status >= 400) throw toError(res.status, res.body);
    return res.body as T;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Role': role, 'X-Actor-Name': actorName },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', `Cannot reach the API at ${BASE_URL}.`, 'Start the backend, or run the frontend in mock mode.');
  }
  if (!res.ok) throw toError(res.status, await res.json().catch(() => ({})));
  return (opts.text ? await res.text() : await res.json()) as T;
}

export const api = {
  get: <T>(path: string, opts?: { text?: boolean }) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
};
