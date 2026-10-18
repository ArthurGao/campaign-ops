import type { Role } from '../domain/enums';
import type { Actor } from '../domain/types';

/** Fictional people for the demo. The X-Actor-Name header falls back to these per role. */
export const DEFAULT_ACTOR_NAMES: Record<Role, string> = {
  pm: 'Jordan Reid',
  client_approver: 'Sam Carter',
  client_decision_maker: 'Morgan Hale',
  sales: 'Priya Nair',
  executor: 'Tom Walsh',
};

export const PM: Actor = { role: 'pm', name: DEFAULT_ACTOR_NAMES.pm };
export const APPROVER: Actor = {
  role: 'client_approver',
  name: DEFAULT_ACTOR_NAMES.client_approver,
};
export const DECIDER: Actor = {
  role: 'client_decision_maker',
  name: DEFAULT_ACTOR_NAMES.client_decision_maker,
};
export const SALES: Actor = { role: 'sales', name: DEFAULT_ACTOR_NAMES.sales };
export const EXECUTOR: Actor = { role: 'executor', name: DEFAULT_ACTOR_NAMES.executor };
/** Used for automatic changes (blocking, factory callbacks, derived flags). */
export const SYSTEM: Actor = { role: 'pm', name: 'System' };
