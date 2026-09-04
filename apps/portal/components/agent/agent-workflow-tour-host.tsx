'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AgentPageTourOverlay } from '@/components/agent/agent-page-tour';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import {
  isAgentWorkflowTourId,
  resolveWorkflowTourContext,
  workflowTourGuideId,
  workflowTourSteps,
  type AgentWorkflowTourId,
} from '@/constants/agent-workflow-tour';
import { isPublicRoute } from '@/constants/routes';
import {
  clearPendingWorkflowTour,
  readPendingWorkflowTour,
  setPendingWorkflowTour,
  subscribeAgentWorkflowTour,
} from '@/lib/agent-workflow-tour';
import { focusWorkflowTourTab } from '@/lib/workflow-tour-tab-focus';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';

export function AgentWorkflowTourHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useAuth();
  const {
    ready,
    isSeen,
    markSeen,
    setPageGuideBlocking,
    paymentMethodGateBlocking,
  } = useAgentPageGuides();
  const [welcomeBlocking, setWelcomeBlocking] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<{
    id: AgentWorkflowTourId;
    phase: 'entry' | 'detail';
  } | null>(null);
  const [pendingId, setPendingId] = useState<AgentWorkflowTourId | null>(null);
  const pendingTourParamRef = useRef(false);

  const workflowTourParam = searchParams.get('workflowTour');
  const context = resolveWorkflowTourContext(pathname, searchParams, pendingId);

  useEffect(() => {
    setPendingId(readPendingWorkflowTour());
  }, [pathname, workflowTourParam]);

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

  useEffect(() => {
    if (isAgentWorkflowTourId(workflowTourParam)) {
      pendingTourParamRef.current = true;
      setPendingWorkflowTour(workflowTourParam);
      setPendingId(workflowTourParam);
    }
  }, [workflowTourParam]);

  useEffect(() => {
    return subscribeAgentWorkflowTour(() => {
      if (!context || welcomeBlocking || paymentMethodGateBlocking) return;
      setActiveTour(context);
      setOpen(true);
    });
  }, [context, paymentMethodGateBlocking, welcomeBlocking]);

  useEffect(() => {
    if (paymentMethodGateBlocking && open) {
      setOpen(false);
      setPageGuideBlocking(false);
      setActiveTour(null);
    }
  }, [open, paymentMethodGateBlocking, setPageGuideBlocking]);

  useEffect(() => {
    if (
      status !== 'authed' ||
      !ready ||
      welcomeBlocking ||
      paymentMethodGateBlocking ||
      !pathname ||
      isPublicRoute(pathname) ||
      !context
    ) {
      return;
    }

    const shouldOpenFromParam =
      pendingTourParamRef.current ||
      isAgentWorkflowTourId(workflowTourParam) ||
      workflowTourParam === '1';

    if (shouldOpenFromParam) {
      setPageGuideBlocking(true);
      const timer = window.setTimeout(() => {
        setActiveTour(context);
        setOpen(true);
        if (context.phase === 'detail') {
          focusWorkflowTourTab();
        }
        pendingTourParamRef.current = false;
        if (isAgentWorkflowTourId(workflowTourParam) || workflowTourParam === '1') {
          const next = new URLSearchParams(searchParams.toString());
          next.delete('workflowTour');
          const query = next.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }
      }, 450);
      return () => window.clearTimeout(timer);
    }

    if (context.phase === 'detail' && pendingId === context.id) {
      setPageGuideBlocking(true);
      const timer = window.setTimeout(() => {
        setActiveTour(context);
        setOpen(true);
        focusWorkflowTourTab();
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [
    context,
    pathname,
    pendingId,
    ready,
    router,
    searchParams,
    setPageGuideBlocking,
    status,
    welcomeBlocking,
    paymentMethodGateBlocking,
    workflowTourParam,
  ]);

  if (!open || !activeTour || paymentMethodGateBlocking) return null;

  const guideId = workflowTourGuideId(activeTour.id);
  const steps = workflowTourSteps(activeTour.id, activeTour.phase);

  return (
    <AgentPageTourOverlay
      steps={steps}
      onClose={(closeStatus) => {
        setOpen(false);
        setPageGuideBlocking(false);
        setActiveTour(null);
        if (activeTour.phase === 'detail' || closeStatus === 'skipped') {
          clearPendingWorkflowTour();
          setPendingId(null);
        }
        if (activeTour.phase === 'detail') {
          void markSeen(guideId, closeStatus);
        }
      }}
    />
  );
}
