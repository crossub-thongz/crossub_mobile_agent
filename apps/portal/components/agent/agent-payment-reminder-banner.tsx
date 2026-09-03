'use client';

import { usePathname, useRouter } from 'next/navigation';
import { CreditCard, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Button } from '@/components/ui/button';
import { isPublicRoute, ROUTES } from '@/constants/routes';
import { isAgentPaymentNotification } from '@/lib/agent-payment-notification';
import {
  AGENT_PAY_NOW_EVENT,
  inspectionIdFromAgentHref,
  isOnUnpaidInspectionTaskPath,
  isPrepaidAwaitingCharge,
  unpaidInspectionTaskHref,
  withOpenPaymentQuery,
  type AgentPayNowDetail,
} from '@/lib/billing/agent-pay-now';
import {
  listAgentChargeHistory,
  type AgentBillingCharge,
} from '@/lib/crossub-api/agent-billing-client';
import {
  isLegacyLevel,
  resolvePortalServiceLevel,
} from '@/lib/portal-service-level';
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
 * Pay now opens the unpaid job so payment happens on that task.
 */
export function AgentPaymentReminderBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const isV2 = useIsAgentUiV2();
  const { user, status } = useAuth();
  const { notifications, platformBillingDisabled, inspections, primaryAgency } = useAgentData();
  const [charges, setCharges] = useState<AgentBillingCharge[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
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
  const taskHref = unpaidInspectionTaskHref(unpaid, inspections);

  const openUnpaidTask = useCallback(
    (href?: string) => {
      const fromHref = href?.trim();
      if (fromHref && inspectionIdFromAgentHref(fromHref)) {
        router.push(withOpenPaymentQuery(fromHref));
        return;
      }
      if (taskHref) {
        router.push(taskHref);
        return;
      }
      toast.message('Open the unpaid job from Tasks to pay.');
    },
    [router, taskHref],
  );

  useEffect(() => {
    const onPayNow = (event: Event) => {
      const href = (event as CustomEvent<AgentPayNowDetail>).detail?.href;
      openUnpaidTask(href);
    };
    window.addEventListener(AGENT_PAY_NOW_EVENT, onPayNow);
    return () => window.removeEventListener(AGENT_PAY_NOW_EVENT, onPayNow);
  }, [openUnpaidTask]);

  const paymentNotifications = useMemo(
    () => notifications.filter(isAgentPaymentNotification),
    [notifications],
  );
  const count = charges == null ? paymentNotifications.length : unpaid.length;
  const total = unpaid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  if (!user || status !== 'authed') return null;
  if (platformBillingDisabled) return null;

  // Level 3 with billing on (BILLING_LEVEL_3_DISABLED=false) pays on the task, not here.
  if (
    primaryAgency &&
    isLegacyLevel(resolvePortalServiceLevel(primaryAgency.portalServiceLevel))
  ) {
    return null;
  }

  if (isHiddenRoute(pathname)) return null;
  if (needsPasswordChange(user) || needsSystemAccessAgreement(user)) return null;

  const onUnpaidTask = isOnUnpaidInspectionTaskPath(pathname, unpaid, inspections);
  const showBanner = !dismissed && !onUnpaidTask && count > 0 && total > 0;
  const amountLabel = total > 0 ? ` ${formatCurrency(total)}` : '';

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className={cn(
        'mt-3 mb-6 rounded-xl border px-6 py-5 text-sm leading-relaxed lg:mt-4',
        isV2 ? 'v2-frosted-alert border-amber-500/35' : 'border-amber-500/35 bg-amber-500/10',
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <CreditCard
          className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
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
          <Button type="button" size="sm" className="h-8" onClick={() => openUnpaidTask()}>
            <CreditCard className="size-3.5" />
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
  );
}
