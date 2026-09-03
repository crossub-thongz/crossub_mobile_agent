'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import { tourHref } from '@/constants/agent-page-tour';
import { ROUTES, isPortalWelcomeDeferredRoute, isPublicRoute } from '@/constants/routes';
import { needsPasswordChange, needsSystemAccessAgreement } from '@/lib/system-access-agreement';

/** Post-login landing routes that should send new agents to the Tasks walkthrough first. */
const POST_LOGIN_LANDING_PATHS = new Set<string>([ROUTES.DASHBOARD, '/']);

/**
 * After login, agents who have not completed the Tasks page guide are sent to
 * `/tasks?tour=1`. Completion is read from the API via {@link useAgentPageGuides}.
 */
export function AgentPostLoginTasksTourRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useAuth();
  const { ready, isSeen } = useAgentPageGuides();

  useEffect(() => {
    if (status !== 'authed' || !user || !ready || !pathname) return;
    if (isPublicRoute(pathname) || isPortalWelcomeDeferredRoute(pathname)) return;
    if (needsSystemAccessAgreement(user) || needsPasswordChange(user)) return;
    if (isSeen('tasks')) return;

    const normalized = pathname.replace(/\/$/, '') || '/';
    if (pathname.startsWith('/tasks')) return;
    if (!POST_LOGIN_LANDING_PATHS.has(normalized)) return;

    router.replace(tourHref('tasks'));
  }, [isSeen, pathname, ready, router, status, user]);

  return null;
}
