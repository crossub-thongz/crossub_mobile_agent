'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoggingInScreen } from '@/components/auth/logging-in-screen';
import { useAuth } from '@/components/providers/auth-provider';
import { ROUTES, isPublicRoute } from '@/constants/routes';
import { needsSystemAccessAgreement } from '@/lib/system-access-agreement';

const AGREEMENT_EXEMPT = [ROUTES.SYSTEM_ACCESS_AGREEMENT];

export function SystemAccessAgreementGate({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const onAgreementPage = AGREEMENT_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const mustSign =
    status === 'authed' && !!user && needsSystemAccessAgreement(user) && !onAgreementPage;

  useEffect(() => {
    if (!mustSign || isPublicRoute(pathname)) return;
    router.replace(ROUTES.SYSTEM_ACCESS_AGREEMENT);
  }, [mustSign, pathname, router]);

  if (status === 'loading' && !isPublicRoute(pathname)) return <LoggingInScreen />;
  if (mustSign && !isPublicRoute(pathname)) return <LoggingInScreen />;

  return <>{children}</>;
}
