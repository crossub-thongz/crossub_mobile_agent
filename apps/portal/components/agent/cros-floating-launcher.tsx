'use client';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { CrosAssistantLogoBadge } from '@/components/brand/cros-assistant-logo';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { ROUTES } from '@/constants/routes';
import { propertyIdFromPath } from '@/lib/property-path';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function isActiveChatPath(pathname: string): boolean {
  return /^\/messages\/[^/]+$/.test(pathname) && !pathname.startsWith('/messages/new');
}

/**
 * CROS launcher for surfaces that do not show the Ask CROS rail or dashboard ask bar.
 * Desktop v2 uses the rail or a header logo; this FAB covers mobile and v1.
 */
export function CrosFloatingLauncher({
  pathname,
  crosRailOnDesktop,
}: {
  pathname: string;
  /** True when the shell aside already shows Gii (not a property preview). */
  crosRailOnDesktop: boolean;
}) {
  const isV2 = useIsAgentUiV2();
  const { properties } = useAgentData();
  const activePanel = useShellDockStore((s) => s.activePanel);
  const giiExpanded = useShellDockStore((s) => s.giiExpanded);
  const openGii = useShellDockStore((s) => s.openGii);
  const closePanel = useShellDockStore((s) => s.closePanel);

  const propertyId = propertyIdFromPath(pathname);
  const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const isDashboard = pathname === ROUTES.DASHBOARD;
  const modalOpen = activePanel === 'gii' && giiExpanded;
  const messageThread = isActiveChatPath(pathname);

  const showFab = !modalOpen && !messageThread;

  const handleOpen = () => {
    if (propertyId && property) {
      openGii({
        propertyId,
        propertyAddress: formatPropertyFullAddress(property),
      });
      return;
    }
    openGii();
  };

  return (
    <>
      {showFab ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Ask ${CROS_ASSISTANT_NAME}`}
          className={cn(
            'fixed z-[70] flex size-14 items-center justify-center rounded-full',
            'bg-card/95 shadow-lg shadow-black/15 ring-1 ring-border/70 backdrop-blur-md',
            'hover:bg-card active:scale-[0.97] transition',
            'right-3.5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]',
            'sm:right-4',
            'lg:right-6 lg:bottom-6',
            (crosRailOnDesktop || isV2) && 'lg:hidden',
            isDashboard && 'max-lg:hidden',
            propertyId && 'max-lg:hidden',
          )}
        >
          <CrosAssistantLogoBadge size="lg" />
        </button>
      ) : null}

      {modalOpen && !messageThread ? (
        <div className={cn(crosRailOnDesktop && 'lg:hidden')}>
          <GiiAssistant open expanded={giiExpanded} variant="modal" onClose={closePanel} />
        </div>
      ) : null}
    </>
  );
}
