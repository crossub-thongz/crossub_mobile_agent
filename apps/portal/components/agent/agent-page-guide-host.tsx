'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { AgentPageGuideDialog } from '@/components/agent/agent-page-guide-dialog';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getAgentPageGuide,
  resolveAgentPageGuideId,
  type AgentPageGuideId,
} from '@/constants/agent-page-guides';
import { isPublicRoute } from '@/constants/routes';
import { subscribeContextualAgentPageGuide } from '@/lib/agent-page-guide-context';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';
import {
  isAgentPageGuideSeen,
  markAgentPageGuideSeen,
} from '@/lib/agent-page-guide-state';

/**
 * Shows a first-visit onboarding guide when the agent opens each main list page.
 * Guides appear for all authenticated users; they wait until the global welcome
 * modal is dismissed when that modal is showing.
 */
export function AgentPageGuideHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useAuth();
  const [welcomeBlocking, setWelcomeBlocking] = useState(false);
  const [contextGuideId, setContextGuideId] = useState<AgentPageGuideId | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<AgentPageGuideId | null>(null);

  useEffect(() => subscribeContextualAgentPageGuide(setContextGuideId), []);

  useEffect(() => {
    if (status !== 'authed') {
      setWelcomeBlocking(false);
      return;
    }

    let cancelled = false;

    const syncWelcomeBlock = (eligible: boolean, dismissed: boolean) => {
      if (!cancelled) {
        setWelcomeBlocking(eligible && !dismissed);
      }
    };

    void fetchPortalWelcomeStatus()
      .then((result) => {
        syncWelcomeBlock(result.eligible, result.dismissed);
      })
      .catch(() => {
        if (!cancelled) setWelcomeBlocking(false);
      });

    const onWelcomeDismissed = () => setWelcomeBlocking(false);
    window.addEventListener(PORTAL_WELCOME_DISMISSED_EVENT, onWelcomeDismissed);

    return () => {
      cancelled = true;
      window.removeEventListener(PORTAL_WELCOME_DISMISSED_EVENT, onWelcomeDismissed);
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'authed' || welcomeBlocking || !pathname || isPublicRoute(pathname)) {
      setActiveGuideId(null);
      return;
    }

    const pathnameGuideId = resolveAgentPageGuideId(pathname, searchParams);
    const guideId = contextGuideId ?? pathnameGuideId;

    if (!guideId || isAgentPageGuideSeen(guideId)) {
      setActiveGuideId(null);
      return;
    }

    const timer = window.setTimeout(() => setActiveGuideId(guideId), 450);
    return () => window.clearTimeout(timer);
  }, [pathname, searchParams, contextGuideId, status, welcomeBlocking]);

  if (!activeGuideId) return null;

  const guide = getAgentPageGuide(activeGuideId);

  return (
    <AgentPageGuideDialog
      open
      guide={guide}
      onDismiss={() => {
        markAgentPageGuideSeen(activeGuideId, 'completed');
        setActiveGuideId(null);
      }}
      onSkip={() => {
        markAgentPageGuideSeen(activeGuideId, 'skipped');
        setActiveGuideId(null);
      }}
    />
  );
}
