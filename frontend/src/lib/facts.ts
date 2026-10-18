import { CLIENT_ROLES, type FactEntry, type FactView, type Role } from '@campaign-ops/core';

export type FactTone = 'usable' | 'expiring' | 'unconfirmed' | 'internal';

/** docs/05-frontend.md UX rule 2: green usable, amber expiring, red not usable, grey internal. */
export function factTone(fact: FactView | undefined): FactTone {
  if (!fact) return 'unconfirmed';
  if (fact.page === 'internal') return 'internal';
  if (!fact.publiclyUsable) return 'unconfirmed';
  return fact.expiringSoon ? 'expiring' : 'usable';
}

/** Who may confirm an entry: client roles, plus the PM for official-source entries (source workflow). */
export function confirmRoles(fact: Pick<FactEntry, 'official'>): readonly Role[] {
  return fact.official ? [...CLIENT_ROLES, 'pm'] : CLIENT_ROLES;
}
