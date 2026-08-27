'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { isPublicRoute, ROUTES } from '@/constants/routes';
import { isAgentPaymentNotification } from '@/lib/agent-payment-notification';
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

function isPrepaidAwaitingCharge(row: AgentBillingCharge): boolean {
  return (
    row.status === 'awaiting_payment' &&
    String(row.collectionMode).toLowerCase() === 'prepaid'
  );
}

/**
 * Persistent top-of-app reminder for unpaid staff-created platform fees.
 * Closing it is session-only — a refresh brings it back until the fee is paid.
 */
export function AgentPaymentReminderBanner() {
  const pathname = usePathname();
  const { user, status } = useAuth();
  const { notifications } = useAgentData();
  const [charges, setCharges] = useState<AgentBillingCharge[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const onBillPage = pathname === ROUTES.BILL;

  useEffect(() => {
    if (status !== 'authed' || !user) return;
    if (isHiddenRoute(pathname)) return;

    let cancelled = false;
    void listAgentChargeHistory()
      .then((rows) => {
        if (!cancelled) setCharges(rows.filter(isPrepaidAwaitingCharge));
      })
      .catch(() => {
        if (!cancelled) setCharges([]);
      });

    return () => {
      cancelled = true;
    };
  }, [status, user, onBillPage]);

  const paymentNotifications = useMemo(
    () => notifications.filter(isAgentPaymentNotification),
    [notifications],
  );

  const unpaid = charges ?? [];
  const count = charges == null ? paymentNotifications.length : unpaid.length;
  const total = unpaid.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  if (!user || status !== 'authed') return null;
  if (isHiddenRoute(pathname)) return null;
  if (needsPasswordChange(user) || needsSystemAccessAgreement(user)) return null;
  if (dismissed) return null;
  if (count === 0) return null;

  const amountLabel = total > 0 ? ` ${formatCurrency(total)}` : '';

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed"
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
          <Button asChild size="sm" className="h-8">
            <Link href={ROUTES.BILL}>
              <CreditCard className="size-3.5" />
              Pay now
            </Link>
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
