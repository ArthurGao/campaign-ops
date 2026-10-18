import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@campaign-ops/core';
import { forbidden } from '@campaign-ops/core';
import { actorFromRequest } from './actor.decorator';

const ROLES_KEY = 'roles';

/** Endpoint-level role requirement. Finer checks (by target state) live in domain/rules. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const actor = actorFromRequest(ctx.switchToHttp().getRequest<Request>());
    if (roles && !roles.includes(actor.role)) {
      const route = ctx
        .getHandler()
        .name.replace(/([A-Z])/g, ' $1')
        .toLowerCase();
      throw forbidden(route.trim(), roles);
    }
    return true;
  }
}
