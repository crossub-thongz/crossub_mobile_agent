'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { AgentPageGuideDialog } from '@/components/agent/agent-page-guide-dialog';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import {
  getAgentPageGuide,
  resolveAgentPageGuideId,
  type AgentPageGuideId,
} from '@/constants/agent-page-guides';
import { isPublicRoute } from '@/constants/routes';
import { subscribeContextualAgentPageGuide } from '@/lib/agent-page-guide-context';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';

/**
 * Shows a first-visit onboarding guide when the agent opens each main list page.
 * Completion state is stored on the user record via the API.
 */
export function AgentPageGuideHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useAuth();
  const {
    ready,
    isSeen,
    markSeen,
    setPageGuideBlocking,
    paymentMethodGateBlocking,
  } = useAgentPageGuides();
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
    if (
      status !== 'authed' ||
      !ready ||
      welcomeBlocking ||
      paymentMethodGateBlocking ||
      !pathname ||
      isPublicRoute(pathname)
    ) {
      setPageGuideBlocking(false);
      setActiveGuideId(null);
      return;
    }

    const pathnameGuideId = resolveAgentPageGuideId(pathname, searchParams);
    const guideId = contextGuideId ?? pathnameGuideId;
    const usesOnPageTour =
      guideId === 'properties' || guideId === 'tasks' || guideId === 'archive';

    if (!guideId || usesOnPageTour || isSeen(guideId)) {
      setPageGuideBlocking(false);
      setActiveGuideId(null);
      return;
    }

    setPageGuideBlocking(true);
    const timer = window.setTimeout(() => setActiveGuideId(guideId), 450);
    return () => window.clearTimeout(timer);
  }, [
    pathname,
    searchParams,
    contextGuideId,
    status,
    welcomeBlocking,
    paymentMethodGateBlocking,
    ready,
    isSeen,
    setPageGuideBlocking,
  ]);

  if (!activeGuideId) return null;

  const guide = getAgentPageGuide(activeGuideId);
  const guideId = activeGuideId;

  const closeGuide = (status: 'completed' | 'skipped') => {
    setActiveGuideId(null);
    setPageGuideBlocking(false);
    void markSeen(guideId, status);
  };

  return (
    <AgentPageGuideDialog
      open
      guide={guide}
      onDismiss={() => closeGuide('completed')}
      onSkip={() => closeGuide('skipped')}
    />
  );
}
