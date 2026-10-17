import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ROLES, type Role } from '@campaign-ops/core';
import { AppError } from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { DEFAULT_ACTOR_NAMES } from '@campaign-ops/core';

/** Reads X-Role / X-Actor-Name. A missing role defaults to pm (D-29); an unknown role is 400. */
export function actorFromRequest(req: Request): Actor {
  const header = req.header('x-role');
  const role = (header ?? 'pm') as Role;
  if (!ROLES.includes(role)) {
    throw new AppError('VALIDATION', `Unknown role "${header}".`, `X-Role must be one of ${ROLES.join(', ')}.`, 400);
  }
  const name = req.header('x-actor-name')?.trim() || DEFAULT_ACTOR_NAMES[role];
  return { role, name };
}

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor =>
  actorFromRequest(ctx.switchToHttp().getRequest<Request>()),
);
