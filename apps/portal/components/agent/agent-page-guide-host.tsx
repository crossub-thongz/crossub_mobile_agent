'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { AgentPageGuideDialog } from '@/components/agent/agent-page-guide-dialog';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getAgentPageGuide,
  resolveAgentPageGuideId,
  type AgentPageGuideId,
} from '@/constants/agent-page-guides';
import { isPublicRoute } from '@/constants/routes';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';
import {
  isAgentPageGuideSeen,
  markAgentPageGuideSeen,
} from '@/lib/agent-page-guide-state';

/**
 * Shows a first-visit onboarding guide when the agent opens each main list page,
 * after Sales onboarding is complete and the global welcome tour is dismissed.
 */
export function AgentPageGuideHost() {
  const pathname = usePathname();
  const { status } = useAuth();
  const [portalReady, setPortalReady] = useState(false);
  const [activeGuideId, setActiveGuideId] = useState<AgentPageGuideId | null>(null);

  useEffect(() => {
    if (status !== 'authed') {
      setPortalReady(false);
      return;
    }

    let cancelled = false;
    void fetchPortalWelcomeStatus()
      .then((result) => {
        if (!cancelled) {
          setPortalReady(result.eligible && result.dismissed);
        }
      })
      .catch(() => {
        if (!cancelled) setPortalReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!portalReady || !pathname || isPublicRoute(pathname)) {
      setActiveGuideId(null);
      return;
    }

    const guideId = resolveAgentPageGuideId(pathname);
    if (!guideId || isAgentPageGuideSeen(guideId)) {
      setActiveGuideId(null);
      return;
    }

    const timer = window.setTimeout(() => setActiveGuideId(guideId), 450);
    return () => window.clearTimeout(timer);
  }, [pathname, portalReady]);

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
