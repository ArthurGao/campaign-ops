import type { ErrorCode, Role } from './enums';
import type { AdGates } from './types';

/** Domain error; serialised by the exception filter as { code, message, hint, ...extra }. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly hint?: string,
    readonly status: number = 409,
    readonly extra: { gates?: AdGates } = {},
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function forbidden(action: string, roles: readonly Role[]): AppError {
  return new AppError(
    'FORBIDDEN',
    `Your role cannot ${action}.`,
    `Requires: ${roles.join(' or ')}`,
    403,
  );
}

export function notFound(kind: string, id: string): AppError {
  return new AppError('NOT_FOUND', `${kind} ${id} does not exist.`, undefined, 404);
}

export function invalidTransition(from: string, to: string, hint?: string): AppError {
  return new AppError('INVALID_TRANSITION', `Cannot move from ${from} to ${to}.`, hint);
}
