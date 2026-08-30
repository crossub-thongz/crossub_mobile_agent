'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { isPublicRoute, ROUTES } from '@/constants/routes';
import {
  fetchAgentBillingSummary,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { needsPasswordChange, needsSystemAccessAgreement } from '@/lib/system-access-agreement';
import { formatCurrency, formatDate } from '@/lib/utils';

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

function usesMonthlyInvoice(level: string | undefined): boolean {
  return level === 'LEVEL_2_FULL_MANAGEMENT' || level === 'LEVEL_3_LEGACY';
}

function isHiddenRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) return true;
  return HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Shown on every Agent app screen except Invoice itself, once Accounting has sent a bill. */
export function PlatformInvoiceReadyBanner() {
  const pathname = usePathname();
  const { user, status } = useAuth();
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);

  useEffect(() => {
    if (status !== 'authed' || !user) return;
    if (isHiddenRoute(pathname) || pathname === ROUTES.BILL) return;

    let cancelled = false;
    void fetchAgentBillingSummary()
      .then((row) => {
        if (!cancelled) setSummary(row);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [status, user, pathname]);

  if (!user || status !== 'authed') return null;
  if (isHiddenRoute(pathname) || pathname === ROUTES.BILL) return null;
  if (needsPasswordChange(user) || needsSystemAccessAgreement(user)) return null;
  if (!summary || summary.platformBillingDisabled) return null;
  if (!usesMonthlyInvoice(summary.portalServiceLevel)) return null;
  if (!summary.openInvoiceId || !(summary.outstandingInvoiceAmount > 0)) return null;

  const overdue = summary.billingBlocked;
  const dueLabel = summary.nextInvoiceDueDate ? formatDate(summary.nextInvoiceDueDate) : null;

  return (
    <div
      role="status"
      className={
        overdue
          ? 'mb-4 rounded-xl border border-destructive/35 bg-destructive/10 px-5 py-5 text-sm leading-relaxed'
          : 'mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-5 py-5 text-sm leading-relaxed'
      }
    >
      <div className="flex flex-wrap items-start gap-3">
        <FileText
          className={
            overdue
              ? 'mt-0.5 size-4 shrink-0 text-destructive'
              : 'mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400'
          }
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={
              overdue
                ? 'font-medium text-destructive'
                : 'font-medium text-amber-950 dark:text-amber-100'
            }
          >
            {overdue ? 'Your invoice is overdue' : 'Your invoice is ready'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {overdue
              ? `Please pay ${formatCurrency(summary.outstandingInvoiceAmount)} now to restore full access.`
              : `Please pay ${formatCurrency(summary.outstandingInvoiceAmount)}${
                  dueLabel ? ` by ${dueLabel}` : ''
                }.`}
            {summary.openInvoiceNumber ? ` ${summary.openInvoiceNumber}.` : ''}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href={`${ROUTES.BILL}?pay=1`}>
            <CreditCard className="size-3.5" />
            Pay invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}
