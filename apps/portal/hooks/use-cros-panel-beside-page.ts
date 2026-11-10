'use client';

import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { useShellAsideStore } from '@/lib/shell-aside-store';
import { useShellDockStore } from '@/lib/shell-dock-store';

/** Room the page gives the open Cros panel on desktop, matching the panel's 480px width. */
export const CROS_PANEL_ROOM_CLASS = 'lg:pr-[480px]';

/**
 * True while the open Cros panel sits beside the page (not full width), so the page,
 * top bar included, should make room for it instead of running under it.
 */
export function useCrosPanelBesidePage(): boolean {
  const isV2 = useIsAgentUiV2();
  const propertiesPageActive = useShellAsideStore((s) => s.propertiesPageActive);
  const propertyPreviewId = useShellAsideStore((s) => s.propertyPreviewId);
  const activePanel = useShellDockStore((s) => s.activePanel);
  const crosWorkspace = useShellDockStore((s) => s.crosWorkspace);
  const showPropertyShellPreview = isV2 && propertiesPageActive && Boolean(propertyPreviewId);
  return isV2 && !showPropertyShellPreview && activePanel === 'gii' && !crosWorkspace;
}
