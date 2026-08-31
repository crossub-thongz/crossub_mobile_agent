'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { StripeSetupDialog, type StripeSetupDialogState } from '@/components/billing/stripe-setup-dialog';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import { Button } from '@/components/ui/button';
import { isPublicRoute, ROUTES } from '@/constants/routes';
import { PORTAL_WELCOME_DISMISSED_EVENT } from '@/lib/agent-page-guide-events';
import {
  createAgentPaymentMethodSetup,
  fetchAgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { fetchPortalWelcomeStatus } from '@/lib/crossub-api/agent-client';
import { isPlatformBillingDisabled } from '@/lib/platform-billing-ui';
import { getStripePublishableKey } from '@/lib/stripe-client';

const EXEMPT_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
];

/**
 * Blocking prompt until the agency saves a default card. Waits for the welcome
 * video and any first-visit page guide, then stays until Stripe setup succeeds.
 */
export function AddPaymentMethodGate() {
  const pathname = usePathname();
  const { user, status } = useAuth();
  const { ready: guidesReady, pageGuideBlocking } = useAgentPageGuides();
  const [welcomeBlocking, setWelcomeBlocking] = useState(true);
  const [sequenceHold, setSequenceHold] = useState(true);
  const [needsPaymentMethod, setNeedsPaymentMethod] = useState(false);
  const [checked, setChecked] = useState(false);
  const [setupDialog, setSetupDialog] = useState<StripeSetupDialogState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExemptPage =
    !pathname ||
    isPublicRoute(pathname) ||
    EXEMPT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    if (status !== 'authed' || !user || onExemptPage) {
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
  }, [status, user?.id, onExemptPage]);

  const refreshNeed = useCallback(async () => {
    const summary = await fetchAgentBillingSummary();
    if (isPlatformBillingDisabled(summary)) {
      setNeedsPaymentMethod(false);
      return;
    }
    setNeedsPaymentMethod(!summary.hasDefaultPaymentMethod);
  }, []);

  useEffect(() => {
    if (status !== 'authed' || !user || onExemptPage) {
      setNeedsPaymentMethod(false);
      setChecked(true);
      return;
    }

    let cancelled = false;
    setChecked(false);
    void refreshNeed()
      .catch(() => {
        if (!cancelled) setNeedsPaymentMethod(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, user?.id, onExemptPage, refreshNeed]);

  useEffect(() => {
    if (welcomeBlocking || !guidesReady || pageGuideBlocking) {
      setSequenceHold(true);
      return;
    }
    const timer = window.setTimeout(() => setSequenceHold(false), 500);
    return () => window.clearTimeout(timer);
  }, [welcomeBlocking, guidesReady, pageGuideBlocking]);

  const waitingForWelcomeOrGuide =
    !guidesReady || welcomeBlocking || pageGuideBlocking || sequenceHold;

  const showGate =
    status === 'authed' &&
    Boolean(user) &&
    !onExemptPage &&
    checked &&
    needsPaymentMethod &&
    !waitingForWelcomeOrGuide;

  useEffect(() => {
    if (!showGate) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const blockKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [showGate]);

  const startSetup = async () => {
    if (!getStripePublishableKey()) {
      setError('Card payments are not configured on this environment. Contact CROSSUB support.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const { clientSecret } = await createAgentPaymentMethodSetup();
      setSetupDialog({ clientSecret, mode: 'add' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment method setup');
    } finally {
      setStarting(false);
    }
  };

  const handleSaved = async () => {
    await refreshNeed();
    setSetupDialog(null);
  };

  if (!showGate) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-payment-method-title"
      >
        <div className="relative w-full max-w-md rounded-xl border bg-card p-5 shadow-xl">
          <p className="text-primary text-xs font-semibold uppercase tracking-wide">
            Required to continue
          </p>
          <h2 id="add-payment-method-title" className="mt-1 text-lg font-semibold">
            Add a payment method
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Save a card to keep using the Agent app. CROSSUB uses it for inspections, tribunal,
            and monthly invoices. This stays on screen until a payment method is saved.
          </p>
          {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
          <Button className="mt-5 w-full" disabled={starting} onClick={() => void startSetup()}>
            {starting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            Add payment method
          </Button>
        </div>
      </div>
      <StripeSetupDialog
        state={setupDialog}
        dismissible={false}
        onOpenChange={(open) => {
          if (!open) setSetupDialog(null);
        }}
        onSuccess={() => void handleSaved()}
      />
    </>
  );
}
