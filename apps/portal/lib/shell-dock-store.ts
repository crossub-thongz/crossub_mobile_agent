'use client';

import { create } from 'zustand';

export type ShellDockPanel = 'communication' | 'phone' | 'quick' | 'gii' | null;

type ShellDockStore = {
  activePanel: ShellDockPanel;
  togglePanel: (id: Exclude<ShellDockPanel, null>) => void;
  closePanel: () => void;
};

export const useShellDockStore = create<ShellDockStore>((set) => ({
  activePanel: null,
  togglePanel: (id) =>
    set((state) => ({
      activePanel: state.activePanel === id ? null : id,
    })),
  closePanel: () => set({ activePanel: null }),
}));

/** Desktop shell always shows the Gii panel; mobile uses the header quick-action strip. */
export function useGiiPanelOpen(): boolean {
  return true;
}
