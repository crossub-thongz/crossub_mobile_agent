'use client';

import { usePathname } from 'next/navigation';
import { CreditCard, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import { isPublicRoute, ROUTES } from '@/constants/routes';
import { isAgentPaymentNotification } from '@/lib/agent-payment-notification';
import {
  AGENT_PAY_NOW_EVENT,
  isPrepaidAwaitingCharge,
  startAgentPrepaidPayment,
  type AgentPayNowDetail,
} from '@/lib/billing/agent-pay-now';
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import {
  listAgentChargeHistory,
  type AgentBillingCharge,
} from '@/lib/crossub-api/agent-billing-client';
import { needsPasswordChange, needsSystemAccessAgreement } from '@/lib/system-access-agreement';
import { cn, formatCurrency } from '@/lib/utils';

const HIDDEN_ROUTES = [
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.AGREEMENTS,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.BILLING_OVERDUE,
] as const;

function isHiddenRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) return true;
  return HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Persistent top-of-app reminder for unpaid staff-created platform fees.
 * Closing it is session-only — a refresh brings it back until the fee is paid.
 * Pay now opens the Stripe popup instead of only navigating to Invoice.
 */
export function AgentPaymentReminderBanner() {
  const pathname = usePathname();
  const isV2 = useIsAgentUiV2();
  const { user, status } = useAuth();
  const { notifications, platformBillingDisabled } = useAgentData();
  const [charges, setCharges] = useState<AgentBillingCharge[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const onBillPage = pathname === ROUTES.BILL;

  const reloadCharges = useCallback(async () => {
    const rows = await listAgentChargeHistory();
    setCharges(rows.filter(isPrepaidAwaitingCharge));
  }, []);

  useEffect(() => {
    if (status !== 'authed' || !user) return;
    if (isHiddenRoute(pathname)) return;

    let cancelled = false;
    void reloadCharges().catch(() => {
      if (!cancelled) setCharges([]);
    });

    return () => {
      cancelled = true;
    };
  }, [status, user, onBillPage, pathname, reloadCharges]);

  const unpaid = charges ?? [];

  const payNow = useCallback(
    async (href?: string) => {
      if (paying || paymentDialog) return;
      setPaying(true);
      try {
        const outcome = await startAgentPrepaidPayment({
          charges: unpaid,
          href,
          setPaymentDialog,
        });
        if (outcome === 'complete') {
          await reloadCharges().catch(() => undefined);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Payment failed');
      } finally {
        setPaying(false);
      }
    },
    [paying, paymentDialog, unpaid, reloadCharges],
  );

  useEffect(() => {
    const onPayNow = (event: Event) => {
      const href = (event as CustomEvent<AgentPayNowDetail>).detail?.href;
      void payNow(href);
    };
    window.addEventListener(AGENT_PAY_NOW_EVENT, onPayNow);
    return () => window.removeEventListener(AGENT_PAY_NOW_EVENT, onPayNow);
  }, [payNow]);

  const paymentNotifications = useMemo(
    () => notifications.filter(isAgentPaymentNotification),
    [notifications],
  );
  const count = charges == null ? paymentNotifications.length : unpaid.length;
  const total = unpaid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  if (!user || status !== 'authed') return null;
  if (platformBillingDisabled) return null;
  if (isHiddenRoute(pathname)) return null;
  if (needsPasswordChange(user) || needsSystemAccessAgreement(user)) return null;

  const showBanner = !dismissed && count > 0 && total > 0;
  const amountLabel = total > 0 ? ` ${formatCurrency(total)}` : '';

  return (
    <>
      {showBanner ? (
        <div
          role="status"
          className={cn(
            'mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed',
            isV2 ? 'v2-frosted-alert border-amber-500/35' : 'border-amber-500/35 bg-amber-500/10',
          )}
        >
          <div className="flex flex-wrap items-start gap-3">
            <CreditCard
              className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-950 dark:text-amber-100">Payment required</p>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {count === 1
                  ? `Pay the platform fee${amountLabel} so CROSSUB can continue this job.`
                  : `Pay ${count} outstanding platform fees${amountLabel} so CROSSUB can continue these jobs.`}{' '}
                Unpaid fees also appear on the Bill page.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-8"
                disabled={paying}
                onClick={() => void payNow()}
              >
                {paying ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CreditCard className="size-3.5" />
                )}
                Pay now
              </Button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className={cn(
                  'text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-secondary',
                )}
                aria-label="Dismiss payment reminder"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <StripePaymentDialog
        state={paymentDialog}
        open={paymentDialog != null}
        onOpenChange={(open) => {
          if (!open) setPaymentDialog(null);
        }}
        onSuccess={async () => {
          const chargeId = paymentDialog?.chargeId;
          setPaymentDialog(null);
          await finalizeBillingChargePayment(chargeId);
          toast.success('Payment complete');
          await reloadCharges().catch(() => undefined);
        }}
      />
    </>
  );
}
