'use client';

import { create } from 'zustand';

export type ShellDockPanel = 'communication' | 'phone' | 'quick' | 'gii' | 'message-menu' | null;

/** Optional launch payload when opening Gii from a property hub or list. */
export type GiiLaunchContext = {
  propertyId?: string;
  propertyAddress?: string;
  /** Pre-built message thread context — resent on every Gii turn so the agent need not paste it. */
  messageContext?: string;
  /** Sent as the first user turn when Gii opens. */
  initialPrompt?: string;
};

/** Scoped embed overrides (message detail, property page) — merged with `giiLaunch` from the shell store. */
export type GiiScope = Pick<
  GiiLaunchContext,
  'propertyId' | 'propertyAddress' | 'messageContext' | 'initialPrompt'
>;

type ShellDockStore = {
  activePanel: ShellDockPanel;
  giiLaunch: GiiLaunchContext | null;
  togglePanel: (id: Exclude<ShellDockPanel, null>) => void;
  closePanel: () => void;
  openGii: (launch?: GiiLaunchContext) => void;
  clearGiiLaunch: () => void;
};

export const useShellDockStore = create<ShellDockStore>((set) => ({
  activePanel: null,
  giiLaunch: null,
  togglePanel: (id) =>
    set((state) => ({
      activePanel: state.activePanel === id ? null : id,
      giiLaunch: id === 'gii' ? state.giiLaunch : state.giiLaunch,
    })),
  closePanel: () => set({ activePanel: null }),
  openGii: (launch?: GiiLaunchContext | null) =>
    set((state) => ({
      activePanel: 'gii',
      giiLaunch: launch === undefined ? state.giiLaunch : launch,
    })),
  clearGiiLaunch: () => set({ giiLaunch: null }),
}));

/** Desktop shell always shows the Gii panel; mobile uses the header quick-action strip. */
export function useGiiPanelOpen(): boolean {
  return true;
}
