import {
  approverRolesFor,
  CLIENT_ROLES,
  type Role,
  type Task,
  type TaskStatus,
} from '@campaign-ops/core';

/** Endpoint-level permissions, mirrored from docs/04-api.md. The API remains the authority. */
export const PERMISSIONS = {
  'fact.edit': ['pm'],
  'fact.confirm': CLIENT_ROLES,
  'evidence.edit': ['pm'],
  'task.create': ['pm'],
  'task.edit': ['pm'],
  'task.package': ['pm'],
  'agent.run': ['pm'],
  'agent.decide': ['pm'],
  'factory.write': ['pm'],
  'package.edit': ['pm'],
  'package.approve': CLIENT_ROLES,
  'package.schedule': ['executor'],
  'package.publish': ['executor'],
  'package.verify': ['pm'],
  'package.takeDown': ['pm'],
  'lead.edit': ['sales'],
  'lead.merge': ['sales'],
  'lead.create': ['sales', 'pm'],
  'settings.scope': CLIENT_ROLES,
  'settings.general': ['pm'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_LABELS: Record<Role, string> = {
  pm: 'PM',
  client_approver: 'Client approver',
  client_decision_maker: 'Client decision maker',
  sales: 'Sales',
  executor: 'Executor',
};

export function requiresText(roles: readonly Role[]): string {
  return `Requires: ${roles.join(' or ')}`;
}

export function can(role: Role, permission: Permission): { ok: boolean; reason?: string } {
  const roles: readonly Role[] = PERMISSIONS[permission];
  return roles.includes(role) ? { ok: true } : { ok: false, reason: requiresText(roles) };
}

/** Which roles may request a task transition (role part only; invariants are the API's job). */
export function transitionRoles(task: Task, to: TaskStatus): readonly Role[] {
  const key = `${task.status}->${to}`;
  switch (key) {
    case 'draft->qa':
    case 'qa->awaiting_approval':
    case 'live->verified':
    case 'blocked->draft':
      return ['pm'];
    case 'awaiting_approval->approved':
      return task.pendingNonSubstantive
        ? [...approverRolesFor(task), 'pm']
        : approverRolesFor(task);
    case 'awaiting_approval->draft':
      return approverRolesFor(task);
    case 'approved->live':
      return ['executor'];
    default:
      return [];
  }
}
