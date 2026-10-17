import { SEED_NOW } from '../domain/clock';
import type { ErrorCode } from '../domain/enums';
import { AppError } from '../domain/errors';
import type { Actor, Task } from '../domain/types';
import { buildSeed, type Seed } from '../seed';
import { APPROVER, DECIDER, EXECUTOR, PM, SALES } from '../seed/actors';

export { APPROVER, DECIDER, EXECUTOR, PM, SALES, SEED_NOW };

export function freshSeed(): Seed {
  return structuredClone(buildSeed());
}

export function find<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`fixture ${id} not found`);
  return item;
}

/** Run `fn` and return the AppError it throws (fails the test if it does not throw one). */
export function catchAppError(fn: () => unknown): AppError {
  try {
    fn();
  } catch (e) {
    if (e instanceof AppError) return e;
    throw e;
  }
  throw new Error('expected an AppError, nothing was thrown');
}

export function expectCode(fn: () => unknown, code: ErrorCode, status = code === 'FORBIDDEN' ? 403 : 409): AppError {
  const err = catchAppError(fn);
  expect({ code: err.code, status: err.status }).toEqual({ code, status });
  return err;
}

export const actor = (role: Actor['role'], name = 'Test'): Actor => ({ role, name });

export function withTask(seed: Seed, id: string, patch: Partial<Task>): Task {
  const t = find(seed.tasks, id);
  Object.assign(t, patch);
  return t;
}
