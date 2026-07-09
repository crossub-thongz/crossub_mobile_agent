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

export function useGiiPanelOpen(): boolean {
  return useShellDockStore((s) => s.activePanel === 'gii');
}
