'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { AddPaymentMethodPrompt } from '@/components/agent/add-payment-method-prompt';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { isPublicRoute, ROUTES } from '@/constants/routes';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import { fetchAgentBillingSummary } from '@/lib/crossub-api/agent-billing-client';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';
import { usesGlobalPaymentMethodPrompt } from '@/lib/portal-service-level';
import { getStripePublishableKey } from '@/lib/stripe-client';

const EXEMPT_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
];

/**
 * Level 1/2 payment-method prompt. Shown once per login until the agent saves a card
 * or dismisses it. Page guides and spotlight tours wait until this is resolved.
 */
export function AddPaymentMethodGate() {
  const pathname = usePathname();
  const isV2 = useIsAgentUiV2();
  const { user, status } = useAuth();
  const { setPaymentMethodGateBlocking } = useAgentPageGuides();
  const [welcomeBlocking, setWelcomeBlocking] = useState(true);
  const [needsPaymentMethod, setNeedsPaymentMethod] = useState(false);
  const [usesGlobalPrompt, setUsesGlobalPrompt] = useState(false);
  const [checked, setChecked] = useState(false);
  const [dismissedThisLogin, setDismissedThisLogin] = useState(false);

  const onExemptPage =
    !pathname ||
    isPublicRoute(pathname) ||
    EXEMPT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    setDismissedThisLogin(false);
  }, [user?.id]);

  useEffect(() => {
    if (!isV2 || status !== 'authed' || !user || onExemptPage) {
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
  }, [isV2, status, user?.id, onExemptPage]);

  const refreshNeed = useCallback(async () => {
    const summary = await fetchAgentBillingSummary();
    setUsesGlobalPrompt(
      usesGlobalPaymentMethodPrompt(summary.portalServiceLevel) &&
        !summary.platformBillingDisabled,
    );
    setNeedsPaymentMethod(!summary.hasDefaultPaymentMethod);
  }, []);

  useEffect(() => {
    if (!isV2 || status !== 'authed' || !user || onExemptPage) {
      setNeedsPaymentMethod(false);
      setUsesGlobalPrompt(false);
      setChecked(true);
      return;
    }

    let cancelled = false;
    setChecked(false);
    void refreshNeed()
      .catch(() => {
        if (!cancelled) {
          setNeedsPaymentMethod(false);
          setUsesGlobalPrompt(false);
        }
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isV2, status, user?.id, onExemptPage, refreshNeed]);

  const awaitingBillingCheck =
    isV2 && status === 'authed' && Boolean(user) && !onExemptPage && !checked;

  const wantsPrompt =
    checked &&
    usesGlobalPrompt &&
    needsPaymentMethod &&
    !dismissedThisLogin &&
    !welcomeBlocking &&
    Boolean(getStripePublishableKey());

  const showGate =
    isV2 &&
    status === 'authed' &&
    Boolean(user) &&
    !onExemptPage &&
    wantsPrompt;

  const shouldBlockTours =
    isV2 &&
    status === 'authed' &&
    Boolean(user) &&
    !onExemptPage &&
    (welcomeBlocking || awaitingBillingCheck || wantsPrompt);

  useLayoutEffect(() => {
    setPaymentMethodGateBlocking(shouldBlockTours);
    return () => setPaymentMethodGateBlocking(false);
  }, [shouldBlockTours, setPaymentMethodGateBlocking]);

  const handleSaved = () => {
    setNeedsPaymentMethod(false);
  };

  const handleDismiss = () => {
    setDismissedThisLogin(true);
  };

  return (
    <AddPaymentMethodPrompt
      open={showGate}
      dismissible
      onDismiss={handleDismiss}
      onSaved={handleSaved}
    />
  );
}
