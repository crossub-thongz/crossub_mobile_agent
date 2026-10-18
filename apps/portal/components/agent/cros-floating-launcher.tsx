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
 * Floating CROS entry. Clicking it opens the side panel; the panel can then expand
 * to the full workspace. Below the desktop breakpoint the same click opens the sheet.
 */
export function CrosFloatingLauncher({
  pathname,
  crosRailOnDesktop = false,
}: {
  pathname: string;
  /** Kept for callers that still pin CROS in a permanent rail. */
  crosRailOnDesktop?: boolean;
}) {
  const isV2 = useIsAgentUiV2();
  const { properties, needActionItems } = useAgentData();
  const activePanel = useShellDockStore((s) => s.activePanel);
  const giiExpanded = useShellDockStore((s) => s.giiExpanded);
  const openGii = useShellDockStore((s) => s.openGii);
  const closePanel = useShellDockStore((s) => s.closePanel);

  const propertyId = propertyIdFromPath(pathname);
  const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const isDashboard = pathname === ROUTES.DASHBOARD;
  const panelOpen = activePanel === 'gii';
  const messageThread = isActiveChatPath(pathname);
  const attentionCount = needActionItems.length;

  const showFab = !panelOpen && !messageThread && !crosRailOnDesktop;

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
        <div
          className={cn(
            'fixed z-[70] flex items-center gap-3',
            'right-3.5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]',
            'sm:right-4',
            'lg:right-6 lg:bottom-6',
            isDashboard && 'max-lg:hidden',
            propertyId && 'max-lg:hidden',
          )}
        >
          <p className="border-border/70 bg-background hidden rounded-xl px-4 py-3 text-sm font-medium shadow-lg shadow-black/10 lg:block">
            Ask {CROS_ASSISTANT_NAME} — your AI property assistant
          </p>
          <button
            type="button"
            onClick={handleOpen}
            aria-label={`Ask ${CROS_ASSISTANT_NAME}`}
            className={cn(
              'relative flex size-16 items-center justify-center rounded-[1.35rem] text-white',
              'bg-primary shadow-[0_10px_32px_rgba(0,158,123,0.33)] transition hover:-translate-y-0.5 active:scale-[0.97]',
            )}
          >
            <CrosAssistantLogoBadge size="lg" />
            {attentionCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {attentionCount > 9 ? '9+' : attentionCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {panelOpen && giiExpanded && !messageThread ? (
        <div className={cn(isV2 && 'lg:hidden')}>
          <GiiAssistant open expanded={giiExpanded} variant="modal" onClose={closePanel} />
        </div>
      ) : null}
    </>
  );
}
