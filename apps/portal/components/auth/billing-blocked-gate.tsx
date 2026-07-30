'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import {
  fetchAgentBillingSummary,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';

const BILLING_EXEMPT = [
  ROUTES.LOGIN,
  ROUTES.BILLING_OVERDUE,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
];

export function BillingBlockedGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [checked, setChecked] = useState(false);

  const onExemptPage = BILLING_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (status !== 'authed' || isPublicRoute(pathname) || onExemptPage) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    void fetchAgentBillingSummary()
      .then((row) => {
        if (!cancelled) setSummary(row);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, pathname, onExemptPage]);

  const blocked = summary?.billingBlocked === true;

  useEffect(() => {
    if (!checked || !blocked || onExemptPage || isPublicRoute(pathname)) return;
    router.replace(ROUTES.BILLING_OVERDUE);
  }, [blocked, checked, onExemptPage, pathname, router]);

  if (status === 'loading' && !isPublicRoute(pathname)) return null;
  if (!checked && status === 'authed' && !isPublicRoute(pathname) && !onExemptPage) {
    return null;
  }
  if (blocked && !onExemptPage && !isPublicRoute(pathname)) return null;

  return <>{children}</>;
}
