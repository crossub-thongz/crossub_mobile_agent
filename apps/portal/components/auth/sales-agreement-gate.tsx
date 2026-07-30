'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import {
  fetchSalesAgreementAccessStatus,
  type AgentSalesAgreementAccessStatus,
} from '@/lib/crossub-api/agent-client';

const AGREEMENT_EXEMPT = [
  ROUTES.LOGIN,
  ROUTES.AGREEMENTS,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.BILL,
  ROUTES.BILLING_OVERDUE,
];

export function SalesAgreementGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<AgentSalesAgreementAccessStatus | null>(null);
  const [checked, setChecked] = useState(false);

  const onExemptPage = AGREEMENT_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (status !== 'authed' || isPublicRoute(pathname) || onExemptPage) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    void fetchSalesAgreementAccessStatus()
      .then((row) => {
        if (!cancelled) setAccess(row);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, pathname, onExemptPage]);

  const blocked = access?.blocked === true;

  useEffect(() => {
    if (!checked || !blocked || onExemptPage || isPublicRoute(pathname)) return;
    router.replace(ROUTES.AGREEMENTS);
  }, [blocked, checked, onExemptPage, pathname, router]);

  if (status === 'loading' && !isPublicRoute(pathname)) return null;
  if (!checked && status === 'authed' && !isPublicRoute(pathname) && !onExemptPage) {
    return null;
  }
  if (blocked && !onExemptPage && !isPublicRoute(pathname)) return null;

  return <>{children}</>;
}
