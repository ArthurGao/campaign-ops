import { create } from 'zustand';

/** UI-only state (frontend/CLAUDE.md: Zustand for role and sidebar only). */
export const useUiStore = create<{ navOpen: boolean; setNavOpen(open: boolean): void }>((set) => ({
  navOpen: false,
  setNavOpen: (navOpen) => set({ navOpen }),
}));
