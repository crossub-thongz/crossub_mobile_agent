'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AgentPageTourOverlay } from '@/components/agent/agent-page-tour';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import { AGENT_PAGE_TOURS, tourGuideId, tourModuleFromPathname } from '@/constants/agent-page-tour';
import { isPublicRoute } from '@/constants/routes';
import { subscribeAgentPageTour } from '@/lib/agent-page-tour';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';

export function AgentPageTourHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useAuth();
  const { ready, isSeen, markSeen, setPageGuideBlocking } = useAgentPageGuides();
  const [welcomeBlocking, setWelcomeBlocking] = useState(false);
  const [open, setOpen] = useState(false);

  const module = tourModuleFromPathname(pathname);
  const tourParam = searchParams.get('tour') === '1';

  useEffect(() => {
    if (status !== 'authed') {
      setWelcomeBlocking(false);
      return;
    }

    let cancelled = false;
    void fetchPortalWelcomeStatus()
      .then((result) => {
        if (!cancelled) setWelcomeBlocking(result.eligible && !result.dismissed);
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

  useEffect(() => subscribeAgentPageTour(() => {
    if (module) setOpen(true);
  }), [module]);

  useEffect(() => {
    if (
      open ||
      status !== 'authed' ||
      !ready ||
      welcomeBlocking ||
      !pathname ||
      isPublicRoute(pathname) ||
      !module
    ) {
      return;
    }

    if (tourParam) {
      setOpen(true);
      setPageGuideBlocking(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('tour');
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      return;
    }

    const guideId = tourGuideId(module);
    if (isSeen(guideId)) return;

    setPageGuideBlocking(true);
    const timer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [
    isSeen,
    module,
    pathname,
    ready,
    router,
    searchParams,
    setPageGuideBlocking,
    status,
    tourParam,
    welcomeBlocking,
    open,
  ]);

  if (!open || !module) return null;

  const guideId = tourGuideId(module);

  return (
    <AgentPageTourOverlay
      steps={AGENT_PAGE_TOURS[module]}
      onClose={(closeStatus) => {
        setOpen(false);
        setPageGuideBlocking(false);
        void markSeen(guideId, closeStatus);
      }}
    />
  );
}
