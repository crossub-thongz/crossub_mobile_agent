import { create } from 'zustand';

type ShellAsideState = {
  /** True while the v2 properties list page is mounted. */
  propertiesPageActive: boolean;
  /** Selected property id shown in the shell CROS rail. */
  propertyPreviewId: string | null;
  /** Persistent header CROS button. Set by the page shell without remounting the header. */
  headerCrosLauncher: boolean;
  setPropertiesPageActive: (active: boolean) => void;
  setPropertyPreviewId: (id: string | null) => void;
  setHeaderCrosLauncher: (show: boolean) => void;
};

export const useShellAsideStore = create<ShellAsideState>((set) => ({
  propertiesPageActive: false,
  propertyPreviewId: null,
  headerCrosLauncher: false,
  setPropertiesPageActive: (active) =>
    set((state) => ({
      propertiesPageActive: active,
      propertyPreviewId: active ? state.propertyPreviewId : null,
    })),
  setPropertyPreviewId: (id) => set({ propertyPreviewId: id }),
  setHeaderCrosLauncher: (show) => set({ headerCrosLauncher: show }),
}));
