import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ACTOR_NAMES, type Role } from '@campaign-ops/core';

type RoleState = {
  role: Role;
  actorName: string;
  setRole(role: Role): void;
};

/** Demo identity: the role switcher in the top bar. Sent as X-Role / X-Actor-Name. */
export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'pm',
      actorName: DEFAULT_ACTOR_NAMES.pm,
      setRole: (role) => set({ role, actorName: DEFAULT_ACTOR_NAMES[role] }),
    }),
    { name: 'campaign-ops:role' },
  ),
);
