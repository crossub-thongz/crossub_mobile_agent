'use client';

import { createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

import { AgentSidebar } from '@/components/layout/agent-sidebar';
import { AgentShellV2Header } from '@/components/layout/agent-shell-v2-header';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { isPortalWelcomeDeferredRoute, isPublicRoute } from '@/constants/routes';

const ShellPersistenceContext = createContext(false);

export function usePersistentAgentChrome(): boolean {
  return useContext(ShellPersistenceContext);
}

/**
 * Sidebar and the top bar stay mounted across module changes. Pages still render
 * their own main column; they skip a second copy of this chrome.
 */
export function PersistentAgentChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isV2 = useIsAgentUiV2();
  const { logout } = useAuth();
  const skip =
    !isV2 ||
    !pathname ||
    isPublicRoute(pathname) ||
    isPortalWelcomeDeferredRoute(pathname);

  if (skip) return children;

  return (
    <ShellPersistenceContext.Provider value={true}>
      <div className="v2-dashboard-canvas flex h-[calc(100dvh-var(--env-banner-height,0px))] overflow-hidden">
        <AgentSidebar onLogout={() => void logout()} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AgentShellV2Header />
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </ShellPersistenceContext.Provider>
  );
}
